import { detectSmartPasteType } from "@/services/job-import/schema";
import { parseJobJson } from "@/services/job-import/json-parser";
import {
  detectBlockedOrAuthWallPage,
  extractJobFromHtml,
  validateExternalJobUrl,
} from "@/services/job-import/url-extractor";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runUnitTests() {
  console.log("Running unit tests for job-import parsers and SSRF guards...");

  // 1. Smart Paste detection
  assert(detectSmartPasteType("   ") === "empty", "Blank input -> empty");
  assert(
    detectSmartPasteType('{"title": "Engineer", "company": "Acme"}') === "json",
    "JSON object -> json"
  );
  assert(
    detectSmartPasteType('[{"title": "Engineer"}]') === "json",
    "JSON array of objects -> json"
  );
  assert(
    detectSmartPasteType("https://boards.greenhouse.io/acme/jobs/123") === "url",
    "Single HTTPS URL -> url"
  );
  assert(
    detectSmartPasteType(
      "Senior Software Engineer\nApply at https://acme.com/jobs\nFull-time"
    ) === "text",
    "Multiline text with URL -> text"
  );
  assert(
    detectSmartPasteType("{not valid json at all") === "text",
    "Broken JSON -> text"
  );

  // 2. Deterministic JSON parser: Jobpilot format
  const jpRes = parseJobJson(
    JSON.stringify({
      title: "Backend Engineer",
      company: "Kivu Tech",
      location: "Goma, DRC",
      workplaceType: "Hybrid",
      salary: "$2,500 - $3,500 / month",
      language: "en",
      url: "https://kivutech.example/jobs/backend",
      description: "Build resilient PostgreSQL and TypeScript services.",
    })
  );
  assert(jpRes.ok, "Valid Jobpilot JSON must parse");
  if (jpRes.ok) {
    assert(jpRes.value.title === "Backend Engineer", "Title matches");
    assert(jpRes.value.company === "Kivu Tech", "Company matches");
    assert(jpRes.value.workplaceType === "hybrid", "Workplace normalized to hybrid");
    assert(jpRes.value.rawSalaryText === "$2,500 - $3,500 / month", "Salary matches");
  }

  // 3. Deterministic JSON parser: schema.org/JobPosting format (French + HTML)
  const ldRes = parseJobJson(
    JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      title: "Chef de Projet",
      hiringOrganization: { "@type": "Organization", name: "Congo Dev" },
      jobLocation: {
        "@type": "Place",
        address: {
          addressLocality: "Kinshasa",
          addressCountry: "RDC",
        },
      },
      jobLocationType: "TELECOMMUTE",
      baseSalary: {
        currency: "USD",
        value: { minValue: 2000, maxValue: 3000, unitText: "MONTH" },
      },
      inLanguage: "fr-FR",
      description:
        "<p>Nous recherchons un chef de projet.</p><ul><li>Gestion d'équipe</li></ul>",
    })
  );
  assert(ldRes.ok, "schema.org/JobPosting JSON must parse");
  if (ldRes.ok) {
    assert(ldRes.value.company === "Congo Dev", "Organization name extracted");
    assert(ldRes.value.location === "Kinshasa, RDC", "Location joined from address");
    assert(ldRes.value.workplaceType === "remote", "TELECOMMUTE -> remote");
    assert(ldRes.value.language === "fr", "inLanguage fr-FR -> fr");
    assert(
      ldRes.value.rawSalaryText === "USD 2000 - 3000 / month",
      `Salary formatted cleanly (got ${ldRes.value.rawSalaryText})`
    );
    assert(
      ldRes.value.description.includes("• Gestion d'équipe"),
      "HTML list converted to readable text"
    );
  }

  // 4. Invalid JSON rejection
  const emptyJson = parseJobJson(JSON.stringify({ foo: "bar" }));
  assert(!emptyJson.ok, "JSON without title or description must fail");

  // 5. SSRF URL validation
  assert(
    validateExternalJobUrl("https://boards.greenhouse.io/acme/jobs/123").ok,
    "Public HTTPS URL allowed"
  );
  const blockedUrls = [
    "http://localhost:3000/secret",
    "http://127.0.0.1/admin",
    "http://192.168.1.10/router",
    "http://10.0.0.5/internal",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]:8080/",
    "file:///etc/passwd",
  ];
  for (const badUrl of blockedUrls) {
    assert(!validateExternalJobUrl(badUrl).ok, `SSRF URL must be blocked: ${badUrl}`);
  }

  // 6. HTML extraction: JSON-LD @graph fast-path & plain-text fallback
  const htmlWithLd = `
    <html>
      <head>
        <title>Data Analyst - Acme</title>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "WebPage", "name": "Careers" },
              {
                "@type": "JobPosting",
                "title": "Data Analyst",
                "hiringOrganization": { "name": "Acme Analytics" },
                "description": "<p>Analyze SQL datasets and build dashboards.</p>"
              }
            ]
          }
        </script>
      </head>
      <body><nav>Menu</nav><main>Ignored</main></body>
    </html>
  `;
  const ldExtracted = extractJobFromHtml(htmlWithLd, "https://acme.test/jobs/42");
  assert(ldExtracted.structured !== null, "JSON-LD @graph JobPosting detected");
  assert(
    ldExtracted.structured?.title === "Data Analyst" &&
      ldExtracted.structured?.url === "https://acme.test/jobs/42",
    "JSON-LD extracted title and defaulted URL"
  );

  const plainHtml = `
    <html>
      <head><title>Product Designer at Beta</title></head>
      <body>
        <nav>Home | About | Login</nav>
        <script>window.__SECRET__ = 1;</script>
        <main>
          <h1>Product Designer</h1>
          <p>Join Beta to design mobile-first financial tools in Kinshasa.</p>
        </main>
        <footer>Copyright 2026</footer>
      </body>
    </html>
  `;
  const fallbackExtracted = extractJobFromHtml(plainHtml, "https://beta.test/design");
  assert(fallbackExtracted.structured === null, "No JSON-LD -> structured is null");
  assert(
    fallbackExtracted.plainText.includes("Product Designer") &&
      !fallbackExtracted.plainText.includes("window.__SECRET__") &&
      !fallbackExtracted.plainText.includes("Copyright 2026"),
    "Plain text fallback strips script, nav, and footer"
  );

  // 7. Authwall & bot-block detection
  assert(
    detectBlockedOrAuthWallPage(
      "https://www.linkedin.com/authwall?trk=bf",
      "<html><head><title>Sign in | LinkedIn</title></head><body>Sign in to view</body></html>",
      "Sign in to view"
    ),
    "LinkedIn authwall URL and Sign in title must be detected as blocked"
  );
  assert(
    detectBlockedOrAuthWallPage(
      "https://example.com/jobs/1",
      "<html><head><title>Just a moment...</title></head><body>Checking if the site connection is secure</body></html>",
      "Checking if the site connection is secure"
    ),
    "Cloudflare challenge page must be detected as blocked"
  );
  assert(
    !detectBlockedOrAuthWallPage(
      "https://acme.test/careers/senior-engineer",
      "<html><head><title>Senior Engineer - Acme</title></head><body><main>Build distributed systems.</main></body></html>",
      "Page Title: Senior Engineer - Acme\n\nBuild distributed systems and mentor junior engineers across the platform."
    ),
    "Normal job page must not be flagged as blocked"
  );

  console.log("Job import unit tests passed successfully!");
}

runUnitTests().catch((err) => {
  console.error("Job import unit tests failed:", err);
  process.exit(1);
});
