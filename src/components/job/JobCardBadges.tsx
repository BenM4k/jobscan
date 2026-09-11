"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface JobCardBadgesProps {
  locationText?: string;
  workplaceLabel?: string;
  source?: string | null;
  postedDate?: string | null;
  alsoPostedOn?: string[] | null;
}

function formatSourceName(source: string): string {
  const map: Record<string, string> = {
    remoteok: "RemoteOK",
    greenhouse: "Greenhouse",
    reliefweb: "ReliefWeb",
    emploicd: "Emploi.cd",
    emploi_cd: "Emploi.cd",
    congojob: "CongoJob",
    unjobs: "UNJobs",
    ashby: "Ashby",
    lever: "Lever",
    manual: "Manual",
  };
  const clean = source.toLowerCase();
  return map[clean] || (source.charAt(0).toUpperCase() + source.slice(1));
}

function formatSource(source?: string | null, viaPrefix: string = "via"): string | null {
  if (!source) return null;
  const name = formatSourceName(source);
  const prefix = viaPrefix.charAt(0).toUpperCase() + viaPrefix.slice(1);
  return `${prefix} ${name}`;
}

function formatWorkplace(workplace?: string): string | null {
  if (!workplace) return null;
  const lower = workplace.trim().toLowerCase();
  if (lower === "remote") return "Remote";
  if (lower === "hybrid") return "Hybrid";
  if (lower === "onsite" || lower === "on-site") return "On-site";
  return workplace;
}

export function JobCardBadges({
  locationText,
  workplaceLabel,
  source,
  postedDate,
  alsoPostedOn,
}: JobCardBadgesProps) {
  const t = useTranslations("dashboard");
  const workplace = workplaceLabel ? formatWorkplace(workplaceLabel) : null;
  const sourceText = formatSource(source, t("via") || "via");
  const hasGroup1 = Boolean(locationText || workplace);
  const hasGroup2 = Boolean(sourceText || postedDate);
  const hasAlsoPosted = Boolean(alsoPostedOn && alsoPostedOn.length > 0);

  if (!hasGroup1 && !hasGroup2 && !hasAlsoPosted) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1.5 text-xs text-muted-foreground dark:text-zinc-400 font-normal font-sans">
      {/* Group 1: Location & Workplace Type */}
      {hasGroup1 && (
        <div className="flex items-center gap-1.5">
          {locationText && <span>{locationText}</span>}
          {locationText && workplace && (
            <span className="text-muted-foreground/40 select-none">·</span>
          )}
          {workplace && <span>{workplace}</span>}
        </div>
      )}

      {/* Group 2: Source & Posted Date */}
      {hasGroup2 && (
        <div className="flex items-center gap-1.5">
          {sourceText && <span>{sourceText}</span>}
          {sourceText && postedDate && (
            <span className="text-muted-foreground/40 select-none">·</span>
          )}
          {postedDate && <span>{postedDate}</span>}
        </div>
      )}

      {/* Group 3: Also posted on */}
      {hasAlsoPosted && (
        <div className="flex items-center gap-1.5">
          {(hasGroup1 || hasGroup2) && (
            <span className="text-muted-foreground/40 select-none">·</span>
          )}
          <span>
            Also posted on:{" "}
            <span className="font-medium text-slate-700 dark:text-zinc-200">
              {alsoPostedOn!.map(formatSourceName).join(", ")}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
