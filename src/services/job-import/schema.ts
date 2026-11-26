import { z } from "zod";

/** Strict schema for AI structured output (no optional/default properties for provider compatibility). */
export const aiExtractedJobSchema = z.object({
  title: z
    .string()
    .describe("Canonical job title, or empty string if not found."),
  company: z
    .string()
    .describe("Hiring company or organization name, or empty string if not found."),
  location: z
    .string()
    .describe("City, region, or country of the role, or empty string if not found."),
  // Gemini rejects empty-string enum members in response_schema, so use an explicit
  // "unspecified" sentinel; normalizeExtractedJobFields maps it back to "".
  workplaceType: z
    .enum(["unspecified", "remote", "hybrid", "on-site"])
    .describe("Workplace arrangement if stated, otherwise 'unspecified'."),
  rawSalaryText: z
    .string()
    .describe("Salary, compensation, or stipend text as stated, or empty string."),
  language: z
    .enum(["en", "fr"])
    .describe("Primary language of the job posting: 'en' for English, 'fr' for French."),
  url: z
    .string()
    .describe("Direct application or job posting URL if present, otherwise empty string."),
  description: z
    .string()
    .describe(
      "Clean, readable full job description preserving responsibilities, requirements, and qualifications in the original language."
    ),
});

export const extractedJobFieldsSchema = z.object({
  title: z.string().trim().max(250).default(""),
  company: z.string().trim().max(200).default(""),
  location: z.string().trim().max(200).default(""),
  workplaceType: z.enum(["", "remote", "hybrid", "on-site"]).default(""),
  rawSalaryText: z.string().trim().max(150).default(""),
  language: z.enum(["en", "fr"]).default("en"),
  url: z.string().trim().max(2000).default(""),
  description: z.string().trim().max(30000).default(""),
});

export type ExtractedJobFields = z.infer<typeof extractedJobFieldsSchema>;

export type JobExtractionMethod =
  | "json"
  | "url_structured"
  | "ai_url"
  | "ai_text"
  | "ai_file";

export interface ExtractedJobResult {
  fields: ExtractedJobFields;
  method: JobExtractionMethod;
  creditsUsed: number;
}

export type SmartPasteKind = "empty" | "json" | "url" | "text";

/**
 * Detects whether a pasted string is JSON, a single URL, or raw unstructured job text.
 */
export function detectSmartPasteType(raw: string): SmartPasteKind {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "empty";
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (
        (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) ||
        (Array.isArray(parsed) &&
          parsed.length > 0 &&
          typeof parsed[0] === "object" &&
          parsed[0] !== null)
      ) {
        return "json";
      }
    } catch {
      // Not valid JSON — fall through to URL/text detection.
    }
  }

  if (!/[\r\n]/.test(trimmed) && /^https?:\/\/\S+$/i.test(trimmed)) {
    try {
      const parsedUrl = new URL(trimmed);
      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        return "url";
      }
    } catch {
      // Invalid URL — treat as raw text.
    }
  }

  return "text";
}

/** Normalizes and clamps extracted job fields to safe form boundaries. */
export function normalizeExtractedJobFields(
  input: Partial<Omit<ExtractedJobFields, "workplaceType">> & {
    workplaceType?: string;
  }
): ExtractedJobFields {
  return {
    title: (input.title ?? "").trim().slice(0, 250),
    company: (input.company ?? "").trim().slice(0, 200),
    location: (input.location ?? "").trim().slice(0, 200),
    workplaceType:
      input.workplaceType === "remote" ||
      input.workplaceType === "hybrid" ||
      input.workplaceType === "on-site"
        ? input.workplaceType
        : "",
    rawSalaryText: (input.rawSalaryText ?? "").trim().slice(0, 150),
    language: input.language === "fr" ? "fr" : "en",
    url: (input.url ?? "").trim().slice(0, 2000),
    description: (input.description ?? "").trim().slice(0, 30000),
  };
}
