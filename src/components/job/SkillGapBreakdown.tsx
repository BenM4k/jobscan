import React from "react";
import { Check, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface SkillGapBreakdownProps {
  matchedSkills?: string[] | null;
  missingSkills?: string[] | null;
}

/**
 * Step 12/13: Displays a two-column breakdown of matched vs missing candidate skills.
 */
export function SkillGapBreakdown({
  matchedSkills,
  missingSkills,
}: SkillGapBreakdownProps) {
  const t = useTranslations("jobDetail");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-sm font-normal">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-foreground dark:text-zinc-100 font-medium">
          <Check className="size-4.5 text-muted-foreground dark:text-zinc-400 shrink-0" />
          <span>
            {t("matchedSkills")} ({matchedSkills?.length || 0})
          </span>
        </div>
        <p className="text-gray-600 dark:text-zinc-300 leading-relaxed pl-6">
          {matchedSkills?.length ? matchedSkills.join(", ") : t("noneIdentified")}
        </p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-foreground dark:text-zinc-100 font-medium">
          <AlertCircle className="size-4.5 text-muted-foreground dark:text-zinc-400 shrink-0" />
          <span>
            {t("missingSkills")} ({missingSkills?.length || 0})
          </span>
        </div>
        <p className="text-gray-600 dark:text-zinc-300 leading-relaxed pl-6">
          {missingSkills?.length ? missingSkills.join(", ") : t("noneIdentified")}
        </p>
      </div>
    </div>
  );
}
