import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { getGoogleModel, ResumeProfileSchema } from "@/lib/ai";
import { z } from "zod";

const requestSchema = z.object({
  text: z.string().min(10, "Resume text must be at least 10 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid resume text" },
        { status: 400 }
      );
    }

    const { text } = parsed.data;
    const model = getGoogleModel();

    const prompt = `You are an expert ATS resume parser. Extract structured information from the candidate's resume below.

STRICT ACCURACY RULES:
- You must be 100% faithful to the source text.
- NEVER invent, extrapolate, or hallucinate companies, degrees, dates, skills, or bullet points not explicitly mentioned.
- For "summary", write a concise 2-3 sentence executive professional summary synthesizing the candidate's stated background.
- For "experience", list work experience in reverse chronological order with exact bullet points reflecting candidate achievements.
- For "education", list degrees, institutions, and dates accurately.
- For "skills", extract all technologies, languages, tools, frameworks, and domain competencies present.

CANDIDATE RESUME TEXT:
"""
${text}
"""`;

    const { object } = await generateObject({
      model,
      schema: ResumeProfileSchema,
      prompt,
    });

    return NextResponse.json({ data: object });
  } catch (error) {
    console.error("Resume extract error:", error);
    const message = error instanceof Error ? error.message : "Failed to extract structured resume profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
