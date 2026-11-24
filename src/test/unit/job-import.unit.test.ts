import zlib from "node:zlib";
import { detectSmartPasteType } from "@/services/job-import/schema";
import { assertSafeDocxZip } from "@/services/job-import/file-extractor";
import { parseJobJson } from "@/services/job-import/json-parser";
import {
  detectBlockedOrAuthWallPage,
  extractJobFromHtml,
  isBlockedAuthWallPath,
  isPrivateOrReservedIp,
  validateExternalJobUrl,
} from "@/services/job-import/url-extractor";

function buildTestZip(
  entries: Array<{ name: string; content: Buffer; compressed?: boolean }>
): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf-8");
    const method = entry.compressed ? 8 : 0;
    const payload = entry.compressed
      ? zlib.deflateRawSync(entry.content)
      : entry.content;

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(entry.content.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(entry.content.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    localParts.push(local, payload);
    centralParts.push(central);
    offset += local.length + payload.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

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

  // 4. JSON-LD @graph & array support in parseJobJson
  const graphJsonRes = parseJobJson(
    JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", name: "Acme Careers" },
        {
          "@type": "JobPosting",
          title: "Staff Platform Engineer",
          hiringOrganization: { name: "Acme Cloud" },
          description: "<p>Design multi-region clusters and observability.</p>",
        },
      ],
    })
  );
  assert(graphJsonRes.ok, "JSON-LD @graph object must resolve JobPosting node");
  if (graphJsonRes.ok) {
    assert(
      graphJsonRes.value.title === "Staff Platform Engineer" &&
        graphJsonRes.value.company === "Acme Cloud",
      "JSON-LD @graph maps title and organization"
    );
  }

  const graphArrayRes = parseJobJson(
    JSON.stringify([
      { "@type": "BreadcrumbList", name: "Nav" },
      {
        "@type": "JobPosting",
        title: "Security Engineer",
        hiringOrganization: { name: "Safeguard Corp" },
        description: "<p>Harden cloud IAM and runtime telemetry.</p>",
      },
    ])
  );
  assert(graphArrayRes.ok, "JSON-LD array must resolve JobPosting element");
  if (graphArrayRes.ok) {
    assert(
      graphArrayRes.value.title === "Security Engineer",
      "JSON-LD array extracts second-element JobPosting"
    );
  }

  // 5. Invalid JSON rejection
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
    "http://[::ffff:127.0.0.1]/admin",
    "http://[::ffff:7f00:1]/secret",
    "file:///etc/passwd",
  ];
  for (const badUrl of blockedUrls) {
    assert(!validateExternalJobUrl(badUrl).ok, `SSRF URL must be blocked: ${badUrl}`);
  }
  assert(
    isPrivateOrReservedIp("::ffff:a9fe:a9fe") &&
      isPrivateOrReservedIp("0:0:0:0:0:ffff:7f00:1"),
    "Canonical hex IPv4-mapped IPv6 private/loopback/metadata addresses must be blocked"
  );

  // 5b. DOCX zip bomb & entry limit safety guard
  const safeZip = buildTestZip([
    {
      name: "word/document.xml",
      content: Buffer.from("<w:document>Software Engineer in Kinshasa</w:document>"),
      compressed: true,
    },
  ]);
  assert(assertSafeDocxZip(safeZip).ok, "Normal small DOCX ZIP archive passes safety check");

  const zipBomb = buildTestZip([
    {
      name: "word/bomb.xml",
      content: Buffer.alloc(12 * 1024 * 1024, 0x41), // 12MB zeros compresses to ~12KB (> 10MB entry cap)
      compressed: true,
    },
  ]);
  const bombCheck = assertSafeDocxZip(zipBomb);
  assert(
    !bombCheck.ok && bombCheck.error.code === "VALIDATION_ERROR",
    "Oversized decompressed DOCX ZIP entry must be rejected with VALIDATION_ERROR"
  );

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
    fallbackExtracted.plainText.includes(
      "Join Beta to design mobile-first financial tools in Kinshasa."
    ) &&
      !fallbackExtracted.plainText.includes("Home | About | Login") &&
      !fallbackExtracted.plainText.includes("window.__SECRET__") &&
      !fallbackExtracted.plainText.includes("Copyright 2026"),
    "Plain text fallback extracts <main> body sentence and strips script, nav, and footer"
  );

  // Fixture without <main> container: verifies body fallback still excludes script, nav, footer
  const noMainHtml = `
    <html>
      <head><title>Operations Lead</title></head>
      <body>
        <nav>Skip Navigation Links</nav>
        <script>const leakedSecret = 42;</script>
        <div>
          <h2>Role Overview</h2>
          <p>Coordinate logistics and supplier audits across East Africa.</p>
        </div>
        <footer>All rights reserved 2026</footer>
      </body>
    </html>
  `;
  const noMainExtracted = extractJobFromHtml(noMainHtml, "https://gamma.test/ops");
  assert(
    noMainExtracted.plainText.includes(
      "Coordinate logistics and supplier audits across East Africa."
    ) &&
      !noMainExtracted.plainText.includes("Skip Navigation Links") &&
      !noMainExtracted.plainText.includes("leakedSecret") &&
      !noMainExtracted.plainText.includes("All rights reserved 2026"),
    "Body fallback without <main> preserves job content and strips nav, script, footer"
  );

  // Fixture with preceding <article> teaser before <main>: verifies <main> is preferred over <article>
  const articleTeaserHtml = `
    <html>
      <head><title>Backend Developer</title></head>
      <body>
        <article><p>Unrelated blog teaser about company picnic.</p></article>
        <main><p>Build high-throughput billing APIs in TypeScript and PostgreSQL.</p></main>
      </body>
    </html>
  `;
  const mainOverArticle = extractJobFromHtml(
    articleTeaserHtml,
    "https://delta.test/backend"
  );
  assert(
    mainOverArticle.plainText.includes(
      "Build high-throughput billing APIs in TypeScript and PostgreSQL."
    ) && !mainOverArticle.plainText.includes("Unrelated blog teaser"),
    "Extraction prefers <main> over a preceding <article> teaser"
  );

  // 7. Authwall & bot-block detection
  assert(
    isBlockedAuthWallPath("https://www.linkedin.com/authwall?trk=bf") &&
      isBlockedAuthWallPath("https://example.com/login") &&
      !isBlockedAuthWallPath("https://example.com/jobs/123"),
    "isBlockedAuthWallPath catches login-wall paths even before structured extraction"
  );
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
