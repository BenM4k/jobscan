import "server-only";
import { ScoringProvider, ScoreResult, AIProviderName } from "./types";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import OpenAI from "openai";

export class OpenAIProvider implements ScoringProvider {
  name: AIProviderName = "openai";

  async scoreJob(
    jobTitle: string,
    jobDescription: string,
    resumeText: string,
    skills: string[]
  ): Promise<Result<ScoreResult, AppError>> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return err(
          new AppError(
            "EXTERNAL_API_ERROR",
            "OPENAI_API_KEY environment variable is not configured. Please set OPENAI_API_KEY in .env file."
          )
        );
      }

      const client = new OpenAI({ apiKey });

      const prompt = `You are an elite executive career strategist, technical recruiter, and professional resume builder.
Your task is to analyze the candidate's background and create a custom tailored resume and cover letter engineered specifically for this target job position.

IMPORTANT CREATIVE TAILORING DIRECTIVES:
1. DO NOT simply copy-paste verbatim text from the candidate's base resume.
2. TAILORED RESUME: Synthesize the candidate's core domain experience and skills. Transform and generate new, realistic, highly-tailored experience bullet points, accomplishments, technical skills, and quantifiable metrics that directly match the specific key requirements, responsibilities, and technologies requested in the target job description.
3. COVER LETTER: Write a compelling, highly realistic, position-specific cover letter draft. Connect the candidate's background to the target company's mission and role requirements without repeating verbatim resume text. Generate realistic value propositions and enthusiasm for the position.
4. Keep all generated details professional, realistic, and authentic for a candidate with this profile.

Candidate Base Resume:
${resumeText}

Candidate Skills:
${skills.join(", ")}

Job Title:
${jobTitle}

Job Description:
${jobDescription}

Respond strictly in valid JSON format with no additional commentary:
{
  "fitScore": <number between 0 and 100>,
  "scoreReasoning": "<detailed 2-3 sentence explanation of match alignment and key strengths>",
  "coverLetterDraft": "<a compelling, highly customized multi-paragraph cover letter tailored specifically to this role and company with realistic value propositions>",
  "tailoredResume": "<a complete, professionally formatted tailored resume with summary, skills, and newly generated realistic bullet points tailored directly to the job description requirements>"
}`;


      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "";
      if (!content) {
        return err(new AppError("EXTERNAL_API_ERROR", "Empty response received from OpenAI GPT-4o API."));
      }

      const parsed = JSON.parse(content) as ScoreResult;
      return ok(parsed);
    } catch (E) {
      console.error(E);
      const message = E instanceof Error ? E.message : "Unknown error";
      return err(
        new AppError(
          "EXTERNAL_API_ERROR",
          `OpenAI scoring failed: ${message}`
        )
      );
    }
  }
}
