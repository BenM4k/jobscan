import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { getGoogleModel, JobScoreSchema } from "@/lib/ai";
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

    const prompt = `You are a world-class senior technical recruiter and talent assessment evaluator.

Evaluate the candidate's Master Resume against the Job Posting below. Compute a rigorous qualification fit score (0-100), identify matched skills, missing skills, and potential experience gaps, and explain your reasoning clearly.

CANDIDATE MASTER RESUME:
"""
${userProfile.summary ? `Summary: ${userProfile.summary}\n` : ""}
${userProfile.skills?.length ? `Skills: ${userProfile.skills.join(", ")}\n` : ""}
${userProfile.resumeText}
"""

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Location: ${[job.city, job.countryCode || job.country].filter(Boolean).join(", ") || "Unspecified"}
Description:
"""
${job.description || "No description provided."}
"""

SCORING GUIDELINES:
- overallScore: Integer between 0 and 100 representing realistic hiring manager match percentage.
  * 85-100: Exceptional match, has all core requirements and relevant experience.
  * 70-84: Strong candidate, meets most essential requirements.
  * 50-69: Partial match, has transferable skills but noticeable gaps.
  * 0-49: Poor match, missing critical domain requirements.
- matchedSkills: Array of required/preferred technologies or competencies the candidate possesses.
- missingSkills: Array of explicitly requested technologies or requirements not evident in candidate's resume.
- gaps: Bullet list of specific experience, seniority, or qualification gaps.
- reasoning: Concise 2-3 paragraph objective assessment evaluating candidate strengths and growth areas for this specific role.`;

    const { object } = await generateObject({
      model,
      schema: JobScoreSchema,
      prompt,
    });

    const updateResult = await jobsDal.updateJobScoreBreakdown(job.id, object);

    if (!updateResult.ok) {
      return NextResponse.json(
        { error: "Failed to persist job score in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updateResult.value, score: object });
  } catch (error) {
    console.error("Job scoring error:", error);
    const message = error instanceof Error ? error.message : "Failed to score job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
