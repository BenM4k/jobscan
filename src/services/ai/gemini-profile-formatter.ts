import "server-only";
import { GoogleGenAI } from "@google/genai";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  location?: string;
  description: string;
}

export interface FormattedProfileData {
  extractedSkills: string[];
  summary: string;
  experiences: ExperienceItem[];
  cleanFormattedResume: string;
}

export async function formatResumeWithGemini(
  resumeText: string,
): Promise<Result<FormattedProfileData, AppError>> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return err(
        new AppError(
          "EXTERNAL_API_ERROR",
          "GEMINI_API_KEY environment variable is not configured. Please set GEMINI_API_KEY in .env file.",
        ),
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an expert executive resume reviewer and ATS profile parser.

Analyze the candidate's raw resume text below and reorganize it strictly into the JSON schema provided.

CRITICAL SUMMARY INSTRUCTION:
- "summary": A concise 2-3 sentence executive summary of the candidate's core background, title, and key expertise. MUST BE SHORT (under 50 words). DO NOT copy the whole resume into summary!

CRITICAL INCLUSION & EXCLUSION RULES:
- INCLUDE ONLY: Professional Summary (About), Paid Work Experience, and Technical Skills.
- EXCLUDE ENTIRELY: Education (degrees, schools, GPAs), Personal / Side Projects, Certifications, Hobbies, References, Contact details (email, phone, address), or non-work experience.

SECTION RULES:

1. "summary" — A concise 2-3 sentence (max 50 words) executive summary. Prose only.
   EXCLUDE: full experience listings, bullet lists, skills lists, education, contact info.

2. "experiences" — Array of PAID WORK roles only, ordered most recent first.
   EXCLUDE: academic education, degrees, personal side projects, certifications,
   volunteer work (unless explicitly presented as formal employment), address, hobbies, or references.
   For each role:
   - "role": exact job title as written
   - "company": organization name only
   - "period": normalized date range (e.g. "Jan 2021 — Present" or "2018 — 2021")
   - "location": "<City>, <Country>" or "Remote" or ""
   - "description": responsibilities & key achievements in candidate's own words.

3. "extractedSkills" — Array of ALL technical skills, tools, frameworks, programming languages, and domain competencies mentioned.

4. "cleanFormattedResume" — A clean markdown text containing STRICTLY THREE SECTIONS: Summary, Work Experience, and Skills. DO NOT include Education or Projects.

Candidate Resume Text:
"""
${resumeText}
"""

Respond with ONLY valid JSON. No markdown code fences, no commentary, no text before or after the JSON object. Match this exact schema:
{
  "summary": "<short 2-3 sentence summary>",
  "experiences": [
    {
      "role": "<job title>",
      "company": "<company name>",
      "period": "<dates>",
      "location": "<location>",
      "description": "<responsibilities & achievements>"
    }
  ],
  "extractedSkills": ["<skill 1>", "<skill 2>"],
  "cleanFormattedResume": "<markdown resume>"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const text = response.text || "";
    if (!text) {
      return err(
        new AppError(
          "EXTERNAL_API_ERROR",
          "Empty response received from Google Gemini API.",
        ),
      );
    }

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as FormattedProfileData;

    let summaryStr = parsed.summary ? parsed.summary.trim() : "";
    // If Gemini returned full resume in summary by mistake, take only first 2-3 sentences
    if (summaryStr.length > 350) {
      const sentences = summaryStr.split(/(?<=[.!?])\s+/).filter(Boolean);
      summaryStr = sentences.slice(0, 3).join(" ");
    }

    const expsList = Array.isArray(parsed.experiences) ? parsed.experiences : [];
    const skillsList = Array.isArray(parsed.extractedSkills) ? parsed.extractedSkills : [];

    // Construct clean formatted resume strictly from summary, work experiences, and skills
    const summaryPart = summaryStr ? `## Summary\n${summaryStr}` : "";
    const expPart = expsList.length > 0
      ? `## Work Experience\n\n` + expsList.map((exp) => (
          `### ${exp.role}${exp.company ? ` — ${exp.company}` : ""}\n_${exp.period}${exp.location ? ` | ${exp.location}` : ""}_\n${exp.description}`
        )).join("\n\n")
      : "";
    const skillsPart = skillsList.length > 0
      ? `## Skills\n${skillsList.join(", ")}`
      : "";

    const cleanResume = [summaryPart, expPart, skillsPart].filter(Boolean).join("\n\n");

    return ok({
      extractedSkills: skillsList,
      summary: summaryStr,
      experiences: expsList,
      cleanFormattedResume: cleanResume || resumeText,
    });
  } catch (E) {
    console.error(E);
    const message = E instanceof Error ? E.message : "Unknown error";
    return err(
      new AppError(
        "EXTERNAL_API_ERROR",
        `Gemini profile formatting failed: ${message}`,
      ),
    );
  }
}
