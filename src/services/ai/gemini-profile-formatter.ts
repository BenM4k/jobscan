import "server-only";
import { z } from "zod";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { gateway } from "@ai-sdk/gateway";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { AI_MODEL } from "@/lib/ai";

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

const profileFormatterSchema = z.object({
  summary: z
    .string()
    .describe(
      "A concise 2-3 sentence executive summary of the candidate's core background, under 50 words"
    ),
  experiences: z
    .array(
      z.object({
        role: z.string().describe("exact job title as written"),
        company: z.string().describe("organization name only"),
        period: z
          .string()
          .describe(
            "normalized date range (e.g. 'Jan 2021 — Present' or '2018 — 2021')"
          ),
        location: z
          .string()
          .optional()
          .default("")
          .describe("<City>, <Country> or Remote"),
        description: z
          .string()
          .describe("responsibilities & key achievements in candidate's own words"),
      })
    )
    .describe(
      "Array of PAID WORK roles only, ordered most recent first. EXCLUDE education, projects, certifications, hobbies."
    ),
  extractedSkills: z
    .array(z.string())
    .describe(
      "Array of ALL technical skills, tools, frameworks, programming languages, and competencies"
    ),
  cleanFormattedResume: z
    .string()
    .describe(
      "A clean markdown text containing STRICTLY THREE SECTIONS: Summary, Work Experience, and Skills"
    ),
});

function getFormatterModel(preferredProvider?: string) {
  const provider = (
    preferredProvider ||
    process.env.AI_PROVIDER ||
    "gemini"
  ).toLowerCase();

  if (provider === "gateway") {
    const modelName = process.env.AI_GATEWAY_MODEL || "openai/gpt-4o";
    return gateway(modelName);
  }

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai("gpt-4o");
  }

  if (provider === "claude" && process.env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropic("claude-3-5-sonnet-latest");
  }

  const geminiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return google(AI_MODEL);
  }

  // Fallback to gateway if deployed with Vercel OIDC or no direct key
  return gateway(process.env.AI_GATEWAY_MODEL || "openai/gpt-4o");
}

export async function formatResumeWithGemini(
  resumeText: string,
  providerOverride?: string
): Promise<Result<FormattedProfileData, AppError>> {
  try {
    const prompt = `You are an expert executive resume reviewer and ATS profile parser.

Analyze the candidate's raw resume text below and reorganize it strictly into the requested structure.

CRITICAL SUMMARY INSTRUCTION:
- "summary": A concise 2-3 sentence executive summary of the candidate's core background, title, and key expertise. MUST BE SHORT (under 50 words). DO NOT copy the whole resume into summary!

CRITICAL INCLUSION & EXCLUSION RULES:
- INCLUDE ONLY: Professional Summary (About), Paid Work Experience, and Technical Skills.
- EXCLUDE ENTIRELY: Education (degrees, schools, GPAs), Personal / Side Projects, Certifications, Hobbies, References, Contact details (email, phone, address), or non-work experience.

SECTION RULES:
1. "summary" — A concise 2-3 sentence (max 50 words) executive summary. Prose only.
2. "experiences" — Array of PAID WORK roles only, ordered most recent first.
3. "extractedSkills" — Array of ALL technical skills, tools, frameworks, programming languages, and domain competencies mentioned.
4. "cleanFormattedResume" — A clean markdown text containing STRICTLY THREE SECTIONS: Summary, Work Experience, and Skills. DO NOT include Education or Projects.

Candidate Resume Text:
"""
${resumeText}
"""`;

    const model = getFormatterModel(providerOverride);

    const { object } = await generateObject({
      model,
      schema: profileFormatterSchema,
      prompt,
    });

    let summaryStr = object.summary ? object.summary.trim() : "";
    if (summaryStr.length > 350) {
      const sentences = summaryStr.split(/(?<=[.!?])\s+/).filter(Boolean);
      summaryStr = sentences.slice(0, 3).join(" ");
    }

    const expsList = Array.isArray(object.experiences) ? object.experiences : [];
    const skillsList = Array.isArray(object.extractedSkills)
      ? object.extractedSkills
      : [];

    let cleanResume = object.cleanFormattedResume;
    if (!cleanResume || cleanResume.trim().length === 0) {
      const summaryPart = summaryStr ? `## Summary\n${summaryStr}` : "";
      const expPart =
        expsList.length > 0
          ? `## Work Experience\n\n` +
            expsList
              .map(
                (exp) =>
                  `### ${exp.role}${exp.company ? ` — ${exp.company}` : ""}\n_${exp.period}${exp.location ? ` | ${exp.location}` : ""}_\n${exp.description}`
              )
              .join("\n\n")
          : "";
      const skillsPart =
        skillsList.length > 0 ? `## Skills\n${skillsList.join(", ")}` : "";

      cleanResume = [summaryPart, expPart, skillsPart]
        .filter(Boolean)
        .join("\n\n");
    }

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
        `AI profile formatting failed: ${message}`
      )
    );
  }
}
