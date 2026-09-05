import {
  computeSimhash,
  hammingDistance,
  buildJobSimhashText,
  normalizeTextForSimhash,
  DEFAULT_SIMHASH_THRESHOLD,
} from "@/lib/simhash";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runSimhashUnitTests() {
  console.log("Running unit tests for SimHash util and deduplication...");

  // 1. Text normalization
  const rawHtml = "  Senior   Software Engineer \n at <p>Acme Corp</p>!  ";
  const normalized = normalizeTextForSimhash(rawHtml);
  assert(
    normalized === "senior software engineer at acme corp !",
    `normalization should strip html tags and collapse whitespace: got "${normalized}"`
  );

  // 2. Canonical job simhash text building
  const jobText1 = buildJobSimhashText(
    "Senior Frontend Developer",
    "Stripe",
    "We are looking for a React expert to lead frontend architecture."
  );
  assert(jobText1.includes("senior frontend developer"), "includes title");
  assert(jobText1.includes("stripe"), "includes company");

  // 3. Identical strings produce distance 0
  const hash1 = computeSimhash(jobText1);
  const hash2 = computeSimhash(jobText1);
  assert(hash1.signedBigInt === hash2.signedBigInt, "identical text gives same BigInt");
  assert(hash1.hashString === hash2.hashString, "identical text gives same hashString");
  assert(
    hammingDistance(hash1.signedBigInt, hash2.signedBigInt) === 0,
    "distance between identical texts is 0"
  );

  // 4. Near-duplicate strings produce small Hamming distance (<= DEFAULT_SIMHASH_THRESHOLD)
  // E.g., minor punctuation/formatting change, identical content
  const jobTextNearDuplicate = buildJobSimhashText(
    "Senior Frontend Developer ",
    "Stripe Inc.",
    "We are looking for a React expert to lead frontend architecture!"
  );
  const hashNear = computeSimhash(jobTextNearDuplicate);
  const nearDist = hammingDistance(hash1.signedBigInt, hashNear.signedBigInt);
  console.log(`Near-duplicate Hamming distance: ${nearDist} (threshold: ${DEFAULT_SIMHASH_THRESHOLD})`);
  assert(
    nearDist <= DEFAULT_SIMHASH_THRESHOLD,
    `near-duplicate text should have Hamming distance <= ${DEFAULT_SIMHASH_THRESHOLD}, got ${nearDist}`
  );

  // 5. Completely different job postings produce large Hamming distance
  const jobTextDifferent = buildJobSimhashText(
    "Registered Nurse - ICU",
    "Mayo Clinic",
    "Provide intensive medical care for pediatric and adult critical patients in intensive care units."
  );
  const hashDiff = computeSimhash(jobTextDifferent);
  const diffDist = hammingDistance(hash1.signedBigInt, hashDiff.signedBigInt);
  console.log(`Different job Hamming distance: ${diffDist}`);
  assert(
    diffDist > 10,
    `completely different jobs should have large Hamming distance (> 10), got ${diffDist}`
  );

  // 6. Mathematical properties of hammingDistance
  assert(
    hammingDistance(hash1.signedBigInt, hashDiff.signedBigInt) ===
      hammingDistance(hashDiff.signedBigInt, hash1.signedBigInt),
    "Hamming distance is symmetric"
  );
  assert(
    hammingDistance("0", "0") === 0,
    "Hamming distance of string '0' is 0"
  );
  assert(
    hammingDistance(BigInt(1), BigInt(2)) === 2,
    "BigInt(1) (01b) and BigInt(2) (10b) differ by 2 bits"
  );
  assert(
    hammingDistance(BigInt(0), BigInt(1)) === 1,
    "BigInt(0) and BigInt(1) differ by 1 bit"
  );

  // 7. Deduplication simulation test
  const existingJob = {
    id: "canonical-job-123",
    title: "Senior Fullstack Engineer",
    company: "Acme Labs",
    description: "Build robust SaaS products using Next.js, TypeScript, and Postgres.",
    simhash: computeSimhash(
      buildJobSimhashText(
        "Senior Fullstack Engineer",
        "Acme Labs",
        "Build robust SaaS products using Next.js, TypeScript, and Postgres."
      )
    ).hashString,
  };

  const incomingDuplicate = {
    source: "remoteok",
    externalId: "ext-remote-999",
    url: "https://remoteok.com/job/999",
    title: "Senior Fullstack Engineer",
    company: "Acme Labs",
    description: "Build robust SaaS products using Next.js, TypeScript, and Postgres!",
  };

  const incomingSimhash = computeSimhash(
    buildJobSimhashText(
      incomingDuplicate.title,
      incomingDuplicate.company,
      incomingDuplicate.description
    )
  );

  const dedupDist = hammingDistance(existingJob.simhash, incomingSimhash.signedBigInt);
  console.log(`Dedup simulation distance: ${dedupDist}`);
  assert(
    dedupDist <= DEFAULT_SIMHASH_THRESHOLD,
    "Dedup candidate should be identified as duplicate"
  );

  // Simulate cross-source ref creation rather than creating new job
  const linkedRefs: Array<{ jobId: string; source: string; externalId: string }> = [];
  let canonicalJobsCreated = 0;

  if (dedupDist <= DEFAULT_SIMHASH_THRESHOLD) {
    linkedRefs.push({
      jobId: existingJob.id,
      source: incomingDuplicate.source,
      externalId: incomingDuplicate.externalId,
    });
  } else {
    canonicalJobsCreated++;
  }

  assert(linkedRefs.length === 1, "SimHash correctly linked cross-source ref");
  assert(linkedRefs[0].jobId === existingJob.id, "Ref points to existing canonical job");
  assert(canonicalJobsCreated === 0, "No duplicate canonical job was created");

  console.log("All SimHash unit tests passed successfully! ✓");
}

runSimhashUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
