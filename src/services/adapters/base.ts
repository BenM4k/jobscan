import "server-only";
import * as jobsDal from "@/dal/jobs.dal";
import { isOlderThanOneMonth } from "@/lib/date-utils";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import type { RawJobPayloadSelect, JobSelect } from "@/dal/jobs.dal";
import type {
  JobSourceAdapter,
  NormalizedJobInput,
  SupportedJobSource,
} from "./types";
import { buildJobSimhashText, computeSimhash } from "@/lib/simhash";
import { findNearDuplicateJobId } from "@/services/dedup/find-duplicate";
import { getCircuitBreaker, CircuitBreaker } from "@/lib/circuit-breaker";
import { embedJob } from "@/services/ai/embed";

export abstract class BaseJobSourceAdapter<
  TRaw = unknown,
> implements JobSourceAdapter<TRaw> {
  abstract readonly id: SupportedJobSource;
  abstract extractExternalId(raw: TRaw): string;
  abstract normalize(raw: TRaw): NormalizedJobInput;

  get circuitBreaker(): CircuitBreaker {
    return getCircuitBreaker(this.id);
  }

  /**
   * Protected method implemented by concrete adapters to perform the external fetch.
   */
  protected abstract fetchRawInternal(target?: string): Promise<TRaw[]>;

  /**
   * Public fetchRaw wrapped by circuit breaker with exponential backoff.
   */
  async fetchRaw(target?: string): Promise<TRaw[]> {
    return this.circuitBreaker.execute(() => this.fetchRawInternal(target));
  }

  /**
   * DB Call 1: Write untouched external response into raw_job_payload.
   */
  async saveRaw(raw: TRaw): Promise<Result<RawJobPayloadSelect, AppError>> {
    try {
      const externalId = this.extractExternalId(raw);
      return await jobsDal.insertRawJobPayload(
        this.id,
        externalId,
        raw as unknown as Record<string, unknown>,
      );
    } catch (error) {
      return err(
        new AppError(
          "DB_ERROR",
          `Failed to record raw job payload for ${this.id}`,
          error,
        ),
      );
    }
  }

  /**
   * DB Call 2: Read payload from raw_job_payload, normalize it, and write canonical job.
   */
  async normalizeFromStored(
    rawRecord: RawJobPayloadSelect,
    userId?: string,
  ): Promise<Result<JobSelect, AppError>> {
    try {
      const normalized = this.normalize(rawRecord.payload as TRaw);

      // Skip jobs posted longer than a month ago
      if (normalized.postedAt && isOlderThanOneMonth(normalized.postedAt)) {
        return err(
          new AppError(
            "EXPIRED_JOB",
            `Job posting "${normalized.title}" is older than 1 month and was skipped.`,
          ),
        );
      }

      // Check if user previously marked this job as withdrawn/deleted
      if (userId) {
        const deleted = await jobsDal.isJobDeleted(
          normalized.source,
          normalized.externalId,
          userId,
        );
        if (deleted) {
          return err(
            new AppError(
              "DELETED_JOB",
              `Job posting "${normalized.title}" was previously deleted by user.`,
            ),
          );
        }
      }

      // Compute 64-bit SimHash for cross-source deduplication
      const simhashText = buildJobSimhashText(
        normalized.title,
        normalized.company,
        normalized.description,
      );
      const simhashRes = computeSimhash(simhashText);

      // Check if (source, externalId) already exists (routine re-fetch check)
      const existingCanonicalRes =
        await jobsDal.getCanonicalJobBySourceAndExternalId(
          normalized.source as jobsDal.JobSource,
          normalized.externalId,
        );
      const existingSourceRefRes =
        await jobsDal.getJobSourceRefBySourceAndExternalId(
          normalized.source as jobsDal.JobSource,
          normalized.externalId,
        );

      const isKnownCanonical =
        existingCanonicalRes.ok && existingCanonicalRes.value !== null;
      const isKnownSourceRef =
        existingSourceRefRes.ok && existingSourceRefRes.value !== null;

      if (isKnownCanonical && existingCanonicalRes.value) {
        // Routine re-fetch of existing canonical job: update directly without dedup logic
        const upsertRes = await jobsDal.upsertJob({
          userId: userId || undefined,
          source: normalized.source,
          externalId: normalized.externalId,
          title: normalized.title,
          company: normalized.company,
          url: normalized.url,
          description: normalized.description,
          postedAt: normalized.postedAt,
          country: normalized.country,
          countryCode: normalized.countryCode,
          city: normalized.city,
          workplaceType: normalized.workplaceType,
          remoteRegions: normalized.remoteRegions,
          status: "active",
          simhash: simhashRes.signedBigInt,
        });

        if (!upsertRes.ok) {
          return upsertRes;
        }

        const canonicalJob = upsertRes.value;
        await jobsDal.linkJobSourceRef(
          canonicalJob.id,
          normalized.source as jobsDal.JobSource,
          normalized.externalId,
          normalized.url,
        );
        await jobsDal.updateRawJobPayloadNormalizedJob(
          rawRecord.id,
          canonicalJob.id,
        );

        return ok(canonicalJob);
      }

      if (isKnownSourceRef && existingSourceRefRes.value) {
        // Routine re-fetch of existing secondary source ref: update ref directly
        const canonicalJobId = existingSourceRefRes.value.jobId;
        await jobsDal.linkJobSourceRef(
          canonicalJobId,
          normalized.source as jobsDal.JobSource,
          normalized.externalId,
          normalized.url,
        );
        await jobsDal.updateRawJobPayloadNormalizedJob(
          rawRecord.id,
          canonicalJobId,
        );
        return jobsDal.getJobById(canonicalJobId, userId);
      }

      // Confirmed genuinely NEW (source, externalId) pair: check near-duplicates (last 30 days, max distance 4)
      const nearDupRes = await findNearDuplicateJobId(simhashRes.signedBigInt);

      if (nearDupRes.ok && nearDupRes.value) {
        const canonicalJobId = nearDupRes.value;

        // Link jobSourceRef pointing at existing canonical job
        const linkRes = await jobsDal.linkJobSourceRef(
          canonicalJobId,
          normalized.source as jobsDal.JobSource,
          normalized.externalId,
          normalized.url,
        );
        if (!linkRes.ok) {
          return err(linkRes.error);
        }

        // Back-reference: Record canonical job ID in raw_job_payload
        const updatePayloadRes = await jobsDal.updateRawJobPayloadNormalizedJob(
          rawRecord.id,
          canonicalJobId,
        );
        if (!updatePayloadRes.ok) {
          return err(updatePayloadRes.error);
        }

        // Ensure user pipeline entry is created if userId is present
        if (userId) {
          await jobsDal.upsertUserPipelineEntry(
            userId,
            canonicalJobId,
            "saved",
          );
        }

        return jobsDal.getJobById(canonicalJobId, userId);
      }

      // Upsert canonical job and user pipeline entry
      const upsertRes = await jobsDal.upsertJob({
        userId: userId || undefined,
        source: normalized.source,
        externalId: normalized.externalId,
        title: normalized.title,
        company: normalized.company,
        url: normalized.url,
        description: normalized.description,
        postedAt: normalized.postedAt,
        country: normalized.country,
        countryCode: normalized.countryCode,
        city: normalized.city,
        workplaceType: normalized.workplaceType,
        remoteRegions: normalized.remoteRegions,
        status: "active",
        simhash: simhashRes.signedBigInt,
      });

      if (!upsertRes.ok) {
        return upsertRes;
      }

      const canonicalJob = upsertRes.value;

      // Link jobSourceRef for cross-source dedup
      const linkRes = await jobsDal.linkJobSourceRef(
        canonicalJob.id,
        normalized.source as jobsDal.JobSource,
        normalized.externalId,
        normalized.url,
      );
      if (!linkRes.ok) {
        return err(linkRes.error);
      }

      // Back-reference: Record canonical job ID in raw_job_payload
      const updatePayloadRes = await jobsDal.updateRawJobPayloadNormalizedJob(
        rawRecord.id,
        canonicalJob.id,
      );
      if (!updatePayloadRes.ok) {
        return err(updatePayloadRes.error);
      }

      // Generate and store embedding right after job normalization (DB call 2)
      embedJob(canonicalJob.id, {
        title: canonicalJob.title,
        company: canonicalJob.company,
        description: canonicalJob.description || "",
      }).catch((e) =>
        console.warn(
          `[Job Normalization] Embedding generation failed for job ${canonicalJob.id}:`,
          e,
        ),
      );

      return ok(canonicalJob);
    } catch (error) {
      return err(
        new AppError(
          "DB_ERROR",
          `Failed to normalize and write job for ${this.id}`,
          error,
        ),
      );
    }
  }

  /**
   * Orchestrate: DB Call 1 (raw payload) followed by DB Call 2 (normalize & save).
   * Strictly kept as two separate DB calls.
   */
  async ingest(
    raw: TRaw,
    userId?: string,
  ): Promise<Result<JobSelect, AppError>> {
    const rawRes = await this.saveRaw(raw);
    if (!rawRes.ok) {
      return rawRes;
    }
    return await this.normalizeFromStored(rawRes.value, userId);
  }
}
