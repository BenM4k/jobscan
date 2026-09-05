import { inngest } from "../client";
import { digestEmailScheduledEvent } from "../events";
import { NonRetriableError } from "inngest";
import * as growthDal from "@/dal/growth.dal";
import * as digestService from "@/services/digest.service";

export const scheduledDigestCron = inngest.createFunction(
  {
    id: "scheduled-digest-cron",
    triggers: [{ cron: "0 8 * * *" }],
  },
  async ({ step }) => {
    const usersResult = await step.run("query-eligible-users", async () => {
      const res = await growthDal.getEligibleDigestUsers();
      if (!res.ok) {
        throw new Error(`Failed to query eligible users: ${res.error.message}`);
      }
      return res.value;
    });

    if (usersResult.length === 0) {
      return { scheduled: 0 };
    }

    const events = usersResult.map((u) =>
      digestEmailScheduledEvent.create({
        userId: u.id,
        frequency: u.frequency,
      })
    );

    await step.sendEvent("fan-out-digest-emails", events);

    return { scheduled: events.length };
  }
);

export const sendDigestEmail = inngest.createFunction(
  {
    id: "send-digest-email",
    triggers: [digestEmailScheduledEvent],
  },
  async ({ event, step }) => {
    const { userId, frequency } = event.data;

    if (!userId || typeof userId !== "string" || !userId.trim()) {
      throw new NonRetriableError(
        "sendDigestEmail: event.data.userId is required and was absent. Event will not be retried."
      );
    }

    return await step.run("dispatch-digest-email", async () => {
      const res = await digestService.dispatchUserDigestEmail(userId, frequency);
      if (!res.ok) {
        throw new Error(`Failed to send digest email to ${userId}: ${res.error.message}`);
      }
      return res.value;
    });
  }
);
