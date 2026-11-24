import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createMasterResumeSchema } from "@/actions/resume.schema";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
}

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, next));
    } else {
      keys.push(next);
    }
  }
  return keys.sort();
}

async function runSprint3HygieneTests() {
  console.log("Running Sprint 3 architecture & hygiene unit tests...");

  // 1. Legacy table retirement & strict layering
  const profileDalSrc = readRepoFile("src/dal/profile.dal.ts");
  assert(
    !profileDalSrc.includes("schema/legacy") && !profileDalSrc.includes("@/services/db"),
    "profile.dal.ts must not reference schema/legacy or raw db"
  );
  assert(
    profileDalSrc.includes("resumeDal"),
    "profile.dal.ts must delegate to canonical resume.dal"
  );

  for (const file of [
    "src/actions/profile.actions.ts",
    "src/actions/billing.actions.ts",
    "src/app/dashboard/settings/page.tsx",
    "src/components/layout/Navbar.tsx",
  ]) {
    const src = readRepoFile(file);
    assert(!src.includes("@/dal/"), `${file} must route through services, not import @/dal/ directly`);
  }

  const dashboardServiceSrc = readRepoFile("src/services/dashboard.service.ts");
  assert(
    dashboardServiceSrc.trimStart().startsWith('import "server-only";'),
    "dashboard.service.ts must start with import 'server-only'"
  );

  // 2. Resume URL validation rejects javascript: scheme
  const badResume = createMasterResumeSchema.safeParse({
    label: "Test",
    content: "Long enough resume text for validation.",
    fileUrl: "javascript:alert(1)",
  });
  assert(
    !badResume.success &&
      badResume.error.issues.some((issue) => issue.path.includes("fileUrl")),
    "createMasterResumeSchema must reject javascript: URLs"
  );

  const goodResume = createMasterResumeSchema.safeParse({
    label: "Test",
    content: "Long enough resume text for validation.",
    fileUrl: "https://example.com/resume.pdf",
  });
  assert(goodResume.success, "createMasterResumeSchema must allow valid https URLs");

  // 3. Cache Components & instant=false hygiene
  for (const layoutFile of [
    "src/app/dashboard/layout.tsx",
    "src/app/dashboard/admin/layout.tsx",
  ]) {
    const src = readRepoFile(layoutFile);
    assert(
      !src.includes("instant = false"),
      `${layoutFile} must not export instant = false`
    );
  }

  const cachedDataSrc = readRepoFile("src/lib/cached-data.ts");
  assert(
    cachedDataSrc.includes("cacheLife("),
    "src/lib/cached-data.ts must configure cacheLife"
  );
  assert(
    !cachedDataSrc.includes("inngest.send") && !cachedDataSrc.includes("seedBillingDefaults"),
    "src/lib/cached-data.ts must not perform side-effect writes inside 'use cache'"
  );

  for (const boundaryFile of [
    "src/app/dashboard/error.tsx",
    "src/app/dashboard/admin/error.tsx",
    "src/app/dashboard/loading.tsx",
    "src/app/dashboard/billing/loading.tsx",
  ]) {
    assert(
      fs.existsSync(path.join(process.cwd(), boundaryFile)),
      `Expected route boundary ${boundaryFile} to exist`
    );
  }

  // 4. Performance indexes & Redis SSCAN
  const indexChecks: Array<[string, string[]]> = [
    ["src/services/db/schema/job.ts", ["job_posted_at_idx", "job_source_ref_job_id_idx"]],
    ["src/services/db/schema/pipeline.ts", ["pipeline_entry_job_id_idx"]],
    ["src/services/db/schema/scoring.ts", ["score_pipeline_entry_created_idx"]],
    [
      "src/services/db/schema/ops.ts",
      ["ai_call_log_user_created_idx", "feature_flag_assignment_user_idx"],
    ],
  ];
  for (const [schemaPath, idxNames] of indexChecks) {
    const schemaSrc = readRepoFile(schemaPath);
    for (const idx of idxNames) {
      assert(schemaSrc.includes(idx), `${schemaPath} must define index ${idx}`);
    }
  }

  const flagsSrc = readRepoFile("src/services/flags/is-enabled.ts");
  assert(
    !flagsSrc.includes(".smembers(") &&
      flagsSrc.includes(".sscan(") &&
      flagsSrc.includes("scanComplete"),
    "is-enabled.ts must scan all cursors until 0 before deleting tracking set"
  );

  // 5. shadcn/ui & HTML accessibility hygiene & PR review safeguards
  const passkeySrc = readRepoFile("src/components/settings/PasskeyManagementCard.tsx");
  assert(
    !passkeySrc.includes("window.prompt") &&
      passkeySrc.includes("/sign-in?redirect=") &&
      !passkeySrc.includes("callbackUrl="),
    "PasskeyManagementCard must use AddPasskeyDialog and redirect= query param"
  );

  const navbarMobileSrc = readRepoFile("src/components/layout/NavbarMobile.tsx");
  assert(
    navbarMobileSrc.includes('from "@/components/ui/dialog"') &&
      navbarMobileSrc.includes("max-h-[calc(100dvh-2rem)]") &&
      navbarMobileSrc.includes("overflow-y-auto"),
    "NavbarMobile must compose shadcn Dialog with viewport scroll bounds"
  );

  for (const dlg of [
    "src/components/admin/GrantCreditsDialog.tsx",
    "src/components/admin/GiftSubscriptionDialog.tsx",
    "src/components/admin/BanUserDialog.tsx",
  ]) {
    const dlgSrc = readRepoFile(dlg);
    assert(
      dlgSrc.includes("!open && !isPending"),
      `${dlg} must ignore dismissal while isPending is true`
    );
  }

  const pollingHookSrc = readRepoFile("src/hooks/useBillingStatusPolling.ts");
  assert(
    !pollingHookSrc.includes("setInterval") && pollingHookSrc.includes("setTimeout"),
    "useBillingStatusPolling must use sequential setTimeout and elapsed deadline"
  );

  const overrideFormSrc = readRepoFile("src/components/admin/UserFlagOverrideForm.tsx");
  assert(
    overrideFormSrc.includes('from "@/components/ui/popover"'),
    "UserFlagOverrideForm must compose shadcn Popover"
  );

  // 6. Bilingual locale key parity
  const enMessages = JSON.parse(readRepoFile("messages/en.json")) as Record<string, unknown>;
  const frMessages = JSON.parse(readRepoFile("messages/fr.json")) as Record<string, unknown>;
  const enKeys = flattenKeys(enMessages);
  const frKeys = flattenKeys(frMessages);
  assert(
    JSON.stringify(enKeys) === JSON.stringify(frKeys),
    "messages/en.json and messages/fr.json must have identical key sets"
  );

  console.log("All Sprint 3 architecture & hygiene tests passed!");
}

runSprint3HygieneTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
