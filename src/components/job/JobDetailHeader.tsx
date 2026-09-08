"use client";

import React from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import {
  Globe,
  Calendar,
  MapPin,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface JobDetailHeaderProps {
  job: JobSelect;
  onStatusChange: (status: JobStatus) => void;
}

export function JobDetailHeader({ job, onStatusChange }: JobDetailHeaderProps) {
  const t = useTranslations("jobDetail");
  const tDash = useTranslations("dashboard");

  const statusOptions: { id: JobStatus; label: string }[] = [
    { id: "new", label: tDash("statusNew") },
    { id: "scored", label: tDash("statusScored") },
    { id: "applied", label: tDash("statusApplied") },
    { id: "interviewing", label: tDash("statusInterviewing") },
    { id: "rejected", label: tDash("statusRejected") },
    { id: "offer", label: tDash("statusOffer") },
  ];

  const currentStatusLabel =
    statusOptions.find((o) => o.id === job.status)?.label ||
    job.status.charAt(0).toUpperCase() + job.status.slice(1);

  const locationText =
    Array.isArray(job.remoteRegions) && job.remoteRegions.length > 0
      ? job.remoteRegions.join(", ")
      : [job.city, job.countryCode || job.country].filter(Boolean).join(", ");

  return (
    <header className="pb-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left: Job & Company Details */}
        <div className="space-y-2 min-w-0 flex-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 leading-snug tracking-tight font-sans wrap-break-word">
              {job.title}
            </h1>
            <p className="text-sm font-normal text-gray-500 dark:text-zinc-400 mt-0.5 font-sans wrap-break-word">
              {job.company}
              {job.source && (
                <span className="text-muted-foreground/60 dark:text-zinc-500 ml-2 font-mono text-xs uppercase tracking-wider">
                  {t("via")} {job.source}
                </span>
              )}
            </p>
          </div>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-normal pt-1 font-sans">
            {job.workplaceType && (
              <span className="inline-flex items-center gap-1.5">
                <Globe className="size-4.5 shrink-0 text-muted-foreground" />
                <span className="capitalize">
                  {job.workplaceType === "remote"
                    ? tDash("remote")
                    : job.workplaceType === "hybrid"
                      ? tDash("hybrid")
                      : job.workplaceType === "onsite" ||
                          job.workplaceType === "on-site"
                        ? tDash("onSite")
                        : job.workplaceType}
                </span>
              </span>
            )}

            {job.postedAt && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4.5 shrink-0 text-muted-foreground" />
                <span>
                  {t("posted")}{" "}
                  {new Date(job.postedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </span>
            )}

            {locationText && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4.5 shrink-0 text-muted-foreground" />
                <span>{locationText}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Solid Primary Action & Pipeline Status */}
        <div className="flex items-center sm:flex-col sm:items-end gap-3 sm:gap-2.5 shrink-0 pt-1 sm:pt-0">
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              <span>{t("apply")}</span>
              <ArrowUpRight className="size-4.5 shrink-0" />
            </a>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-normal transition-colors cursor-pointer">
              <span>
                {t("statusLabel")}: {currentStatusLabel}
              </span>
              <ChevronDown className="size-4.5 shrink-0 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {statusOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.id}
                  onClick={() => onStatusChange(opt.id)}
                  className={`text-xs font-normal cursor-pointer ${
                    job.status === opt.id
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
