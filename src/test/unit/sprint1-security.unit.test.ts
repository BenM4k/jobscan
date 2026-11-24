import "dotenv/config";
import { sanitizeExternalUrl } from "@/lib/safe-url";
import { sanitizeJobDescriptionHtml } from "@/lib/sanitize-job-html";
import { buildDigestHtml } from "@/services/digest.service";
import { resolveSafeUnJobsUrl } from "@/services/adapters/unjobs.adapter";

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runSprint1SecurityTests() {
  console.log("Running Sprint 1 security unit tests...");

  // 1. sanitizeExternalUrl
  assert(
    sanitizeExternalUrl("javascript:alert(1)") === null,
    "Must reject javascript: URLs"
  );
  assert(
    sanitizeExternalUrl("  JaVaScRiPt:alert(1) ") === null,
    "Must reject mixed-case javascript: URLs"
  );
  assert(
    sanitizeExternalUrl("data:text/html,<script>alert(1)</script>") === null,
    "Must reject data: URLs"
  );
  assert(
    sanitizeExternalUrl("vbscript:msgbox(1)") === null,
    "Must reject vbscript: URLs"
  );
  assert(
    sanitizeExternalUrl("/dashboard/jobs/123") === null,
    "Must reject relative URLs"
  );
  assert(
    sanitizeExternalUrl("https://example.com/job?id=1") ===
      "https://example.com/job?id=1",
    "Must accept https:// URLs"
  );
  assert(
    sanitizeExternalUrl("http://example.com/job") === "http://example.com/job",
    "Must accept http:// URLs by default"
  );
  assert(
    sanitizeExternalUrl("http://example.com/checkout", { httpsOnly: true }) ===
      null,
    "Must reject http:// when httpsOnly is true"
  );

  // 2. sanitizeJobDescriptionHtml
  const dirtyHtml = `
    <h1>Injected H1</h1>
    <script>alert("xss")</script>
    <iframe src="https://evil.com"></iframe>
    <img src="x" onerror="alert(1)" />
    <p onclick="alert(1)" style="color:red">Hello <strong>world</strong> &amp; <em>team</em></p>
    <ul><li><a href="javascript:alert(1)">Click me</a></li><li>Item 2<br>Line 2</li></ul>
  `;
  const cleanHtml = sanitizeJobDescriptionHtml(dirtyHtml);
  assert(!cleanHtml.includes("<script"), "Must strip <script> tags");
  assert(!cleanHtml.includes("alert(\"xss\")"), "Must strip script body");
  assert(!cleanHtml.includes("<iframe"), "Must strip <iframe> tags");
  assert(!cleanHtml.includes("<img"), "Must strip <img> tags");
  assert(!cleanHtml.includes("onerror"), "Must strip event handlers");
  assert(!cleanHtml.includes("onclick"), "Must strip onclick attribute");
  assert(!cleanHtml.includes("style="), "Must strip style attribute");
  assert(!cleanHtml.includes("<h1"), "Must unwrap disallowed <h1> tag");
  assert(!cleanHtml.includes("<a "), "Must unwrap <a> tags per allowlist");
  assert(
    !cleanHtml.includes("javascript:"),
    "Must not retain javascript: attribute"
  );
  assert(cleanHtml.includes("<p>Hello <strong>world</strong>"), "Must preserve allowed <p>/<strong>");
  assert(cleanHtml.includes("<ul><li>Click me</li>"), "Must preserve <ul>/<li> and unwrap text");

  // 3. buildDigestHtml escaping and safe URL fallback
  const digestHtml = buildDigestHtml(
    'Alice <script>alert("u")</script>',
    [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: 'Engineer " onclick="alert(1)',
        company: "Acme & Co <b>Bad</b>",
        location: "Kinshasa <img src=x onerror=alert(1)>",
        url: "javascript:alert(1)",
        source: "manual",
        createdAt: new Date(),
      },
    ],
    "https://app.jobpilot.test"
  );
  assert(!digestHtml.includes("<script>"), "Digest must escape <script> in userName");
  assert(
    !digestHtml.includes('href="javascript:'),
    "Digest must reject javascript: URLs and fall back to app URL"
  );
  assert(
    digestHtml.includes(
      'href="https://app.jobpilot.test/dashboard/jobs/11111111-1111-4111-8111-111111111111"'
    ),
    "Digest must fall back to internal job URL when job.url is unsafe"
  );
  assert(
    digestHtml.includes("&quot; onclick=&quot;"),
    "Digest must escape quotes in job title"
  );
  assert(
    digestHtml.includes("Acme &amp; Co &lt;b&gt;Bad&lt;/b&gt;"),
    "Digest must escape HTML entities in company"
  );

  // 4. resolveSafeUnJobsUrl (SSRF prevention)
  assert(
    resolveSafeUnJobsUrl(undefined) === "https://unjobs.org/duty_stations/fih",
    "Empty target must default to safe unjobs.org URL"
  );
  assert(
    resolveSafeUnJobsUrl("https://unjobs.org/duty_stations/fih") ===
      "https://unjobs.org/duty_stations/fih",
    "Valid https://unjobs.org URL must pass"
  );

  const ssrfTargets = [
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost:3000/api/crawl",
    "http://127.0.0.1:5432/",
    "https://evil.com/jobs",
    "http://unjobs.org/duty_stations/fih",
    "https://user:pass@unjobs.org/duty_stations/fih",
    "https://unjobs.org:8443/duty_stations/fih",
    "not-a-url",
  ];

  for (const target of ssrfTargets) {
    let threw = false;
    try {
      resolveSafeUnJobsUrl(target);
    } catch {
      threw = true;
    }
    assert(threw, `resolveSafeUnJobsUrl must reject SSRF target: ${target}`);
  }

  console.log("✅ All Sprint 1 security unit tests passed!");
}

runSprint1SecurityTests().catch((err) => {
  console.error("Sprint 1 security unit test failed:", err);
  process.exit(1);
});
