import {
  normalizeOrigin,
  normalizeRpId,
  resolvePasskeyAndAuthConfig,
} from "@/services/auth/passkey-config";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runTests() {
  console.log("Running unit tests for passkey RP ID & origin normalization...");

  // 1. Origin & RP ID normalization
  assert(
    normalizeOrigin("https://jobpilot.app/") === "https://jobpilot.app",
    "Trailing slash stripped from origin"
  );
  assert(
    normalizeOrigin("jobpilot.app") === "https://jobpilot.app",
    "Bare domain gets https://"
  );
  assert(
    normalizeRpId("https://www.jobpilot.app/") === "jobpilot.app",
    "www. stripped from rpID"
  );
  assert(
    normalizeRpId("http://localhost:3000") === "localhost",
    "localhost rpID extracted without port"
  );

  // 2. Production BETTER_AUTH_URL with trailing slash & no NEXT_PUBLIC_APP_DOMAIN
  const prodApex = resolvePasskeyAndAuthConfig({
    NODE_ENV: "production",
    BETTER_AUTH_URL: "https://jobpilot.app/",
  });
  assert(prodApex.rpID === "jobpilot.app", `Expected rpID jobpilot.app, got ${prodApex.rpID}`);
  assert(prodApex.baseURL === "https://jobpilot.app", "baseURL normalized without trailing slash");
  assert(
    prodApex.passkeyOrigins.includes("https://jobpilot.app") &&
      prodApex.passkeyOrigins.includes("https://www.jobpilot.app"),
    "Production config includes both apex and www origins"
  );
  assert(
    !prodApex.passkeyOrigins.some((o) => o.includes("localhost")),
    "Production config must not include localhost origins"
  );

  // 3. Production with www. BETTER_AUTH_URL
  const prodWww = resolvePasskeyAndAuthConfig({
    NODE_ENV: "production",
    BETTER_AUTH_URL: "https://www.jobpilot.app",
  });
  assert(prodWww.rpID === "jobpilot.app", "www BETTER_AUTH_URL derives apex rpID");
  assert(
    prodWww.passkeyOrigins.includes("https://www.jobpilot.app") &&
      prodWww.passkeyOrigins.includes("https://jobpilot.app"),
    "www BETTER_AUTH_URL includes both www and apex origins"
  );

  // 4. NEXT_PUBLIC_APP_DOMAIN with protocol & trailing slash
  const customDomain = resolvePasskeyAndAuthConfig({
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_DOMAIN: "https://www.example.com/",
  });
  assert(customDomain.rpID === "example.com", "NEXT_PUBLIC_APP_DOMAIN normalized to apex rpID");
  assert(
    customDomain.passkeyOrigins.includes("https://example.com") &&
      customDomain.passkeyOrigins.includes("https://www.example.com"),
    "Both apex and www origins included for NEXT_PUBLIC_APP_DOMAIN"
  );

  // 5. Vercel fallback without BETTER_AUTH_URL
  const vercelProd = resolvePasskeyAndAuthConfig({
    NODE_ENV: "production",
    VERCEL_PROJECT_PRODUCTION_URL: "my-app.vercel.app",
  });
  assert(vercelProd.rpID === "my-app.vercel.app", "Vercel production URL used as rpID");
  assert(
    vercelProd.passkeyOrigins.includes("https://my-app.vercel.app"),
    "Vercel production origin included"
  );

  // 6. Development fallback
  const devCfg = resolvePasskeyAndAuthConfig({
    NODE_ENV: "development",
  });
  assert(devCfg.rpID === "localhost", "Dev fallback rpID is localhost");
  assert(devCfg.baseURL === "http://localhost:3000", "Dev fallback baseURL is http://localhost:3000");
  assert(
    devCfg.passkeyOrigins.includes("http://localhost:3000") &&
      devCfg.passkeyOrigins.includes("http://127.0.0.1:3000"),
    "Dev origins include localhost and 127.0.0.1"
  );

  console.log("Passkey config unit tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Passkey config tests failed:", err);
  process.exit(1);
});
