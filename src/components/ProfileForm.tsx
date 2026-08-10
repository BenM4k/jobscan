"use client";

import React, { useState } from "react";
import {
  saveProfileTextAction,
  uploadResumeFileAction,
  reformatProfileWithGeminiAction,
  deleteResumeAction,
} from "@/actions/profile.actions";
import { CardGridSelect } from "@/components/ui/card-grid-select";
import { ProfileOverview } from "@/components/profile/ProfileOverview";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";

interface ProfileFormProps {
  userEmail?: string;
  userName?: string;
  initialResumeText?: string;
  initialSkills?: string[];
  initialAiProvider?: string;
}

export function ProfileForm({
  userEmail = "",
  userName = "Candidate",
  initialResumeText = "",
  initialSkills = [],
  initialAiProvider = "gemini",
}: ProfileFormProps) {
  const [resumeText, setResumeText] = useState(initialResumeText);
  const [skills, setSkills] = useState(initialSkills.join(", "));
  const [aiProvider, setAiProvider] = useState(initialAiProvider);
  const [isEditing, setIsEditing] = useState(!initialResumeText.trim());
  const [isReformatting, setIsReformatting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedSkillsList = skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSaveText = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append("resumeText", resumeText);
    formData.append("skills", skills);
    formData.append("aiProvider", aiProvider);

    const res = await saveProfileTextAction(formData);
    setIsSubmitting(false);

    if (res.success) {
      setIsEditing(false);
      setStatusMsg({
        type: "success",
        text: "Candidate profile settings saved!",
      });
    } else {
      setStatusMsg({
        type: "error",
        text: res.error || "Failed to update profile.",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await uploadResumeFileAction(formData);
    setIsSubmitting(false);

    if (res.success && res.data) {
      setResumeText(res.data.resumeText);
      if (Array.isArray(res.data.skills) && res.data.skills.length > 0) {
        setSkills(res.data.skills.join(", "));
      }
      setIsEditing(false);
      setStatusMsg({
        type: "success",
        text: `Successfully uploaded & formatted resume text with Gemini AI!`,
      });
    } else {
      setStatusMsg({
        type: "error",
        text: res.error || "Failed to upload or parse resume document.",
      });
    }
  };

  const handleReformatWithGemini = async () => {
    setIsReformatting(true);
    setStatusMsg(null);

    const res = await reformatProfileWithGeminiAction();
    setIsReformatting(false);

    if (res.success && res.data) {
      setResumeText(res.data.resumeText);
      if (Array.isArray(res.data.skills) && res.data.skills.length > 0) {
        setSkills(res.data.skills.join(", "));
      }
      setAiProvider("gemini");
      setStatusMsg({
        type: "success",
        text: "Profile successfully reformatted & updated using Google Gemini AI!",
      });
    } else {
      setStatusMsg({
        type: "error",
        text: res.error || "Failed to reformat profile with Gemini AI.",
      });
    }
  };

  const handleDeleteResume = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your resume from your candidate profile? You can upload a new one immediately.",
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    const res = await deleteResumeAction();
    setIsSubmitting(false);

    if (res.success) {
      setResumeText("");
      setSkills("");
      setIsEditing(true);
      setStatusMsg({
        type: "success",
        text: "Resume deleted. Please upload a new resume below.",
      });
    } else {
      setStatusMsg({
        type: "error",
        text: res.error || "Failed to delete resume.",
      });
    }
  };

  // If user has provided resume & not currently editing -> render profile view!
  if (!isEditing && resumeText.trim()) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex justify-between items-center ${
              statusMsg.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            }`}
          >
            <span>
              {statusMsg.type === "success" ? "✅ " : "⚠️ "}
              {statusMsg.text}
            </span>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-xs font-bold opacity-75 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-start gap-12 pt-4">
          <ProfileOverview
            name={
              userName || (userEmail ? userEmail.split("@")[0] : "Candidate")
            }
            headline={
              parsedSkillsList.length > 0
                ? `${parsedSkillsList.slice(0, 3).join(" • ")}`
                : "Candidate Profile"
            }
            location="Kinshasa, Democratic Republic of Congo"
            about={resumeText}
            skills={parsedSkillsList}
            onEditClick={() => setIsEditing(true)}
            onReformatClick={handleReformatWithGemini}
            onDeleteClick={handleDeleteResume}
            isReformatting={isReformatting}
          />

          <ProfileSidebar
            aiProvider={aiProvider}
            skillsCount={parsedSkillsList.length}
            resumeLength={resumeText.length}
          />
        </div>
      </div>
    );
  }

  // If user has NOT provided resume or clicked Edit profile -> render dark setup form!
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 rounded-3xl transition-all duration-300 shadow-xs">
        <div>
          <h2 className="text-2xl font-serif text-gray-900 dark:text-slate-100 font-medium">
            Edit Candidate Profile & AI Setup
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Upload your resume, set technical skill keywords, and choose your AI
            scoring engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {resumeText.trim() && (
            <>
              <button
                type="button"
                onClick={handleReformatWithGemini}
                disabled={isReformatting}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition disabled:opacity-50 shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                {isReformatting ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>Gemini Reformatting...</span>
                  </>
                ) : (
                  <>
                    <span>✨ Reformat with Gemini</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-white dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 text-gray-800 dark:text-zinc-300 font-medium text-xs px-4 py-2.5 rounded-xl transition hover:border-slate-400 dark:hover:border-zinc-700 cursor-pointer shadow-xs"
              >
                Cancel & View Profile
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleSaveText}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition disabled:opacity-50 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            {isSubmitting ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex justify-between items-center ${
            statusMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <span>
            {statusMsg.type === "success" ? "✅ " : "⚠️ "}
            {statusMsg.text}
          </span>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-xs font-bold opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column: AI & Skills */}
        <div className="lg:col-span-2 bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 rounded-3xl space-y-6 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
              1. AI Engine Provider
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Select model for scoring match confidence.
            </p>
          </div>

          <CardGridSelect
            title="AI Engine"
            value={aiProvider}
            options={[
              { id: "claude", label: "Claude" },
              { id: "gemini", label: "Gemini" },
              { id: "openai", label: "OpenAI" },
            ]}
            onChange={(val) => setAiProvider(val)}
            accentColor="indigo"
          />

          <div className="pt-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
              Technical Skills (Comma Separated)
            </label>
            <textarea
              rows={4}
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="TypeScript, React, Next.js, Node.js, PostgreSQL"
              className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs font-medium rounded-xl p-3 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 shadow-xs"
            />
          </div>
        </div>

        {/* Right Column: Resume Upload & Plain Text */}
        <div className="lg:col-span-3 bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 rounded-3xl space-y-5 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
              2. Upload or Paste Resume
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Upload PDF / DOCX file or edit text directly to generate profile.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-300 dark:border-zinc-800/80 p-6 rounded-2xl bg-slate-50/50 dark:bg-[#18181B]/50 flex flex-col items-center justify-center gap-2 hover:border-blue-500 transition cursor-pointer">
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer hover:text-blue-500 transition flex items-center gap-2">
              <span className="text-base">📄</span>
              <span>Upload PDF or DOCX Resume</span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileUpload}
                disabled={isSubmitting}
                className="hidden"
              />
            </label>
            <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-mono">
              Auto text parsing enabled
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
              Resume Text Content
            </label>
            <textarea
              rows={12}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste plain text resume or work experience here..."
              className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs font-mono rounded-xl p-3.5 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 leading-relaxed shadow-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
