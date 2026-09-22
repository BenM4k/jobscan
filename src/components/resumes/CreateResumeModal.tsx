"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createMasterResumeAction } from "@/actions/resume.actions";
import { MasterResumeSelect } from "@/services/db/schema";
import { MasterResumeUpload } from "@/components/profile/MasterResumeUpload";
import { ProfileAiEngineSelect } from "@/components/profile/ProfileAiEngineSelect";
import { MasterResumeEditor } from "@/components/profile/MasterResumeEditor";
import { formatResumeToMarkdown } from "@/lib/resume-format";
import { EducationItem, ExperienceItem, ResumeProfileData } from "@/lib/ai";
import { toast } from "sonner";
import { Sparkles, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

interface CreateResumeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (newResume: MasterResumeSelect) => void;
}

export function CreateResumeModal({
  open,
  onOpenChange,
  onCreated,
}: CreateResumeModalProps) {
  const [label, setLabel] = useState("");
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const [aiProvider, setAiProvider] = useState("gemini");

  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [rawText, setRawText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = useTranslations("resumes.create");
  const tCommon = useTranslations("common");

  const resetForm = () => {
    setLabel("");
    setLanguage("en");
    setAiProvider("gemini");
    setSummary("");
    setSkills("");
    setEducation([]);
    setExperience([]);
    setRawText("");
    setResumeText("");
  };

  const handleExtracted = (data: ResumeProfileData, fileRawText: string) => {
    setSummary(data.summary || "");
    setSkills(data.skills?.join(", ") || "");
    setEducation(data.education || []);
    setExperience(data.experience || []);
    setRawText(fileRawText);
    setResumeText(fileRawText);
    if (!label.trim() && data.summary) {
      const firstLine = data.summary.split(".")[0];
      if (firstLine && firstLine.length < 50) {
        setLabel(firstLine);
      }
    }
  };

  const parsedSkillsList = skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedContent = formatResumeToMarkdown({
      summary,
      skills: parsedSkillsList,
      education,
      experience,
      rawResumeText: resumeText || rawText,
    });

    if (!formattedContent.trim()) {
      toast.error(t("contentRequired"));
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createMasterResumeAction({
        label: label.trim() || "New Persona",
        content: formattedContent,
        language,
        skills: parsedSkillsList,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || t("createFailed"));
        return;
      }

      toast.success(t("createSuccess", { label: res.data.label }));
      onCreated(res.data);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error(t("unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasContent = Boolean(
    summary || skills || education.length > 0 || experience.length > 0 || resumeText
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-6 gap-5">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <DialogTitle className="text-base font-bold text-foreground">
              {t("title")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground font-normal leading-relaxed">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-5">
          {/* Persona Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                {t("personaLabel")}
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("personaLabelPlaceholder")}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                {t("targetLanguage")}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "fr")}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="en">English (en)</option>
                <option value="fr">French (fr)</option>
              </select>
            </div>
          </div>

          {/* AI Document Upload */}
          <MasterResumeUpload
            onExtracted={handleExtracted}
            disabled={isSubmitting}
            isReplacing={hasContent}
          />

          {/* AI Engine Selector */}
          <ProfileAiEngineSelect
            aiProvider={aiProvider}
            onAiProviderChange={setAiProvider}
          />

          {/* Structured Output Review & Editor */}
          <div className="border-t border-border/60 pt-4">
            <div className="mb-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                {t("reviewCustomization")}
              </h4>
              <p className="text-xs text-muted-foreground">
                {t("reviewCustomizationSubtitle")}
              </p>
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

          <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !hasContent}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 px-4 py-2 text-xs font-semibold gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>{isSubmitting ? t("creating") : t("createAction")}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
