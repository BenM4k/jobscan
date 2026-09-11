"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ProfileOverview } from "@/components/profile/ProfileOverview";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { EducationItem, ExperienceItem } from "@/lib/ai";
import type { UserAiUsage } from "@/services/ai/usage.service";

interface ProfileViewModeProps {
  userName: string;
  userEmail: string;
  summary: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  resumeText: string;
  parsedSkillsList: string[];
  aiProvider: string;
  aiUsage?: UserAiUsage | null;
  aiUsageError?: boolean;
  resumeLabel?: string;
  resumeVersion?: number;
  resumeLanguage?: string;
  resumeSource?: string;
  onEditClick: () => void;
  onDeleteClick: () => void;
}

export function ProfileViewMode({
  userName,
  userEmail,
  summary,
  education,
  experience,
  resumeText,
  parsedSkillsList,
  aiProvider,
  aiUsage,
  aiUsageError = false,
  resumeLabel,
  resumeVersion,
  resumeLanguage,
  resumeSource,
  onEditClick,
  onDeleteClick,
}: ProfileViewModeProps) {
  const t = useTranslations("profile");
  const displayName =
    userName || (userEmail ? userEmail.split("@")[0] : "Candidate");

  const headline =
    experience.length > 0 && experience[0]?.title
      ? `${experience[0].title}${experience[0].company ? ` at ${experience[0].company}` : ""}`
      : parsedSkillsList.length > 0
      ? parsedSkillsList.slice(0, 3).join(" • ")
      : t("profileTitleTemplate", { label: resumeLabel || t("masterFallbackLabel") });

  return (
    <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16 pt-2">
      <ProfileOverview
        name={displayName}
        headline={headline}
        summary={summary}
        education={education}
        experience={experience}
        about={resumeText}
        skills={parsedSkillsList}
        resumeLabel={resumeLabel}
        resumeVersion={resumeVersion}
        resumeLanguage={resumeLanguage}
        resumeSource={resumeSource}
        onEditClick={onEditClick}
        onReformatClick={onEditClick}
        onDeleteClick={onDeleteClick}
        isReformatting={false}
      />

      <ProfileSidebar
        aiProvider={aiProvider}
        skillsCount={parsedSkillsList.length}
        resumeLength={resumeText.length}
        experienceCount={experience.length}
        educationCount={education.length}
        aiUsage={aiUsage}
        aiUsageError={aiUsageError}
        resumeLabel={resumeLabel}
        resumeVersion={resumeVersion}
        resumeLanguage={resumeLanguage}
        resumeSource={resumeSource}
      />
    </div>
  );
}
