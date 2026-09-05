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
      // Daily users are processed every day
      const dailyRes = await growthDal.getEligibleDigestUsers("daily");
      if (!dailyRes.ok) {
        throw new Error(`Failed to query daily eligible users: ${dailyRes.error.message}`);
      }

      const users: growthDal.DigestUser[] = [...dailyRes.value];

      // Weekly users are processed only on Mondays (UTC day 1)
      const isWeeklyDay = new Date().getUTCDay() === 1;
      if (isWeeklyDay) {
        const weeklyRes = await growthDal.getEligibleDigestUsers("weekly");
        if (!weeklyRes.ok) {
          throw new Error(`Failed to query weekly eligible users: ${weeklyRes.error.message}`);
        }
        users.push(...weeklyRes.value);
      }

      return users;
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
