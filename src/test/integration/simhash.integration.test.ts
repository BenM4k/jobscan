import "dotenv/config";
import {
  upsertCanonicalJobWithSimhashDedup,
  deleteCanonicalJobAndRefs,
} from "@/dal/jobs/mutations";
import { getCanonicalJobRowById } from "@/dal/jobs/queries";
import { computeSimhash, buildJobSimhashText, DEFAULT_SIMHASH_THRESHOLD } from "@/lib/simhash";

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

  let createdCanonicalId: string | undefined;
  let secondCanonicalId: string | undefined;

  try {
    console.log("Simulating concurrent ingestion from two different ATS sources...");
    // Fire concurrent insertions with overlapping SimHash
    const [resA, resB] = await Promise.all([
      upsertCanonicalJobWithSimhashDedup(
        {
          source: "ashby",
          externalId: `ext-${Date.now()}-A`,
          title: baseTitle,
          company,
          url: "https://example.com/job/a",
          description,
          status: "active",
        },
        simhashA.signedBigInt,
        DEFAULT_SIMHASH_THRESHOLD
      ),
      upsertCanonicalJobWithSimhashDedup(
        {
          source: "greenhouse",
          externalId: `ext-${Date.now()}-B`,
          title: baseTitle + " ",
          company: company + " Inc.",
          url: "https://example.com/job/b",
          description: description + "!",
          status: "active",
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

    // Verify DB record via DAL
    const jobRes = await getCanonicalJobRowById(createdCanonicalId!);
    assert(jobRes.ok && jobRes.value !== null, "Expected exactly 1 canonical job in DB via DAL helper");

    console.log("✓ Concurrent cross-source ingestion test passed! Exactly one canonical job created.");
  } finally {
    const idsToClean = new Set([createdCanonicalId, secondCanonicalId].filter(Boolean) as string[]);
    for (const cid of idsToClean) {
      await deleteCanonicalJobAndRefs(cid);
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
