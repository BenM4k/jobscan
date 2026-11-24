import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  ingestAllSources,
  jobFetchRequested,
  drcJobFetchRequested,
  scheduledDigestCron,
  sendDigestEmail,
  scoreJobOnCreation,
  mockPaymentConfirmationJob,
  checkSubscriptionExpiryCron,
  retryCreditRefundJob,
  embedResumeOnUpdate,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    ingestAllSources,
    jobFetchRequested,
    drcJobFetchRequested,
    scheduledDigestCron,
    sendDigestEmail,
    scoreJobOnCreation,
    mockPaymentConfirmationJob,
    checkSubscriptionExpiryCron,
    retryCreditRefundJob,
    embedResumeOnUpdate,
  ],
});

