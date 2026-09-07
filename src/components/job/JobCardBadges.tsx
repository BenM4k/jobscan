"use client";

import React from "react";

interface JobCardBadgesProps {
  locationText?: string;
  workplaceLabel?: string;
  source?: string | null;
  postedDate?: string | null;
}

function formatSource(source?: string | null): string | null {
  if (!source) return null;
  const map: Record<string, string> = {
    remoteok: "RemoteOK",
    greenhouse: "Greenhouse",
    reliefweb: "ReliefWeb",
    emploicd: "Emploi.cd",
    congojob: "CongoJob",
    unjobs: "UNJobs",
    ashby: "Ashby",
    lever: "Lever",
  };
  const clean = source.toLowerCase();
  const name = map[clean] || (source.charAt(0).toUpperCase() + source.slice(1));
  return `Via ${name}`;
}

function formatWorkplace(workplace?: string): string | null {
  if (!workplace) return null;
  const lower = workplace.trim().toLowerCase();
  if (lower === "remote") return "Remote";
  if (lower === "hybrid") return "Hybrid";
  if (lower === "onsite" || lower === "on-site") return "On-site";
  return workplace.charAt(0).toUpperCase() + workplace.slice(1).toLowerCase();
}

export function JobCardBadges({
  locationText,
  workplaceLabel,
  source,
  postedDate,
}: JobCardBadgesProps) {
  const workplace = formatWorkplace(workplaceLabel);
  const sourceText = formatSource(source);
  const hasGroup1 = Boolean(locationText || workplace);
  const hasGroup2 = Boolean(sourceText || postedDate);

  if (!hasGroup1 && !hasGroup2) return null;

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
    </div>
  );
}
