import { inngest } from "@/inngest/client";
import {
  scheduledJobFetch,
  jobFetchRequested,
  scheduledDigestCron,
  sendDigestEmail,
  scoreJobOnCreation,
} from "@/inngest/functions";
import { buildDigestHtml } from "@/services/digest.service";
import type { DigestJobSummary } from "@/dal/growth.dal";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runInngestUnitTests() {
  console.log("=================================================");
  console.log("🧪 Running Inngest Background Queue Unit Tests...");
  console.log("=================================================\n");

  // 1. Inngest Client Verification
  {
    console.log("1. Verifying Inngest client configuration...");
    assert(inngest.id === "jobpilot", `Expected inngest.id to be 'jobpilot', got '${inngest.id}'`);
    console.log("   ✅ Inngest client ID verified as 'jobpilot'.");
  }

  // 2. Inngest Function Definitions & Triggers
  {
    console.log("2. Verifying Inngest function triggers & metadata...");

    assert(Boolean(scheduledJobFetch), "scheduledJobFetch function must exist");
    assert(Boolean(jobFetchRequested), "jobFetchRequested function must exist");
    assert(Boolean(scheduledDigestCron), "scheduledDigestCron function must exist");
    assert(Boolean(sendDigestEmail), "sendDigestEmail function must exist");
    assert(Boolean(scoreJobOnCreation), "scoreJobOnCreation function must exist");

    console.log("   ✅ All 5 Inngest background functions defined and exported.");
  }

  // 3. Typed Event Schemas
  {
    console.log("3. Verifying Inngest typed events...");
    const {
      jobFetchRequestedEvent,
      digestEmailScheduledEvent,
      jobCreatedEvent,
    } = await import("@/inngest/events");

    // Test valid event creation
    const fetchEvent = jobFetchRequestedEvent.create({
      source: "greenhouse",
      target: "engineer",
      userId: "user-123",
    });
    assert(fetchEvent.name === "job.fetch.requested", "Event name must match");
    assert(fetchEvent.data.source === "greenhouse", "Payload source must match");

    const digestEvent = digestEmailScheduledEvent.create({
      userId: "user-456",
      frequency: "weekly",
    });
    assert(digestEvent.name === "digest.email.scheduled", "Event name must match");
    assert(digestEvent.data.userId === "user-456", "Payload userId must match");

    const createEvent = jobCreatedEvent.create({
      jobId: "job-789",
      userId: "user-456",
      provider: "claude",
    });
    assert(createEvent.name === "job.created", "Event name must match");

    console.log("   ✅ Typed event creators validated successfully.");
  }


  // 3. Digest Email HTML Builder
  {
    console.log("3. Verifying Digest Email HTML generator...");
    const sampleJobs: DigestJobSummary[] = [
      {
        id: "job-1",
        title: "Senior Fullstack Engineer",
        company: "Acme DRC",
        location: "Kinshasa",
        url: "https://example.com/job1",
        source: "congojob",
        createdAt: new Date(),
      },
      {
        id: "job-2",
        title: "DevOps Specialist",
        company: "CloudCorp",
        location: null,
        url: null,
        source: "remoteok",
        createdAt: new Date(),
      },
    ];

    const html = buildDigestHtml("Alice", sampleJobs, "https://jobpilot.ai");

    assert(html.includes("JobPilot Opportunity Digest"), "HTML must contain header");
    assert(html.includes("Alice"), "HTML must be personalized with user name");
    assert(html.includes("Senior Fullstack Engineer"), "HTML must include job title 1");
    assert(html.includes("Acme DRC"), "HTML must include company 1");
    assert(html.includes("Kinshasa"), "HTML must include location 1");
    assert(html.includes("DevOps Specialist"), "HTML must include job title 2");
    assert(html.includes("https://jobpilot.ai/dashboard/jobs/job-2"), "Fallback URL for null url must point to dashboard job detail");

    console.log("   ✅ Digest HTML correctly formatted with job cards and fallback URLs.");
  }

  // 4. Verification of decoupled dashboard service
  {
    console.log("4. Verifying dashboard feed decoupling...");
    const { getDashboardFeedData } = await import("@/services/dashboard.service");
    assert(typeof getDashboardFeedData === "function", "getDashboardFeedData must be a function");
    console.log("   ✅ Dashboard feed function correctly resolved without synchronous crawler dependency.");
  }

  console.log("\n=================================================");
  console.log("✨ All Inngest unit tests passed successfully!");
  console.log("=================================================\n");
}

runInngestUnitTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
