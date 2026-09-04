"use client";

import React from "react";
import { ProfileOverview } from "@/components/profile/ProfileOverview";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { EducationItem, ExperienceItem } from "@/lib/ai";

interface ProfileViewModeProps {
  userName: string;
  userEmail: string;
  summary: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  resumeText: string;
  parsedSkillsList: string[];
  aiProvider: string;
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
  onEditClick,
  onDeleteClick,
}: ProfileViewModeProps) {
  const displayName =
    userName || (userEmail ? userEmail.split("@")[0] : "Candidate");

  const headline =
    experience.length > 0 && experience[0]?.title
      ? `${experience[0].title}${experience[0].company ? ` at ${experience[0].company}` : ""}`
      : parsedSkillsList.length > 0
      ? parsedSkillsList.slice(0, 3).join(" • ")
      : "Candidate Profile";

  return (
    <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16 pt-2">
      <ProfileOverview
        name={displayName}
        headline={headline}
        location="Democratic Republic of Congo"
        summary={summary}
        education={education}
        experience={experience}
        about={resumeText}
        skills={parsedSkillsList}
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
      />
    </div>
  );
}
