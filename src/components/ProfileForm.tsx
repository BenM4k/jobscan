"use client";

import React, { useState } from "react";
import { saveMasterResumeAction, deleteResumeAction } from "@/actions/profile.actions";
import { MasterResumeUpload } from "@/components/profile/MasterResumeUpload";
import { MasterResumeEditor } from "@/components/profile/MasterResumeEditor";
import { ProfileViewMode } from "@/components/profile/ProfileViewMode";
import { ProfileEditHeader } from "@/components/profile/ProfileEditHeader";
import { ProfileAiEngineSelect } from "@/components/profile/ProfileAiEngineSelect";
import { DeleteResumeModal } from "@/components/profile/DeleteResumeModal";
import { EducationItem, ExperienceItem, ResumeProfileData } from "@/lib/ai";
import { toast } from "sonner";
import posthog from "posthog-js";

export interface ProfileFormProps {
  userEmail?: string;
  userName?: string;
  initialResumeText?: string;
  initialSkills?: string[];
  initialAiProvider?: string;
  initialSummary?: string;
  initialEducation?: EducationItem[];
  initialExperience?: ExperienceItem[];
}

export function ProfileForm({
  userEmail = "",
  userName = "Candidate",
  initialResumeText = "",
  initialSkills = [],
  initialAiProvider = "gemini",
  initialSummary = "",
  initialEducation = [],
  initialExperience = [],
}: ProfileFormProps) {
  const [resumeText, setResumeText] = useState(initialResumeText);
  const [summary, setSummary] = useState(initialSummary);
  const [skills, setSkills] = useState(initialSkills.join(", "));
  const [education, setEducation] = useState<EducationItem[]>(initialEducation);
  const [experience, setExperience] = useState<ExperienceItem[]>(initialExperience);
  const [rawText, setRawText] = useState(initialResumeText);
  const [aiProvider, setAiProvider] = useState(initialAiProvider);
  const [isEditing, setIsEditing] = useState(!initialResumeText.trim());
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const parsedSkillsList = skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleExtracted = (data: ResumeProfileData, fileRawText: string) => {
    setSummary(data.summary || "");
    setSkills(data.skills?.join(", ") || "");
    setEducation(data.education || []);
    setExperience(data.experience || []);
    setRawText(fileRawText);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await saveMasterResumeAction({
      summary,
      skills: parsedSkillsList,
      education,
      experience,
      rawText,
      resumeText,
      aiProvider,
    });
    setIsSaving(false);

    if (res.success && res.data) {
      posthog.capture("master_resume_saved", {
        ai_provider: aiProvider,
        skills_count: parsedSkillsList.length,
        experience_count: experience.length,
        education_count: education.length,
      });
      setResumeText(res.data.resumeText);
      setIsEditing(false);
      toast.success("Master resume saved successfully!");
    } else {
      toast.error(res.error || "Failed to save master resume");
    }
  };

  const confirmDeleteResume = async () => {
    setDeleteConfirmOpen(false);
    const res = await deleteResumeAction();
    if (res.success) {
      posthog.capture("master_resume_deleted");
      setResumeText("");
      setSummary("");
      setSkills("");
      setEducation([]);
      setExperience([]);
      setIsEditing(true);
      toast.info("Master resume deleted.");
    }
  };

  if (!isEditing && resumeText.trim()) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto py-2">
        <ProfileViewMode
          userName={userName}
          userEmail={userEmail}
          summary={summary}
          education={education}
          experience={experience}
          resumeText={resumeText}
          parsedSkillsList={parsedSkillsList}
          aiProvider={aiProvider}
          onEditClick={() => setIsEditing(true)}
          onDeleteClick={() => setDeleteConfirmOpen(true)}
        />
        <DeleteResumeModal
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={confirmDeleteResume}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      <ProfileEditHeader
        hasResume={Boolean(resumeText.trim())}
        isSaving={isSaving}
        onCancel={() => setIsEditing(false)}
        onSave={handleSave}
      />

      <MasterResumeUpload
        onExtracted={handleExtracted}
        disabled={isSaving}
        isReplacing={Boolean(resumeText.trim())}
      />

      <ProfileAiEngineSelect
        aiProvider={aiProvider}
        onAiProviderChange={setAiProvider}
      />

      <MasterResumeEditor
        summary={summary}
        skills={skills}
        education={education}
        experience={experience}
        resumeText={resumeText}
        onSummaryChange={setSummary}
        onSkillsChange={setSkills}
        onEducationChange={setEducation}
        onExperienceChange={setExperience}
        onResumeTextChange={setResumeText}
      />

      <DeleteResumeModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDeleteResume}
      />
    </div>
  );
}
