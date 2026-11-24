import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  createDigestUnsubscribeToken,
  verifyDigestUnsubscribeToken,
} from "@/lib/digest-unsubscribe";
import { buildDigestHtml } from "@/services/digest.service";
import { getJobSourceAdapter } from "@/services/adapters/factory";
import { ALL_JOB_SOURCES } from "@/inngest/functions/job-fetch";
import { parseAtsCompanyList } from "@/services/crawler/config";
import { adminAuditLog, appSetting, creditLedgerActionEnum } from "@/services/db/schema";
import {
  DEFAULT_AI_PROVIDER,
  SUPPORTED_AI_PROVIDERS,
} from "@/services/ai/provider-config";

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

async function runSprint4Tests() {
  console.log("Running Sprint 4 product polish & feature tests...");

  const origSecret = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = "sprint4-test-secret-minimum-32-chars!!";

  try {
    // 1. Signed digest unsubscribe token lifecycle
    const token = createDigestUnsubscribeToken("user-123", 3600);
    const okVerify = verifyDigestUnsubscribeToken(token);
    assert(
      okVerify.valid && okVerify.userId === "user-123",
      "Valid signed unsubscribe token must verify and yield userId"
    );

    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    assert(
      !verifyDigestUnsubscribeToken(tampered).valid,
      "Tampered unsubscribe token must fail verification"
    );

    const expiredToken = createDigestUnsubscribeToken("user-123", -10);
    assert(
      !verifyDigestUnsubscribeToken(expiredToken).valid,
      "Expired unsubscribe token must fail verification"
    );

    // 2. Digest HTML includes escaped match badge and unsubscribe footer
    const html = buildDigestHtml(
      "Bob <script>",
      [
        {
          id: "job-99",
          title: "Platform Engineer",
          company: "Acme Co",
          location: "Kinshasa",
          url: "https://example.com/jobs/99",
          source: "reliefweb",
          createdAt: new Date(),
          matchPercent: 87,
        },
      ],
      "https://jobpilot.ai",
      { unsubscribeUrl: "https://jobpilot.ai/api/digest/unsubscribe?token=abc" }
    );
    assert(html.includes("87% match"), "Personalized digest HTML must include matchPercent badge");
    assert(
      html.includes("https://jobpilot.ai/api/digest/unsubscribe?token=abc"),
      "Digest HTML must include unsubscribe link"
    );
    assert(!html.includes("<script>"), "User-supplied HTML must remain escaped");
  } finally {
    if (origSecret === undefined) {
      delete process.env.BETTER_AUTH_SECRET;
    } else {
      process.env.BETTER_AUTH_SECRET = origSecret;
    }
  }

  // 3. Ingestion unification: reliefweb registered & ATS config parser works
  const reliefAdapter = getJobSourceAdapter("reliefweb");
  assert(reliefAdapter.id === "reliefweb", "getJobSourceAdapter('reliefweb') must resolve");
  assert(ALL_JOB_SOURCES.includes("reliefweb"), "ALL_JOB_SOURCES must include reliefweb");

  const parsedBoards = parseAtsCompanyList("acme:Acme Corp, beta");
  assert(
    parsedBoards.length === 2 &&
      parsedBoards[0].boardToken === "acme" &&
      parsedBoards[0].companyName === "Acme Corp" &&
      parsedBoards[1].boardToken === "beta" &&
      parsedBoards[1].companyName === "beta",
    "parseAtsCompanyList must parse token:Company Name and fallback plain tokens"
  );

  const jobActionsSrc = readRepoFile("src/actions/job.actions.ts");
  assert(
    !jobActionsSrc.includes("runDrcCrawler") && jobActionsSrc.includes('"job.fetch.requested"'),
    "triggerDrcCrawlAction must enqueue background Inngest jobs instead of synchronous scraping"
  );

  // 4. Schema & Action Layering (Track 1, Track 2, Track 4)
  assert(Boolean(adminAuditLog), "adminAuditLog schema table must be exported");
  assert(
    creditLedgerActionEnum.enumValues.includes("admin_grant"),
    "creditLedgerActionEnum must include admin_grant"
  );

  const interviewActionSrc = readRepoFile("src/actions/interview.actions.ts");
  assert(
    !interviewActionSrc.includes("@/dal/"),
    "interview.actions.ts must route through interview.service.ts without importing DAL directly"
  );

  // 5. Bilingual key parity across messages/en.json & messages/fr.json
  const enMessages = JSON.parse(readRepoFile("messages/en.json")) as Record<string, unknown>;
  const frMessages = JSON.parse(readRepoFile("messages/fr.json")) as Record<string, unknown>;
  assert(
    JSON.stringify(flattenKeys(enMessages)) === JSON.stringify(flattenKeys(frMessages)),
    "messages/en.json and messages/fr.json must maintain identical keys"
  );

  // 6. Admin-only AI provider configuration & zero vendor leakage in user UI
  assert(Boolean(appSetting), "appSetting schema table must be exported");
  assert(DEFAULT_AI_PROVIDER === "gemini", "Default global AI provider must be gemini");
  assert(
    SUPPORTED_AI_PROVIDERS.includes("gemini"),
    "SUPPORTED_AI_PROVIDERS must include gemini"
  );
  assert(
    !fs.existsSync(path.join(process.cwd(), "src/components/profile/ProfileAiEngineSelect.tsx")),
    "ProfileAiEngineSelect.tsx must be removed so regular users cannot select AI providers"
  );

  const vendorRegex = /\b(gemini|claude|openai|anthropic|gpt-4o?)\b/i;
  for (const userSurfacePath of [
    "messages/en.json",
    "messages/fr.json",
    "src/app/page.tsx",
    "src/app/privacy/page.tsx",
    "src/components/ProfileForm.tsx",
    "src/components/profile/ProfileSidebar.tsx",
    "src/components/profile/ProfileViewMode.tsx",
    "src/components/profile/MasterResumeUpload.tsx",
  ]) {
    const content = readRepoFile(userSurfacePath);
    assert(
      !vendorRegex.test(content),
      `User-facing file ${userSurfacePath} must not expose AI provider or model names`
    );
  }

  console.log("All Sprint 4 feature & integrity tests passed!");
}

runSprint4Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
