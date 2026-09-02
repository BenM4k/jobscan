"use client";

import React, { useState } from "react";
import { saveMasterResumeAction, deleteResumeAction } from "@/actions/profile.actions";
import { CardGridSelect } from "@/components/ui/card-grid-select";
import { ProfileOverview } from "@/components/profile/ProfileOverview";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { MasterResumeUpload } from "@/components/profile/MasterResumeUpload";
import { MasterResumeEditor } from "@/components/profile/MasterResumeEditor";
import { EducationItem, ExperienceItem, ResumeProfileData } from "@/lib/ai";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import posthog from "posthog-js";

interface ProfileFormProps {
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

  const t = useTranslations("profile");
  const tCommon = useTranslations("common");

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

  const deleteResumeModal = (
    <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 rounded-3xl p-6 space-y-4">
        <DialogHeader>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg mb-1">
            🗑️
          </div>
          <DialogTitle className="text-base font-bold text-gray-900 dark:text-slate-100">
            {t("deleteResumeModalTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
            {t("deleteResumeModalDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setDeleteConfirmOpen(false)}
            className="text-xs font-bold rounded-xl cursor-pointer"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDeleteResume}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            {t("deleteResumeConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (!isEditing && resumeText.trim()) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto py-2">
        <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16 pt-2">
          <ProfileOverview
            name={userName || (userEmail ? userEmail.split("@")[0] : "Candidate")}
            headline={
              experience.length > 0 && experience[0]?.title
                ? `${experience[0].title}${experience[0].company ? ` at ${experience[0].company}` : ""}`
                : parsedSkillsList.length > 0
                ? parsedSkillsList.slice(0, 3).join(" • ")
                : "Candidate Profile"
            }
            location="Democratic Republic of Congo"
            summary={summary}
            education={education}
            experience={experience}
            about={resumeText}
            skills={parsedSkillsList}
            onEditClick={() => setIsEditing(true)}
            onReformatClick={() => setIsEditing(true)}
            onDeleteClick={() => setDeleteConfirmOpen(true)}
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
        {deleteResumeModal}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
            {t("title")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {resumeText.trim() && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold text-xs px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-700 transition cursor-pointer shadow-2xs"
            >
              {t("cancel")}
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? t("saving") : t("saveAsMaster")}
          </button>
        </div>
      </div>

      {/* Upload Dropzone */}
      <MasterResumeUpload onExtracted={handleExtracted} disabled={isSaving} />

      {/* AI Provider Select Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
            {t("defaultAiEngine")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            {t("defaultAiSubtitle")}
          </p>
        </div>

        <div className="self-start sm:self-auto">
          <CardGridSelect
            title="AI ENGINE"
            value={aiProvider}
            options={[
              { id: "gemini", label: "GEMINI 3.6 FLASH" },
              { id: "gateway", label: "GATEWAY" },
              { id: "openai", label: "OPENAI" },
              { id: "claude", label: "CLAUDE" },
            ]}
            onChange={(val) => setAiProvider(val)}
            accentColor="indigo"
          />
        </div>
      </div>

      {/* Structured / Raw Master Resume Editor */}
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

      {deleteResumeModal}
    </div>
  );
}
