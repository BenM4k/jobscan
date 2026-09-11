import "server-only";
import * as jobsDal from "@/dal/jobs.dal";
import { isOlderThanOneMonth } from "@/lib/date-utils";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { buildJobSimhashText, computeSimhash } from "@/lib/simhash";
import { findNearDuplicateJobId } from "@/services/dedup/find-duplicate";
import { embedJob } from "@/services/ai/embed";
import { canAttempt, recordSuccess, recordFailure } from "@/services/reliability/circuit-breaker";
import type {
  NormalizedJobInput,
  RawJobItem,
  FunctionalJobAdapter,
  IngestResult,
} from "./types";

export type { IngestResult } from "./types";

import * as ashby from "./ashby.adapter";
import * as greenhouse from "./greenhouse.adapter";
import * as remoteok from "./remoteok.adapter";
import * as lever from "./lever.adapter";
import * as congojob from "./congojob.adapter";
import * as emploicd from "./emploicd.adapter";
import * as fecrdc from "./fecrdc.adapter";
import * as unjobs from "./unjobs.adapter";

export const FUNCTIONAL_ADAPTERS: Record<string, FunctionalJobAdapter> = {
  ashby: { id: "ashby", fetchRaw: ashby.fetchRaw, normalize: ashby.normalize },
  greenhouse: {
    id: "greenhouse",
    fetchRaw: greenhouse.fetchRaw,
    normalize: greenhouse.normalize,
  },
  remoteok: {
    id: "remoteok",
    fetchRaw: remoteok.fetchRaw,
    normalize: remoteok.normalize,
  },
  lever: { id: "lever", fetchRaw: lever.fetchRaw, normalize: lever.normalize },
  congojob: {
    id: "congojob",
    fetchRaw: congojob.fetchRaw,
    normalize: congojob.normalize,
  },
  emploi_cd: {
    id: "emploi_cd",
    fetchRaw: emploicd.fetchRaw,
    normalize: emploicd.normalize,
  },
  "emploi-cd": {
    id: "emploi_cd",
    fetchRaw: emploicd.fetchRaw,
    normalize: emploicd.normalize,
  },
  fecrdc: {
    id: "fecrdc",
    fetchRaw: fecrdc.fetchRaw,
    normalize: fecrdc.normalize,
  },
  unjobs: {
    id: "unjobs",
    fetchRaw: unjobs.fetchRaw,
    normalize: unjobs.normalize,
  },
};

/**
 * Static source-to-language map:
 * ashby, greenhouse, remoteok, lever, unjobs, manual, reliefweb -> en
 * congojob, emploi_cd, fecrdc -> fr
 */
export const SOURCE_LANGUAGE: Record<string, "en" | "fr"> = {
  ashby: "en",
  greenhouse: "en",
  remoteok: "en",
  lever: "en",
  unjobs: "en",
  manual: "en",
  reliefweb: "en",
  congojob: "fr",
  emploi_cd: "fr",
  "emploi-cd": "fr",
  emploicd: "fr",
  fecrdc: "fr",
};

export interface IngestOptions {
  target?: string;
  keyword?: string;
  category?: string;
  userId?: string;
}

