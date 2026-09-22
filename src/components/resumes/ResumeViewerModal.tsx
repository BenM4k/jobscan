"use client";

import React, { useState } from "react";
import { MasterResumeSelect } from "@/services/db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ResumeViewerContent } from "./ResumeViewerContent";
import { MasterResumeEditor } from "@/components/profile/MasterResumeEditor";
import { parseResumeContent, formatResumeToMarkdown } from "@/lib/resume-format";
import { updateMasterResumeAction } from "@/actions/resume.actions";
import { EducationItem, ExperienceItem } from "@/lib/ai";
import { toast } from "sonner";
import { Check, Edit3, Globe, History, Sparkles, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface ResumeViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resume: MasterResumeSelect | null;
  onUpdated: (updated: MasterResumeSelect) => void;
  onSetActive?: (id: string) => Promise<void>;
}

interface InnerContentProps {
  resume: MasterResumeSelect;
  onUpdated: (updated: MasterResumeSelect) => void;
  onSetActive?: (id: string) => Promise<void>;
}

function ResumeViewerModalInner({
  resume,
  onUpdated,
  onSetActive,
}: InnerContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const t = useTranslations("resumes");
  const tViewer = useTranslations("resumes.viewer");
  const tCommon = useTranslations("common");

  const parsed = parseResumeContent(resume.content);

  const [label, setLabel] = useState(resume.label);
  const [language, setLanguage] = useState<"en" | "fr">(
    (resume.language as "en" | "fr") || "en"
  );
  const [summary, setSummary] = useState(parsed.summary);
  const [skills, setSkills] = useState(parsed.skills.join(", "));
  const [education, setEducation] = useState<EducationItem[]>(parsed.education);
  const [experience, setExperience] = useState<ExperienceItem[]>(parsed.experience);
  const [resumeText, setResumeText] = useState(resume.content);

  const parsedSkillsList = skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSave = async () => {
    setIsSaving(true);
    const formattedContent = formatResumeToMarkdown({
      summary,
      skills: parsedSkillsList,
      education,
      experience,
      rawResumeText: resumeText,
    });

    const res = await updateMasterResumeAction({
      id: resume.id,
      label: label.trim() || resume.label,
      language,
      content: formattedContent,
      skills: parsedSkillsList,
    });
    setIsSaving(false);

    if (res.success && res.data) {
      toast.success(tViewer("updateSuccess", { label: res.data.label }));
      onUpdated(res.data);
      setResumeText(res.data.content);
      setIsEditing(false);
    } else {
      toast.error(res.error || tViewer("updateFailed"));
    }
  };

  const isUploaded = resume.source === "uploaded";

  return (
    <>
      <DialogHeader className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-base font-bold text-foreground">
                {isEditing ? tViewer("editPersona") : resume.label}
              </DialogTitle>

              {resume.isActive && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full font-sans">
                  <Check className="size-3" />
                  <span>{t("activePersona")}</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                <Globe className="size-3" />
                <span>{resume.language}</span>
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] font-normal text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-mono">
                <History className="size-3" />
                <span>v{resume.version}</span>
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full font-sans bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                {!isUploaded && <Sparkles className="size-3 shrink-0" />}
                <span>{isUploaded ? t("uploaded") : t("promotedFromTailored")}</span>
              </span>
            </div>
          </div>

          {/* View Mode Top Actions */}
          {!isEditing && (
            <div className="flex items-center gap-2">
              {!resume.isActive && onSetActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSetActive(resume.id)}
                  className="text-xs h-8 gap-1.5"
                >
                  <CheckCircle2 className="size-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{tViewer("setActive")}</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-xs h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
              >
                <Edit3 className="size-3.5" />
                <span>{tViewer("editAction")}</span>
              </Button>
            </div>
          )}
        </div>
      </DialogHeader>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-5">
        {isEditing ? (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  {tViewer("personaLabel")}
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={tViewer("personaLabelPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  {tViewer("language")}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "en" | "fr")}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="en">{tViewer("languageEn")}</option>
                  <option value="fr">{tViewer("languageFr")}</option>
                </select>
              </div>
            </div>

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
          </div>
        ) : (
          <ResumeViewerContent
            summary={summary}
            skills={parsedSkillsList}
            education={education}
            experience={experience}
            rawText={resumeText}
          />
        )}
      </div>

      {/* Footer for Edit Mode */}
      {isEditing && (
        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-3 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 px-4 py-2 text-xs font-semibold"
          >
            {isSaving ? tViewer("savingChanges") : tViewer("saveChanges")}
          </Button>
        </DialogFooter>
      )}
    </>
  );
}

export function ResumeViewerModal({
  open,
  onOpenChange,
  resume,
  onUpdated,
  onSetActive,
}: ResumeViewerModalProps) {
  if (!resume) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-6 gap-5">
        <ResumeViewerModalInner
          key={resume.id}
          resume={resume}
          onUpdated={onUpdated}
          onSetActive={onSetActive}
        />
      </DialogContent>
    </Dialog>
  );
}
