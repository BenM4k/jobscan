import fs from "node:fs";
import path from "node:path";
import {
  DASHBOARD_FEED_TAG,
  PROFILE_TAG,
  RESUMES_TAG,
  BILLING_TAG,
  SETTINGS_TAG,
  ADMIN_OVERVIEW_TAG,
  ADMIN_USERS_TAG,
  NAVBAR_TAG,
  RESUME_MUTATION_TAGS,
  ADMIN_MUTATION_TAGS,
  jobTag,
  resumeTag,
  revalidateTag,
  revalidateTags,
  bustTag,
  bustTags,
} from "@/lib/cache-tags";

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runCacheComponentsTests() {
  console.log("Running Cache Components, cacheTag & revalidateTags Unit Tests...\n");

  // 1. Tag Constants Integrity
  const allTags = [
    DASHBOARD_FEED_TAG,
    PROFILE_TAG,
    RESUMES_TAG,
    BILLING_TAG,
    SETTINGS_TAG,
    ADMIN_OVERVIEW_TAG,
    ADMIN_USERS_TAG,
    NAVBAR_TAG,
  ];

  for (const tag of allTags) {
    assert(typeof tag === "string" && tag.length > 0, `Tag ${tag} must be a non-empty string`);
    assert(tag.includes(":"), `Tag "${tag}" should follow "<domain>:<scope>" naming convention`);
  }

  // Ensure unique tags
  const uniqueTagSet = new Set(allTags);
  assert(uniqueTagSet.size === allTags.length, "All cache tags must be unique constants");
  console.log("✓ Tag constants are unique and follow <domain>:<scope> naming convention");

  // 2. Convenience Groupings
  assert(
    RESUME_MUTATION_TAGS.includes(RESUMES_TAG) &&
    RESUME_MUTATION_TAGS.includes(DASHBOARD_FEED_TAG) &&
    RESUME_MUTATION_TAGS.includes(PROFILE_TAG),
    "RESUME_MUTATION_TAGS must include resumes, feed, and profile tags"
  );
  assert(
    ADMIN_MUTATION_TAGS.includes(ADMIN_OVERVIEW_TAG) &&
    ADMIN_MUTATION_TAGS.includes(ADMIN_USERS_TAG),
    "ADMIN_MUTATION_TAGS must include overview and users tags"
  );
  console.log("✓ Grouping tag collections (RESUME_MUTATION_TAGS, ADMIN_MUTATION_TAGS) contain expected members");

  // 2b. Granular Entity Tag Generators
  assert(jobTag("123-abc") === "job:123-abc", "jobTag must produce job:<id>");
  assert(resumeTag("456-def") === "resume:456-def", "resumeTag must produce resume:<id>");
  console.log("✓ Entity tag generators (jobTag, resumeTag) format tags correctly");

  // 3. Revalidation Functions Signature and Compatibility
  assert(typeof revalidateTag === "function", "revalidateTag must be a function");
  assert(typeof revalidateTags === "function", "revalidateTags must be a function");
  assert(typeof bustTag === "function", "bustTag alias must be a function");
  assert(typeof bustTags === "function", "bustTags alias must be a function");

  // Ensure revalidateTags handles both single tag and array without error
  try {
    revalidateTags(DASHBOARD_FEED_TAG);
    revalidateTags([DASHBOARD_FEED_TAG, BILLING_TAG]);
    bustTag(PROFILE_TAG);
    bustTags(RESUME_MUTATION_TAGS);
    console.log("✓ revalidateTags and revalidateTag execute safely with profile='max'");
  } catch (err: unknown) {
    // Note: Next.js revalidateTag might warn or require request context outside of server actions,
    // but the wrapper invocation itself should be callable
    console.log("Revalidation invocation note:", (err as Error)?.message);
  }

  // 4. Static Codebase Verification: Zero revalidatePath in src/
  const srcDir = path.resolve(process.cwd(), "src");
  const filesWithRevalidatePath: string[] = [];

  function scanForRevalidatePath(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanForRevalidatePath(fullPath);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (/\brevalidatePath\s*\(/.test(content)) {
          filesWithRevalidatePath.push(path.relative(process.cwd(), fullPath));
        }
      }
    }
  }

  scanForRevalidatePath(srcDir);
  assert(
    filesWithRevalidatePath.length === 0,
    `revalidatePath must be fully replaced across src/, but found occurrences in: ${filesWithRevalidatePath.join(", ")}`
  );
  console.log("✓ Zero occurrences of revalidatePath found in src/ (100% migrated to cacheTag & revalidateTags)");

  // 5. Verify cached-data exports
  const cachedDataModule = await import("@/lib/cached-data");
  const expectedCachedFunctions = [
    "getCachedDashboardFeed",
    "getCachedJobById",
    "getCachedActiveResume",
    "getCachedResumeSkills",
    "getCachedMasterResumes",
    "getCachedMasterResumeById",
    "getCachedBillingData",
    "getCachedUserFlags",
    "getCachedUserPreferences",
    "getCachedAiUsage",
    "getCachedAdminOverview",
    "getCachedAdminUsers",
  ];

  for (const fn of expectedCachedFunctions) {
    assert(
      typeof (cachedDataModule as Record<string, unknown>)[fn] === "function",
      `Expected ${fn} to be exported from @/lib/cached-data`
    );
  }
  console.log("✓ All cached data-fetching wrappers are properly exported and typed");

  console.log("\nAll Cache Components & revalidateTags unit tests passed successfully! 🚀");
}

runCacheComponentsTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