export async function ingestFromSource(
  source: string,
  options?: IngestOptions,
): Promise<Result<IngestResult, AppError>> {
  const normalizedSourceKey = source.toLowerCase().replace(/-/g, "_");
  const adapter =
    FUNCTIONAL_ADAPTERS[normalizedSourceKey] || FUNCTIONAL_ADAPTERS[source];

  if (!adapter) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        `Unknown or unsupported job source: ${source}`,
      ),
    );
  }

  const allowed = await canAttempt(adapter.id);
  if (!allowed) {
    return ok({
      source: adapter.id,
      fetched: 0,
      upserted: 0,
      failed: 0,
      skipped: true,
      reason: "circuit_open",
      message: `Circuit breaker is OPEN for source "${adapter.id}". Fetch was skipped.`,
    });
  }

  let rawItems: RawJobItem[] = [];

  try {
    rawItems = await adapter.fetchRaw({
      target: options?.target,
      keyword: options?.keyword || options?.target,
      category: options?.category || options?.target,
    });
    await recordSuccess(adapter.id);
  } catch (fetchError) {
    await recordFailure(adapter.id);
    return ok({
      source: adapter.id,
      fetched: 0,
      upserted: 0,
      failed: 0,
      skipped: true,
      reason: "fetch_failed",
      message:
        fetchError instanceof Error
          ? fetchError.message
          : `Failed to fetch raw jobs from ${source}`,
    });
  }

  let upsertedCount = 0;
  let failedCount = 0;

  for (const item of rawItems) {
    try {
      if (!item.externalId) {
        failedCount++;
        continue;
      }

      // Step 1: Upsert untouched raw payload first into raw_job_payload
      const rawPayload = (
        item.payload && typeof item.payload === "object"
          ? item.payload
          : { raw: item.payload }
      ) as Record<string, unknown>;

      const rawInsertRes = await jobsDal.insertRawJobPayload(
        adapter.id as jobsDal.JobSource,
        item.externalId,
        rawPayload,
      );

      if (!rawInsertRes.ok) {
        console.error(
          `[Ingest ${adapter.id}] DB Call 1 failed for externalId=${item.externalId}:`,
          rawInsertRes.error,
        );
        failedCount++;
        continue;
      }

      const storedRaw = rawInsertRes.value;

      // Step 2: Call normalize() as a pure function
      let normalized: NormalizedJobInput;
      try {
        normalized = adapter.normalize(storedRaw.payload);
      } catch (normErr: unknown) {
        console.error(`[Ingest ${adapter.id}] Normalization error:`, {
          source: adapter.id,
          externalId: item.externalId,
          error: normErr instanceof Error ? normErr.message : String(normErr),
        });
        failedCount++;
        continue;
      }

      // Skip expired jobs (> 1 month old)
      if (normalized.postedAt && isOlderThanOneMonth(normalized.postedAt)) {
        continue;
      }

      // Skip previously deleted jobs by user
      if (options?.userId) {
        const deleted = await jobsDal.isJobDeleted(
          normalized.source as jobsDal.JobSource,
          normalized.externalId,
          options.userId,
        );
        if (deleted) {
          continue;
        }
      }

      // Step 3: Compute SimHash & Deduplicate / Upsert canonical job
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

      let canonicalJobId: string;

      if (isKnownCanonical) {
        const existingJob = existingCanonicalRes.value;
        const upsertRes = await jobsDal.upsertJob({
          userId: options?.userId,
          source: normalized.source as jobsDal.JobSource,
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
          salaryMin: normalized.salaryMin,
          salaryMax: normalized.salaryMax,
          salaryCurrency: normalized.salaryCurrency,
          salaryPeriod: normalized.salaryPeriod,
          salaryNormalizedYearlyUsd: normalized.salaryNormalizedYearlyUsd,
          rawSalaryText: normalized.rawSalaryText,
          status: "active",
          language: SOURCE_LANGUAGE[adapter.id] || "en",
          simhash: simhashRes.signedBigInt,
        });

        if (!upsertRes.ok) {
          console.error(
            `[Ingest ${adapter.id}] Failed to re-fetch canonical job for ${item.externalId}:`,
            upsertRes.error,
          );
          failedCount++;
          continue;
        }

        canonicalJobId = upsertRes.value.id;

        // Ensure self-referencing job_source_ref exists
        await jobsDal.linkJobSourceRef(
          canonicalJobId,
          normalized.source as jobsDal.JobSource,
          normalized.externalId,
          normalized.url,
        );

        // Refresh vector embedding when description changes on re-fetch
        if (existingJob && existingJob.description !== normalized.description) {
          embedJob(canonicalJobId, {
            title: normalized.title,
            company: normalized.company,
            description: normalized.description,
          }).catch((err) => {
            console.warn(
              `[Ingest ${adapter.id}] Background embedding refresh failed for job ${canonicalJobId}:`,
              err,
            );
          });
        }
      } else if (isKnownSourceRef && existingSourceRefRes.value) {
        // Routine re-fetch of existing secondary source ref: update ref directly
        canonicalJobId = existingSourceRefRes.value.jobId;
        await jobsDal.linkJobSourceRef(
          canonicalJobId,
          normalized.source as jobsDal.JobSource,
          normalized.externalId,
          normalized.url,
        );
      } else {
        // Confirmed genuinely NEW (source, externalId) pair: run near-duplicate dedup check (last 30 days, max distance 4)
        const nearDupRes = await findNearDuplicateJobId(
          simhashRes.signedBigInt,
        );

        if (nearDupRes.ok && nearDupRes.value) {
          // Near-duplicate found pointing to existing canonical job: link ref without creating duplicate job
          canonicalJobId = nearDupRes.value;
          await jobsDal.linkJobSourceRef(
            canonicalJobId,
            normalized.source as jobsDal.JobSource,
            normalized.externalId,
            normalized.url,
          );
        } else {
          // Genuinely unique new job: upsert new canonical job row
          const upsertRes = await jobsDal.upsertJob({
            userId: options?.userId,
            source: normalized.source as jobsDal.JobSource,
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
            salaryMin: normalized.salaryMin,
            salaryMax: normalized.salaryMax,
            salaryCurrency: normalized.salaryCurrency,
            salaryPeriod: normalized.salaryPeriod,
            salaryNormalizedYearlyUsd: normalized.salaryNormalizedYearlyUsd,
            rawSalaryText: normalized.rawSalaryText,
            status: "active",
            language: SOURCE_LANGUAGE[adapter.id] || "en",
            simhash: simhashRes.signedBigInt,
          });

          if (!upsertRes.ok) {
            console.error(
              `[Ingest ${adapter.id}] Failed to upsert canonical job for ${item.externalId}:`,
              upsertRes.error,
            );
            failedCount++;
            continue;
          }

          canonicalJobId = upsertRes.value.id;

          // Link job_source_ref for this canonical job
          await jobsDal.linkJobSourceRef(
            canonicalJobId,
            normalized.source as jobsDal.JobSource,
            normalized.externalId,
            normalized.url,
          );

          // Fire-and-forget vector embedding generation
          embedJob(canonicalJobId, {
            title: normalized.title,
            company: normalized.company,
            description: normalized.description || "",
          }).catch((e) =>
            console.warn(
              `[Ingest ${adapter.id}] Embedding generation failed for job ${canonicalJobId}:`,
              e,
            ),
          );
        }
      }

      // Step 4: Set normalized_job_id on raw_job_payload row
      await jobsDal.updateRawJobPayloadNormalizedJob(
        storedRaw.id,
        canonicalJobId,
      );

      // Attach user pipeline entry if userId provided
      if (options?.userId) {
        await jobsDal.upsertUserPipelineEntry(
          options.userId,
          canonicalJobId,
          "saved",
        );
      }

      upsertedCount++;
    } catch (itemErr) {
      console.error(
        `[Ingest ${adapter.id}] Unexpected error processing item ${item.externalId}:`,
        {
          source: adapter.id,
          externalId: item.externalId,
          error: itemErr instanceof Error ? itemErr.message : String(itemErr),
        },
      );
      failedCount++;
    }
  }

  return ok({
    source: adapter.id,
    fetched: rawItems.length,
    upserted: upsertedCount,
    failed: failedCount,
  });
}
