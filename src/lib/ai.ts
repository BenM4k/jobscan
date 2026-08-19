import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

/**
 * Pinned AI Model Constant for Job Pilot
 * All Gemini calls (extraction, scoring, resume tailoring, cover letter generation)
 * must use this centralized constant.
 */
export const AI_MODEL = "gemini-3.6-flash";

export function getGoogleModel() {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is not configured in environment variables."
    );
  }

  const google = createGoogleGenerativeAI({ apiKey });
  return google(AI_MODEL);
}

// ---------------------------------------------------------------------------
// Schemas for AI Structured Generation
// ---------------------------------------------------------------------------

export const EducationItemSchema = z.object({
  institution: z.string().describe("Name of the university, college, or school"),
  degree: z.string().describe("Degree or diploma obtained (e.g. B.S., M.S., High School)"),
  field: z.string().optional().describe("Field of study or major"),
  startDate: z.string().optional().describe("Start date (e.g. 2018 or Sep 2018)"),
  endDate: z.string().optional().describe("End date or 'Present'"),
});

export const ExperienceItemSchema = z.object({
  company: z.string().describe("Company or organization name"),
  title: z.string().describe("Job title / role"),
  startDate: z.string().optional().describe("Start date"),
  endDate: z.string().optional().describe("End date or 'Present'"),
  bullets: z.array(z.string()).describe("List of accomplishment / responsibility bullet points"),
});

export const ResumeProfileSchema = z.object({
  summary: z.string().describe("2-3 sentence professional summary"),
  skills: z.array(z.string()).describe("List of technical and professional skills"),
  education: z.array(EducationItemSchema).describe("List of educational credentials"),
  experience: z.array(ExperienceItemSchema).describe("List of work experiences"),
});

export type ResumeProfileData = z.infer<typeof ResumeProfileSchema>;
export type EducationItem = z.infer<typeof EducationItemSchema>;
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;

export const JobScoreSchema = z.object({
  overallScore: z.number().min(0).max(100).describe("Overall match score from 0 to 100"),
  matchedSkills: z.array(z.string()).describe("Skills present in both the resume and the job posting"),
  missingSkills: z.array(z.string()).describe("Skills required by the job posting that are missing in the resume"),
  gaps: z.array(z.string()).describe("Experience or qualification gaps identified"),
  reasoning: z.string().describe("Detailed evaluation explanation justifying the score"),
});

export type JobScoreData = z.infer<typeof JobScoreSchema>;

export const TailoredResumeSchema = z.object({
  summary: z.string().describe("Tailored professional summary emphasizing relevance to the job"),
  skills: z.array(z.string()).describe("Re-prioritized skills relevant to the job requirements"),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      bullets: z.array(z.string()).describe("Reordered or rephrased bullets emphasizing relevance without fabrication"),
    })
  ).describe("Tailored work experience list"),
});

export type TailoredResumeData = z.infer<typeof TailoredResumeSchema>;
