import "dotenv/config";
import { db } from "../src/services/db";
import {
  job as newJob,
  masterResume,
  skill,
  resumeSkill,
  pipelineEntry,
  score,
  tailoredResume,
  tailoredCoverLetter,
  pipelineStatusEnum,
} from "../src/services/db/schema";
import { profile, jobs as oldJobs } from "../src/services/db/schema/legacy";
import { sql } from "drizzle-orm";

type PipelineStatus = (typeof pipelineStatusEnum.enumValues)[number];

function mapOldStatusToPipelineStatus(oldStatus: string): PipelineStatus {
  switch (oldStatus) {
    case "applied":
      return "applied";
    case "interviewing":
      return "interviewing";
    case "offer":
      return "offer";
    case "rejected":
      return "rejected";
    case "saved":
    case "new":
    case "scored":
    case "tailored":
    default:
      return "saved";
  }
}

export async function runDataMigration() {
  console.log("🚀 Starting database data backfill (ETL)...");

  // 1. Migrate profiles to master_resume and skills
  console.log("📄 Migrating profile -> master_resume & skills...");
  const profiles = await db.select().from(profile);
  for (const prof of profiles) {
    if (!prof.userId || !prof.resumeText) continue;

    // Upsert master resume
    const [resume] = await db
      .insert(masterResume)
      .values({
        userId: prof.userId,
        label: "Default",
        content: prof.resumeText,
        isActive: true,
        version: 1,
      })
      .onConflictDoNothing()
      .returning();

    const resumeId = resume?.id;

    // Migrate skills
    const skillsList = Array.isArray(prof.skills) ? prof.skills : [];
    for (const skillName of skillsList) {
      if (!skillName || typeof skillName !== "string") continue;
      const cleanName = skillName.trim();
      if (!cleanName) continue;

      // Upsert skill
      const [insertedSkill] = await db
        .insert(skill)
        .values({ name: cleanName })
        .onConflictDoUpdate({
          target: skill.name,
          set: { name: cleanName },
        })
        .returning();

      if (resumeId && insertedSkill?.id) {
        await db
          .insert(resumeSkill)
          .values({
            resumeId,
            skillId: insertedSkill.id,
          })
          .onConflictDoNothing();
      }
    }
  }
  console.log(`✅ Migrated ${profiles.length} profiles.`);

  // 2. Migrate old jobs -> canonical job catalog + pipeline_entry + score + tailored documents
  console.log("💼 Migrating jobs -> job catalog, pipeline entries, and score/tailored records...");
  const existingJobs = await db.select().from(oldJobs);
  let migratedJobs = 0;
  let createdPipelineEntries = 0;
  let createdScores = 0;

  for (const oj of existingJobs) {
    // 2a. Insert or retrieve canonical job
    const locationParts = [oj.city, oj.country].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(", ") : null;

    // Check if canonical job already exists
    let [canonicalJob] = await db
      .select()
      .from(newJob)
      .where(
        sql`${newJob.source} = ${oj.source} AND ${newJob.externalId} = ${oj.externalId}`
      )
      .limit(1);

    if (!canonicalJob) {
      const [inserted] = await db
        .insert(newJob)
        .values({
          source: oj.source as (typeof newJob.$inferInsert)["source"],
          externalId: oj.externalId,
          title: oj.title,
          company: oj.company,
          location,
          description: oj.description || "",
          url: oj.url,
          postedAt: oj.postedAt,
          status: "active",
          addedByUserId: oj.source === "manual" ? oj.userId : null,
        })
        .onConflictDoNothing()
        .returning();

      canonicalJob = inserted;
      if (inserted) migratedJobs++;
    }

    if (!canonicalJob) {
      const [found] = await db
        .select()
        .from(newJob)
        .where(
          sql`${newJob.source} = ${oj.source} AND ${newJob.externalId} = ${oj.externalId}`
        )
        .limit(1);
      canonicalJob = found;
    }

    if (!canonicalJob) continue;

    // 2b. Insert pipeline_entry for user
    const pStatus = mapOldStatusToPipelineStatus(oj.status);
    const [pEntry] = await db
      .insert(pipelineEntry)
      .values({
        userId: oj.userId,
        jobId: canonicalJob.id,
        status: pStatus,
      })
      .onConflictDoUpdate({
        target: [pipelineEntry.userId, pipelineEntry.jobId],
        set: { status: pStatus },
      })
      .returning();

    if (pEntry) {
      createdPipelineEntries++;

      // 2c. Migrate score if present
      if (oj.fitScore !== null && oj.fitScore !== undefined) {
        await db
          .insert(score)
          .values({
            pipelineEntryId: pEntry.id,
            resumeVersion: 1,
            modelUsed: "gemini",
            finalScore: oj.fitScore.toString(),
            matchedSkills: oj.matchedSkills ?? [],
            missingSkills: oj.missingSkills ?? [],
            explanation: oj.scoreReasoning ?? "",
          })
          .onConflictDoNothing();
        createdScores++;
      }

      // 2d. Migrate tailored resume if present
      if (oj.tailoredResume) {
        await db
          .insert(tailoredResume)
          .values({
            pipelineEntryId: pEntry.id,
            content: oj.tailoredResume,
          })
          .onConflictDoNothing();
      }

      // 2e. Migrate cover letter if present
      if (oj.coverLetterDraft) {
        await db
          .insert(tailoredCoverLetter)
          .values({
            pipelineEntryId: pEntry.id,
            content: oj.coverLetterDraft,
          })
          .onConflictDoNothing();
      }
    }
  }

  console.log(`✅ Data migration complete!`);
  console.log(`   - Canonical jobs inserted: ${migratedJobs}`);
  console.log(`   - Pipeline entries created: ${createdPipelineEntries}`);
  console.log(`   - Score snapshots created: ${createdScores}`);
}

// Allow direct CLI invocation
if (require.main === module || process.argv[1]?.endsWith("migrate-data.ts")) {
  runDataMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Migration failed:", err);
      process.exit(1);
    });
}
