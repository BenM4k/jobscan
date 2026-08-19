import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { getGoogleModel, TailoredResumeSchema } from "@/lib/ai";
import * as jobsDal from "@/dal/jobs.dal";
import * as profileDal from "@/dal/profile.dal";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    const [jobResult, profileResult] = await Promise.all([
      jobsDal.getJobById(id),
      profileDal.getProfile(),
    ]);

    if (!jobResult.ok || !jobResult.value) {
      return NextResponse.json({ error: "Job opportunity not found" }, { status: 404 });
    }

    const job = jobResult.value;
    const userProfile = profileResult.ok ? profileResult.value : null;

    if (!userProfile || !userProfile.resumeText) {
      return NextResponse.json(
        { error: "User master resume is not configured. Please upload or save your master resume first." },
        { status: 400 }
      );
    }

    const model = getGoogleModel();

    const prompt = `You are a professional executive resume writer specializing in ATS optimization.

Your goal is to tailor the candidate's Master Resume specifically for the following job description.

CRITICAL NON-FABRICATION CONSTRAINTS:
1. Reorder, rephrase, and highlight existing accomplishments and bullets to maximize relevance to the target job.
2. DO NOT FABRICATE OR INVENT any experience, employers, job titles, education, or skills not present in the master resume.
3. Every tailored bullet point must correspond to real experience from the candidate's background.

CANDIDATE MASTER RESUME:
"""
${userProfile.summary ? `Summary: ${userProfile.summary}\n` : ""}
${userProfile.skills?.length ? `Skills: ${userProfile.skills.join(", ")}\n` : ""}
${userProfile.resumeText}
"""

TARGET JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description:
"""
${job.description || "No description provided."}
"""

${job.gaps?.length ? `Identified Skills & Gaps from Evaluation:\n- Matched: ${job.matchedSkills?.join(", ")}\n- Missing: ${job.missingSkills?.join(", ")}\n- Gaps: ${job.gaps?.join(", ")}` : ""}

INSTRUCTIONS:
- Tailor the "summary" to target this specific role and company.
- Re-order and highlight relevant "skills".
- For each role in "experience", reorder and refine bullets with active verbs and impact metrics.`;

    const { object } = await generateObject({
      model,
      schema: TailoredResumeSchema,
      prompt,
    });

    // Format clean readable text version for preview and PDF export
    const formattedSummary = object.summary ? `## Summary\n${object.summary}` : "";
    const formattedSkills = object.skills?.length ? `## Core Skills\n${object.skills.join(" • ")}` : "";
    const formattedExperience = object.experience?.length
      ? `## Work Experience\n\n` +
        object.experience
          .map(
            (exp) =>
              `### ${exp.title} — ${exp.company}\n` +
              exp.bullets.map((b) => `• ${b}`).join("\n")
          )
          .join("\n\n")
      : "";

    const tailoredResumeText = [formattedSummary, formattedSkills, formattedExperience]
      .filter(Boolean)
      .join("\n\n");

    const updateResult = await jobsDal.updateJobTailoredResume(
      job.id,
      tailoredResumeText,
      object
    );

    if (!updateResult.ok) {
      return NextResponse.json(
        { error: "Failed to persist tailored resume in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updateResult.value,
      tailoredResume: tailoredResumeText,
      structured: object,
    });
  } catch (error) {
    console.error("Tailor resume error:", error);
    const message = error instanceof Error ? error.message : "Failed to tailor resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
