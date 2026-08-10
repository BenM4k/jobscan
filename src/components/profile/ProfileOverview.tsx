"use client";

import React from "react";

interface ProfileOverviewProps {
  name: string;
  headline: string;
  location: string;
  about: string;
  skills: string[];
  onEditClick: () => void;
  onReformatClick?: () => void;
  onDeleteClick?: () => void;
  isReformatting?: boolean;
}

function parseProfileSections(rawText: string) {
  if (!rawText) {
    return { summaryText: "", experienceBlocks: [] };
  }

  const hasWorkExpHeader = /##\s*Work Experience/i.test(rawText);
  const hasSummaryHeader = /##\s*Summary/i.test(rawText);

  if (hasWorkExpHeader || hasSummaryHeader) {
    const workExpSplit = rawText.split(/##\s*Work Experience/i);
    const summarySection = workExpSplit[0] || "";
    const summaryText = summarySection
      .replace(/##\s*Summary/i, "")
      .replace(/##\s*Skills[\s\S]*/i, "")
      .trim();

    const afterWorkExp = workExpSplit[1] || "";
    const expOnlyText = afterWorkExp.split(/##\s*Skills/i)[0] || "";

    const experienceBlocks: { title: string; subtitle?: string; content: string }[] = [];
    const roleBlocks = expOnlyText.split(/###\s+/).filter(Boolean);

    roleBlocks.forEach((block) => {
      const lines = block.trim().split("\n");
      const titleLine = lines[0] || "";
      const subtitleLine = lines[1] && lines[1].startsWith("_") ? lines[1].replace(/_/g, "").trim() : undefined;
      const contentLines = lines.slice(subtitleLine ? 2 : 1).join("\n").trim();

      if (titleLine) {
        experienceBlocks.push({
          title: titleLine,
          subtitle: subtitleLine,
          content: contentLines,
        });
      }
    });

    let finalSummary = summaryText;
    if (finalSummary.length > 350) {
      const sentences = finalSummary.split(/(?<=[.!?])\s+/).filter(Boolean);
      finalSummary = sentences.slice(0, 3).join(" ");
    }

    return { summaryText: finalSummary, experienceBlocks };
  }

  // Fallback for raw text without headers: extract only 2-3 sentences as summary
  const sentences = rawText.split(/(?<=[.!?])\s+/).filter(Boolean);
  let summaryText = sentences.slice(0, 3).join(" ");
  if (summaryText.length > 350) {
    summaryText = summaryText.slice(0, 300) + "...";
  }

  const remainingText = rawText.slice(summaryText.length).trim();
  const paragraphs = remainingText.split("\n\n").map((p) => p.trim()).filter(Boolean);
  const experienceBlocks: { title: string; subtitle?: string; content: string }[] = paragraphs.map((p, i) => ({
    title: `Work History ${i + 1}`,
    subtitle: undefined,
    content: p,
  }));

  return { summaryText, experienceBlocks };
}

export function ProfileOverview({
  name,
  headline,
  location,
  about,
  skills,
  onEditClick,
  onReformatClick,
  onDeleteClick,
  isReformatting = false,
}: ProfileOverviewProps) {
  const { summaryText, experienceBlocks } = parseProfileSections(about);

  return (
    <article
      aria-label="Candidate Profile Overview"
      className="space-y-10 flex-1 min-w-0"
    >
      {/* Candidate Hero Header matching mockup 2 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-300 dark:border-zinc-800/80">
        <div className="flex items-center gap-5">
          {/* Avatar square box */}
          <div
            aria-hidden="true"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/80 text-white font-serif text-3xl font-bold flex items-center justify-center shrink-0 shadow-lg relative"
          >
            <span>{name.slice(0, 2).toUpperCase()}</span>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center text-[10px]">
              ✓
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-serif text-gray-900 dark:text-slate-100 font-medium">
              {name}
            </h1>
            <p className="text-xs text-gray-600 dark:text-zinc-400 font-medium">
              {headline}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-gray-500 dark:text-zinc-400">
              <span>📍 {location}</span>
              <span>• 🌐 Open to remote</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
                />
                Open to new opportunities
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2.5 shrink-0">
          {onReformatClick && (
            <button
              onClick={onReformatClick}
              disabled={isReformatting}
              aria-busy={isReformatting}
              aria-label="Reformat profile with Gemini AI"
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-50 shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            >
              {isReformatting ? (
                <>
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full bg-white animate-ping"
                  />
                  <span>Gemini Reformatting...</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true">✨</span>
                  <span>Reformat with Gemini</span>
                </>
              )}
            </button>
          )}

          {/* Action Icons Row Underneath */}
          <div className="flex items-center gap-2">
            {onDeleteClick && (
              <button
                onClick={onDeleteClick}
                className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm p-2.5 rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
                title="Delete Resume & Upload New"
                aria-label="Delete Resume & Upload New"
              >
                🗑️
              </button>
            )}

            <button
              onClick={() => {
                if (typeof window !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Profile URL copied to clipboard!");
                }
              }}
              className="bg-white dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 text-gray-800 dark:text-zinc-300 text-sm p-2.5 rounded-xl hover:border-slate-400 dark:hover:border-zinc-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shadow-xs"
              title="Share Profile"
              aria-label="Share Profile"
            >
              🔗
            </button>

            <button
              onClick={onEditClick}
              className="bg-white dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-sm p-2.5 rounded-xl hover:border-slate-400 dark:hover:border-zinc-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shadow-xs"
              title="Edit Profile"
              aria-label="Edit Profile"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>

      {/* About Section */}
      <section aria-labelledby="about-heading" className="space-y-3">
        <h2
          id="about-heading"
          className="text-lg font-serif text-gray-900 dark:text-slate-100 font-medium"
        >
          About
        </h2>
        <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed max-w-2xl whitespace-pre-wrap">
          {summaryText ||
            "No plain text about summary provided yet. Upload or edit your resume text to generate candidate highlights automatically."}
        </p>
      </section>

      {/* Experience & Work History Section */}
      <div className="space-y-5 pt-2">
        <h2 className="text-lg font-serif text-gray-900 dark:text-slate-100 font-medium">
          Experience
        </h2>

        {experienceBlocks.length > 0 ? (
          <div className="space-y-6 border-l border-slate-300 dark:border-zinc-800 pl-4 ml-1">
            {experienceBlocks.map((block, idx) => (
              <div key={idx} className="relative space-y-1">
                <span
                  className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-black ${idx === 0 ? "bg-emerald-500" : "bg-zinc-600"}`}
                />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-1">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-slate-200">
                    {block.title}
                  </h3>
                  {block.subtitle && (
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium italic">
                      {block.subtitle}
                    </span>
                  )}
                </div>
                {block.content && (
                  <p className="text-xs text-gray-600 dark:text-zinc-400 pt-0.5 leading-relaxed whitespace-pre-wrap">
                    {block.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            No work experience details found in candidate profile.
          </p>
        )}
      </div>

      {/* Skills Section */}
      <div className="space-y-3 pt-2">
        <h2 className="text-lg font-serif text-gray-900 dark:text-slate-100 font-medium">
          Skills
        </h2>
        <div className="flex flex-wrap gap-2">
          {skills.length > 0 ? (
            skills.map((skill, idx) => (
              <span
                key={idx}
                className="text-xs bg-white dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 px-3 py-1.5 rounded-xl font-medium shadow-xs"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400 italic">
              No skills listed yet.
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
