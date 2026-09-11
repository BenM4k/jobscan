import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  ingestAllSources,
  jobFetchRequested,
  scheduledDigestCron,
  sendDigestEmail,
  scoreJobOnCreation,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    ingestAllSources,
    jobFetchRequested,
    scheduledDigestCron,
    sendDigestEmail,
    scoreJobOnCreation,
  ],
});

