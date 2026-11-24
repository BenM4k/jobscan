import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/services/db";
import {
  user,
  job,
  pipelineEntry,
  tailoredResumeVersion,
  coverLetterVersion,
} from "@/services/db/schema";
import { isDrcJob } from "@/services/crawler/drc-filter";
import { resolveNetworkFromPhone } from "@/services/billing/saspay/network-helper";
import { verifySasPayAmountAndCurrency } from "@/services/billing/saspay/saspay-provider";
import * as resumeDal from "@/dal/resume.dal";
import * as tailoringDal from "@/dal/tailoring.dal";

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runSprint2IntegrityTests() {
  console.log("Running Sprint 2 integrity unit tests...");

  // 1. isDrcJob must not false-positive on CI/CD
  assert(
    !isDrcJob({
      title: "Senior Platform Engineer (CI/CD)",
      description: "Build automated CI/CD pipelines for cloud deployments.",
      country: "United States",
      countryCode: "US",
      city: "Remote",
    }),
    "Remote CI/CD job in US must NOT match DRC filter"
  );
  assert(
    isDrcJob({
      title: "Backend Engineer",
      description: "Work on cloud infrastructure",
      countryCode: "CD",
    }),
    "Job with countryCode CD must match DRC filter"
  );
  assert(
    isDrcJob({
      title: "Program Manager",
      description: "Based in Kinshasa, DRC.",
    }),
    "Job mentioning Kinshasa/DRC must match DRC filter"
  );
  assert(
    !isDrcJob({
      title: "Logistics Officer",
      description: "Based in Brazzaville, Republic of the Congo.",
      country: "Congo-Brazzaville",
    }),
    "Job in Congo-Brazzaville must be excluded"
  );

  // 2. resolveNetworkFromPhone for SN, TG, BF
  const sn = resolveNetworkFromPhone("+221771234567");
  assert(sn.country === "SN" && sn.currency === "XOF", "SN must resolve to XOF");
  const tg = resolveNetworkFromPhone("+22890123456");
  assert(tg.country === "TG" && tg.currency === "XOF", "TG must resolve to XOF");
  const bf = resolveNetworkFromPhone("+22675123456");
  assert(bf.country === "BF" && bf.currency === "XOF", "BF must resolve to XOF");

  // 3. verifySasPayAmountAndCurrency
  assert(
    verifySasPayAmountAndCurrency(
      { currency: "USD", requested_amount: "15.00", debited_amount: "15.00" },
      1500
    ).valid,
    "Exact USD amount must pass"
  );
  assert(
    verifySasPayAmountAndCurrency(
      { currency: "XOF", requested_amount: "9000.00", debited_amount: "9000.00" },
      1500
    ).valid,
    "Exact XOF amount must pass"
  );
  assert(
    !verifySasPayAmountAndCurrency(
      { currency: "USD", requested_amount: "1.00", debited_amount: "1.00" },
      1500
    ).valid,
    "Underpayment must be rejected"
  );
  assert(
    !verifySasPayAmountAndCurrency(
      { currency: "", requested_amount: "15.00", debited_amount: "15.00" },
      1500
    ).valid,
    "Missing currency must be rejected"
  );

  // 4. DB-backed tests: createMasterResume with omitted isActive & atomic tailoring upserts
  const testUserId = crypto.randomUUID();
  const testJobId = crypto.randomUUID();

  await db.insert(user).values({
    id: testUserId,
    name: "Sprint 2 Integrity Tester",
    email: `sprint2-${Date.now()}@example.com`,
    emailVerified: true,
  });

  await db.insert(job).values({
    id: testJobId,
    source: "manual",
    title: "Test Role",
    company: "Test Co",
    description: "Test job description",
    addedByUserId: testUserId,
  });

  try {
    // 4a. createMasterResume with omitted isActive when an active resume already exists
    const r1 = await resumeDal.createMasterResume({
      userId: testUserId,
      label: "First Persona",
      content: "Summary: First resume\nSkills: TypeScript, React",
      isActive: true,
    });
    assert(r1.ok, "First master resume creation should succeed");

    const r2 = await resumeDal.createMasterResume({
      userId: testUserId,
      label: "Second Persona (default active)",
      content: "Summary: Second resume\nSkills: Python, SQL",
    });
    assert(
      r2.ok,
      `Second master resume with omitted isActive should succeed: ${r2.ok ? "" : r2.error.message}`
    );
    assert(r2.value.isActive === true, "Second resume should default to active");

    const r1Reload = await resumeDal.getMasterResumeById(r1.value.id, testUserId);
    assert(
      r1Reload.ok && r1Reload.value?.isActive === false,
      "First resume must have been demoted to inactive"
    );

    // 4b. saveTailoredResume / saveTailoredCoverLetter upsert + version history
    const [entry] = await db
      .insert(pipelineEntry)
      .values({
        userId: testUserId,
        jobId: testJobId,
        status: "saved",
      })
      .returning();

    const tr1 = await tailoringDal.saveTailoredResume(
      entry.id,
      "Tailored Resume v1",
      "ATS",
      null,
      "en"
    );
    assert(tr1.ok, "First tailored resume save should succeed");
    const tr2 = await tailoringDal.saveTailoredResume(
      entry.id,
      "Tailored Resume v2",
      "ATS",
      { edit: true },
      "en"
    );
    assert(tr2.ok, "Second tailored resume save should succeed");
    assert(
      tr1.value.id === tr2.value.id,
      "Repeated tailored resume save must update the same single row"
    );

    const trVersions = await db
      .select()
      .from(tailoredResumeVersion)
      .where(eq(tailoredResumeVersion.tailoredResumeId, tr2.value.id));
    assert(
      trVersions.length === 2,
      `Expected 2 tailored resume versions, got ${trVersions.length}`
    );

    const cl1 = await tailoringDal.saveTailoredCoverLetter(entry.id, "Letter v1");
    assert(cl1.ok, "First cover letter save should succeed");
    const cl2 = await tailoringDal.saveTailoredCoverLetter(
      entry.id,
      "Letter v2",
      { edit: true }
    );
    assert(cl2.ok, "Second cover letter save should succeed");
    assert(
      cl1.value.id === cl2.value.id,
      "Repeated cover letter save must update the same single row"
    );

    const clVersions = await db
      .select()
      .from(coverLetterVersion)
      .where(eq(coverLetterVersion.tailoredCoverLetterId, cl2.value.id));
    assert(
      clVersions.length === 2,
      `Expected 2 cover letter versions, got ${clVersions.length}`
    );

    console.log("✅ All Sprint 2 integrity unit tests passed!");
  } finally {
    await db.delete(job).where(eq(job.id, testJobId));
    await db.delete(user).where(eq(user.id, testUserId));
  }

  process.exit(0);
}

runSprint2IntegrityTests().catch((err) => {
  console.error("Sprint 2 integrity unit test failed:", err);
  process.exit(1);
});
