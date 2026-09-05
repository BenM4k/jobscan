import "dotenv/config";
import { db } from "@/services/db";
import { job, jobSourceRef } from "@/services/db/schema";
import { upsertCanonicalJobWithSimhashDedup } from "@/dal/jobs/mutations";
import { computeSimhash, buildJobSimhashText, DEFAULT_SIMHASH_THRESHOLD } from "@/lib/simhash";
import { eq } from "drizzle-orm";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runConcurrentDedupTest() {
  console.log("Starting concurrent cross-source ingestion integration test...");

  const baseTitle = "Principal Systems Architect";
  const company = `Acme-${Date.now()}`;
  const description = "Design mission-critical distributed systems using Rust, Go, and PostgreSQL at massive scale.";

  // Generate SimHash for near-duplicate jobs from different sources
  const textA = buildJobSimhashText(baseTitle, company, description);
  const simhashA = computeSimhash(textA);

  const textB = buildJobSimhashText(baseTitle + " ", company + " Inc.", description + "!");
  const simhashB = computeSimhash(textB);

  const extIdA = `ext-gh-${crypto.randomUUID()}`;
  const extIdB = `ext-lev-${crypto.randomUUID()}`;

  let createdCanonicalId: string | null = null;
  let secondCanonicalId: string | null = null;

  try {
    console.log("Simulating concurrent ingestion from two different ATS sources...");
    const [resA, resB] = await Promise.all([
      upsertCanonicalJobWithSimhashDedup(
        {
          source: "greenhouse",
          externalId: extIdA,
          title: baseTitle,
          company: company,
          url: "https://greenhouse.io/job/1",
          description,
          status: "active",
          simhash: simhashA.hashString,
        },
        simhashA.signedBigInt,
        DEFAULT_SIMHASH_THRESHOLD
      ),
      upsertCanonicalJobWithSimhashDedup(
        {
          source: "lever",
          externalId: extIdB,
          title: baseTitle + " ",
          company: company + " Inc.",
          url: "https://lever.co/job/2",
          description: description + "!",
          status: "active",
          simhash: simhashB.hashString,
        },
        simhashB.signedBigInt,
        DEFAULT_SIMHASH_THRESHOLD
      ),
    ]);

    if (resA.ok && resA.value.canonicalJob?.id) {
      createdCanonicalId = resA.value.canonicalJob.id;
    }
    if (resB.ok && resB.value.canonicalJob?.id) {
      secondCanonicalId = resB.value.canonicalJob.id;
    }

    assert(resA.ok, "resA should succeed");
    assert(resB.ok, "resB should succeed");
    if (!resA.ok || !resB.ok) return;

    const valA = resA.value;
    const valB = resB.value;

    const isDuplicateFlags = [valA.isDuplicate, valB.isDuplicate];
    const newCount = isDuplicateFlags.filter((d) => d === false).length;
    const dupCount = isDuplicateFlags.filter((d) => d === true).length;

    assert(newCount === 1, `Expected exactly 1 new canonical job, got ${newCount}`);
    assert(dupCount === 1, `Expected exactly 1 detected duplicate, got ${dupCount}`);
    assert(valA.canonicalJob.id === valB.canonicalJob.id, "Both results point to the same canonical job ID");

    // Verify DB count
    const rows = await db.select().from(job).where(eq(job.id, createdCanonicalId!));
    assert(rows.length === 1, `Expected exactly 1 job in DB, found ${rows.length}`);

    console.log("✓ Concurrent cross-source ingestion test passed! Exactly one canonical job created.");
  } finally {
    const idsToClean = new Set([createdCanonicalId, secondCanonicalId].filter(Boolean) as string[]);
    for (const cid of idsToClean) {
      await db.delete(jobSourceRef).where(eq(jobSourceRef.jobId, cid));
      await db.delete(job).where(eq(job.id, cid));
    }
  }
}

runConcurrentDedupTest()
  .then(() => {
    console.log("All integration tests passed! 🚀");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
