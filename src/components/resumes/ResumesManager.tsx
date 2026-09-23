import React from "react";
import { MasterResumeSelect } from "@/services/db/schema";
import { ResumeCard } from "./ResumeCard";
import { ResumesViewContainer } from "./ResumesViewContainer";
import { CreatePersonaButton } from "./CreatePersonaButton";
import { ResumesEmptyState } from "./ResumesEmptyState";
import { getTranslations } from "next-intl/server";

interface ResumesManagerProps {
  initialResumes: MasterResumeSelect[];
}

export async function ResumesManager({ initialResumes }: ResumesManagerProps) {
  const t = await getTranslations("resumes");

  if (initialResumes.length === 0) {
    return <ResumesEmptyState />;
  }

  return (
    <ResumesViewContainer
      resumesCount={initialResumes.length}
      countSingleText={t("countSingle")}
      countMultipleText={t("countMultiple", { count: initialResumes.length })}
      actions={<CreatePersonaButton />}
    >
      {initialResumes.map((resume) => (
        <ResumeCard
          key={`${resume.id}_v${resume.version}`}
          resume={resume}
          isOnlyResume={initialResumes.length <= 1}
        />
      ))}
    </ResumesViewContainer>
  );
}
