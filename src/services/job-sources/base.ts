import "server-only";
import * as jobsDal from "@/dal/jobs.dal";
import { isOlderThanOneMonth } from "@/lib/date-utils";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import type { RawJobPayloadSelect, JobSelect } from "@/dal/jobs.dal";
import type { JobSourceAdapter, NormalizedJob } from "./types";
import {
  buildJobSimhashText,
  computeSimhash,
  DEFAULT_SIMHASH_THRESHOLD,
} from "@/lib/simhash";
import { getCircuitBreaker, CircuitBreaker } from "@/lib/circuit-breaker";

export abstract class BaseJobSourceAdapter<TRaw = unknown>
  implements JobSourceAdapter<TRaw>
{
  abstract readonly id: "greenhouse" | "remoteok" | "lever" | "ashby";
  abstract extractExternalId(raw: TRaw): string;
  abstract normalize(raw: TRaw): NormalizedJob;

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
        raw as unknown as Record<string, unknown>
      );
    } catch (error) {
      return err(
        new AppError(
          "DB_ERROR",
          `Failed to record raw job payload for ${this.id}`,
          error
        )
      );
    }
  }

  /**
   * DB Call 2: Read payload from raw_job_payload, normalize it, and write canonical job.
   */
  async normalizeFromStored(
    rawRecord: RawJobPayloadSelect,
    userId?: string
  ): Promise<Result<JobSelect, AppError>> {
    try {
      const normalized = this.normalize(rawRecord.payload as TRaw);

      // Skip jobs posted longer than a month ago
      if (normalized.postedAt && isOlderThanOneMonth(normalized.postedAt)) {
        return err(
          new AppError(
            "EXPIRED_JOB",
            `Job posting "${normalized.title}" is older than 1 month and was skipped.`
          )
        );
      }

      // Check if user previously marked this job as withdrawn/deleted
      if (userId) {
        const deleted = await jobsDal.isJobDeleted(
          normalized.source,
          normalized.externalId,
          userId
        );
        if (deleted) {
          return err(
            new AppError(
              "DELETED_JOB",
              `Job posting "${normalized.title}" was previously deleted by user.`
            )
          );
        }
      }

      // Compute 64-bit SimHash for cross-source deduplication
      const simhashText = buildJobSimhashText(
        normalized.title,
        normalized.company,
        normalized.description
      );
      const simhashRes = computeSimhash(simhashText);

      // Check for existing near-duplicate job via SimHash
      const existingMatch = await jobsDal.findJobBySimhash(
        simhashRes.signedBigInt,
        DEFAULT_SIMHASH_THRESHOLD
      );

      if (existingMatch.ok && existingMatch.value) {
        const canonicalJob = existingMatch.value;

        // Link jobSourceRef pointing at existing canonical job
        await jobsDal.linkJobSourceRef(
          canonicalJob.id,
          normalized.source as jobsDal.JobSource,
          normalized.externalId,
          normalized.url
        );

        // Back-reference: Record canonical job ID in raw_job_payload
        await jobsDal.updateRawJobPayloadNormalizedJob(
          rawRecord.id,
          canonicalJob.id
        );

        // Ensure user pipeline entry is created if userId is present
        let pipelineEntryId = canonicalJob.id;
        let entryStatus: jobsDal.JobStatus = "saved";
        if (userId) {
          const entry = await jobsDal.upsertUserPipelineEntry(
            userId,
            canonicalJob.id,
            "saved"
          );
          if (entry) {
            pipelineEntryId = entry.id;
            entryStatus = entry.status;
          }
        }

        return ok({
          id: pipelineEntryId,
          userId: userId || "",
          source: canonicalJob.source,
          externalId: canonicalJob.externalId || "",
          title: canonicalJob.title,
          company: canonicalJob.company,
          url: canonicalJob.url || "",
          description: canonicalJob.description,
          postedAt: canonicalJob.postedAt,
          country: normalized.country || null,
          countryCode: normalized.countryCode || null,
          city: normalized.city || canonicalJob.location || null,
          workplaceType: normalized.workplaceType || null,
          remoteRegions: normalized.remoteRegions || null,
          fitScore: null,
          scoreReasoning: null,
          matchedSkills: [],
          missingSkills: [],
          gaps: [],
          coverLetterDraft: null,
          tailoredResume: null,
          tailoredResumeData: null,
          status: entryStatus,
          createdAt: canonicalJob.createdAt,
          updatedAt: canonicalJob.updatedAt,
          simhash: canonicalJob.simhash ? canonicalJob.simhash.toString() : null,
        });
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
        simhash: simhashRes.hashString,
      });

      if (!upsertRes.ok) {
        return upsertRes;
      }

      const canonicalJob = upsertRes.value;

      // Link jobSourceRef for cross-source dedup
      await jobsDal.linkJobSourceRef(
        canonicalJob.id,
        normalized.source as jobsDal.JobSource,
        normalized.externalId,
        normalized.url
      );

      // Back-reference: Record canonical job ID in raw_job_payload
      await jobsDal.updateRawJobPayloadNormalizedJob(
        rawRecord.id,
        canonicalJob.id
      );

      return ok(canonicalJob);
    } catch (error) {
      return err(
        new AppError(
          "DB_ERROR",
          `Failed to normalize and write job for ${this.id}`,
          error
        )
      );
    }
  }

  /**
   * Orchestrate: DB Call 1 (raw payload) followed by DB Call 2 (normalize & save).
   * Strictly kept as two separate DB calls.
   */
  async ingest(
    raw: TRaw,
    userId?: string
  ): Promise<Result<JobSelect, AppError>> {
    const rawRes = await this.saveRaw(raw);
    if (!rawRes.ok) {
      return rawRes;
    }
    return await this.normalizeFromStored(rawRes.value, userId);
  }
}
