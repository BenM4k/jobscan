import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { getGoogleModel } from "@/lib/ai";
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

    const prompt = `You are an elite executive career strategist and persuasive copywriter.

Write a compelling, tailored, high-converting Cover Letter for the candidate applying to the specific role and company below.

CRITICAL INSTRUCTIONS:
- Address the hiring manager with professional enthusiasm.
- Write 3-4 structured paragraphs:
  1. Strong hook mentioning the specific role (${job.title}) at ${job.company}, why this company excites the candidate, and an overarching value proposition.
  2. Concrete demonstration of relevant achievements from candidate's resume that directly map to the core requirements of this role. Include metrics and tangible impact.
  3. Alignment with company culture/mission and how candidate solves the team's key challenges.
  4. Confident, respectful closing call-to-action requesting an interview.
- DO NOT use generic clichés ("I am writing to express my interest...", "I am a hard worker").
- DO NOT invent employers, degrees, or skills not present in the master resume.

CANDIDATE BACKGROUND:
"""
${userProfile.summary ? `Summary: ${userProfile.summary}\n` : ""}
${userProfile.skills?.length ? `Skills: ${userProfile.skills.join(", ")}\n` : ""}
${userProfile.resumeText}
"""

JOB POSTING:
Role: ${job.title}
Company: ${job.company}
Location: ${[job.city, job.countryCode || job.country].filter(Boolean).join(", ") || "Unspecified"}
Description:
"""
${job.description || "No description provided."}
"""`;

    const result = streamText({
      model,
      prompt,
      onFinish: async ({ text }) => {
        try {
          if (text && text.trim().length > 0) {
            await jobsDal.updateJobCoverLetter(job.id, text.trim());
          }
        } catch (saveError) {
          console.error("Failed to save streamed cover letter in background:", saveError);
        }
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Cover letter stream error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate cover letter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const coverLetter = body.coverLetter;

    if (typeof coverLetter !== "string") {
      return NextResponse.json({ error: "Invalid cover letter content" }, { status: 400 });
    }

    const updateRes = await jobsDal.updateJobCoverLetter(id, coverLetter);
    if (!updateRes.ok) {
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updateRes.value });
  } catch (error) {
    console.error("Save cover letter error:", error);
    const message = error instanceof Error ? error.message : "Failed to save cover letter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
