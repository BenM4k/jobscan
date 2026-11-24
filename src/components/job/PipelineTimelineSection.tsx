"use client";

import React from "react";
import { Clock } from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import type { PipelineTimelineItem } from "@/services/job-history.service";

interface PipelineTimelineSectionProps {
  events: PipelineTimelineItem[];
}

function getStatusTranslationKey(status: string) {
  switch (status) {
    case "saved":
      return "timelineStatusSaved";
    case "applied":
      return "timelineStatusApplied";
    case "interviewing":
      return "timelineStatusInterviewing";
    case "offer":
      return "timelineStatusOffer";
    case "rejected":
      return "timelineStatusRejected";
    case "withdrawn":
      return "timelineStatusWithdrawn";
    default:
      return null;
  }
}

/** Renders chronological pipeline status transitions for the job detail view. */
export function PipelineTimelineSection({
  events,
}: PipelineTimelineSectionProps) {
  const t = useTranslations("jobDetail");
  const format = useFormatter();

  return (
    <section aria-label={t("timelineHeading")} className="py-4 space-y-3">
      <div className="flex items-start gap-3">
        <Clock className="size-4.5 text-muted-foreground dark:text-zinc-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h2 className="text-sm font-medium text-foreground dark:text-zinc-100 font-sans">
            {t("timelineHeading")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-normal leading-normal font-sans">
            {t("timelineSubtitle")}
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="ml-7.5 text-xs text-muted-foreground font-sans">
          {t("timelineEmpty")}
        </p>
      ) : (
        <ol className="ml-7.5 border-l-2 border-border dark:border-zinc-800 pl-4 space-y-3">
          {events.map((item, idx) => {
            const key = getStatusTranslationKey(item.status);
            const label = key ? t(key) : item.status;
            const isLocal = item.id.startsWith("local-");
            return (
              <li
                key={item.id}
                className={isLocal ? "relative jp-reveal" : "relative"}
              >
                <span
                  aria-hidden="true"
                  className={`absolute -left-[1.35rem] top-1.5 size-2.5 rounded-full bg-blue-600 dark:bg-blue-400 ${
                    idx === 0
                      ? "ring-4 ring-blue-600/15 dark:ring-blue-400/15"
                      : "ring-2 ring-background"
                  }`}
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground dark:text-zinc-100 capitalize">
                    {label}
                  </span>
                  <time className="text-[11px] text-muted-foreground">
                    {format.dateTime(new Date(item.changedAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
