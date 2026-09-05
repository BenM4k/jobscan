import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  scheduledJobFetch,
  jobFetchRequested,
  scheduledDigestCron,
  sendDigestEmail,
  scoreJobOnCreation,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    scheduledJobFetch,
    jobFetchRequested,
    scheduledDigestCron,
    sendDigestEmail,
    scoreJobOnCreation,
  ],
});

