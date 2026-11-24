import assert from "node:assert";
import {
  countWords,
  parseTailoredResumeDocument,
  serializeTailoredResumeDocument,
} from "@/lib/tailored-resume-document";
import { computeKeywordCoverage } from "@/lib/ats-keywords";

async function runTests() {
  console.log("Running Tailored Resume Document & ATS Keyword unit tests...");

  const englishMarkdown = `# Jane Doe
Senior Backend Engineer
Kinshasa, DRC | jane@example.com | github.com/janedoe

## Professional Summary
Backend engineer with 6+ years building TypeScript and PostgreSQL systems.

## Core Skills
Backend: TypeScript, Node.js, PostgreSQL, Redis
Cloud: Docker, Kubernetes

## Professional Experience
### Senior Backend Engineer — Acme Global
Kinshasa, DRC | 2022 – Present
• Architected event-driven ingestion pipelines with Inngest and PostgreSQL.
• Reduced API p95 latency by 42% using Redis caching.
• Mentored 4 engineers and led code reviews.

### Software Engineer — Kivu Tech
2019 – 2022
• Built REST APIs in TypeScript and Node.js.
• Automated CI/CD workflows with Docker.

## Projects
### OpenJobParser
• Built an open-source JSON-LD job scraper.

## Education
### B.S. Computer Science — University of Kinshasa
2015 – 2019

## Certifications
• AWS Certified Solutions Architect

## Languages
English (Fluent) | French (Native)

## Publications
Distributed Systems Notes`;

  const parsed = parseTailoredResumeDocument(englishMarkdown);
  assert.strictEqual(parsed.fullName, "Jane Doe");
  assert.strictEqual(parsed.headline, "Senior Backend Engineer");
  assert.ok(parsed.contactLine.includes("jane@example.com"));
  assert.ok(parsed.summary.includes("6+ years"));
  assert.ok(parsed.skillsText.includes("PostgreSQL"));
  assert.strictEqual(parsed.experience.length, 2, "Must keep ALL roles");
  assert.strictEqual(
    parsed.experience[0].bullets.length,
    3,
    "Must NOT truncate bullets to 2"
  );
  assert.strictEqual(parsed.experience[0].period, "Kinshasa, DRC | 2022 – Present");
  assert.strictEqual(parsed.experience[1].company, "Kivu Tech");
  assert.strictEqual(parsed.projects.length, 1);
  assert.strictEqual(parsed.education.length, 1);
  assert.strictEqual(parsed.education[0].institution, "University of Kinshasa");
  assert.strictEqual(parsed.certifications.length, 1);
  assert.strictEqual(parsed.languages.length, 2);
  assert.strictEqual(parsed.extraSections.length, 1);

  // Round-trip serialization preserves all roles & bullets
  const reserialized = serializeTailoredResumeDocument(parsed, "en");
  const reparsed = parseTailoredResumeDocument(reserialized);
  assert.strictEqual(reparsed.experience.length, 2);
  assert.strictEqual(reparsed.experience[0].bullets.length, 3);
  assert.strictEqual(reparsed.extraSections[0].heading, "Publications");

  // French headings support
  const frenchMarkdown = `# Jean Kabila
Ingénieur Full-Stack

## Profil professionnel
Développeur expérimenté en React et TypeScript.

## Compétences clés
Frontend : React, Next.js, Tailwind CSS

## Expérience professionnelle
### Développeur Senior — Congo Digital
2021 – Présent
• Conception d'interfaces Next.js bilingues.
• Optimisation des requêtes SQL.
• Mise en place des tests automatisés.

## Formation
### Master Informatique — UNIKIN
2020

## Langues
Français | Anglais`;

  const parsedFr = parseTailoredResumeDocument(frenchMarkdown);
  assert.strictEqual(parsedFr.fullName, "Jean Kabila");
  assert.ok(parsedFr.summary.includes("React et TypeScript"));
  assert.strictEqual(parsedFr.experience.length, 1);
  assert.strictEqual(parsedFr.experience[0].bullets.length, 3);
  assert.strictEqual(parsedFr.education.length, 1);
  assert.strictEqual(parsedFr.languages.length, 2);

  // Round-trip serialization preserves empty title/degree positions cleanly
  const sparseDoc = parseTailoredResumeDocument(`# Alex Mbuyi

## Professional Experience
### — Kivu Cloud
2023 – Present
• Built Kubernetes deployment pipelines.

## Education
### — University of Lubumbashi
2018 – 2022`);
  assert.strictEqual(sparseDoc.experience.length, 1);
  assert.strictEqual(sparseDoc.experience[0].title, "");
  assert.strictEqual(sparseDoc.experience[0].company, "Kivu Cloud");
  assert.strictEqual(sparseDoc.education.length, 1);
  assert.strictEqual(sparseDoc.education[0].degree, "");
  assert.strictEqual(sparseDoc.education[0].institution, "University of Lubumbashi");

  const sparseReserialized = serializeTailoredResumeDocument(sparseDoc, "en");
  const sparseReparsed = parseTailoredResumeDocument(sparseReserialized);
  assert.strictEqual(sparseReparsed.experience[0].title, "");
  assert.strictEqual(sparseReparsed.experience[0].company, "Kivu Cloud");
  assert.strictEqual(sparseReparsed.education[0].degree, "");
  assert.strictEqual(sparseReparsed.education[0].institution, "University of Lubumbashi");

  // Keyword coverage matching
  const coverage = computeKeywordCoverage(
    englishMarkdown,
    ["TypeScript", "PostgreSQL", "typescript"],
    ["Redis", "GraphQL"]
  );
  assert.strictEqual(coverage.total, 4, "Must deduplicate case-insensitively");
  assert.strictEqual(coverage.covered.length, 3);
  assert.deepStrictEqual(coverage.missing, ["GraphQL"]);
  assert.strictEqual(coverage.percent, 75);

  // Distinct-term keyword matching and punctuation-bearing skills
  const boundaryCoverage = computeKeywordCoverage(
    "This is good JavaScript and CSS code using C++, C#, .NET, and Node.js.",
    ["Go", "Java", "C", "C++", "C#", ".NET", "Node.js", "CSS"],
    []
  );
  assert.deepStrictEqual(boundaryCoverage.covered, ["C++", "C#", ".NET", "Node.js", "CSS"]);
  assert.deepStrictEqual(boundaryCoverage.missing, ["Go", "Java", "C"]);

  assert.strictEqual(countWords("  hello   world  test "), 3);

  console.log("Tailored Resume Document & ATS Keyword tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
