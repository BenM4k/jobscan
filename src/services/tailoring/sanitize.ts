/**
 * Text sanitation helpers shared by the resume and cover-letter prompt builders.
 * Contact details are redacted before text is sent to an LLM and re-inserted
 * deterministically afterwards, so PII never leaves the server.
 */

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// Broad phone candidate; validated by digit count so year ranges (e.g. "2018-2020") survive.
const PHONE_CANDIDATE_PATTERN = /\+?\(?\d[\d\s().-]{7,}\d/g;
const MIN_PHONE_DIGITS = 9;

const MAX_JOB_DESCRIPTION_CHARS = 12_000;

function isLikelyPhone(candidate: string): boolean {
  return candidate.replace(/\D/g, "").length >= MIN_PHONE_DIGITS;
}

/** Redacts emails and phone numbers while preserving dates and other numbers. */
export function sanitizeResumeForScoring(resumeText: string): string {
  return resumeText
    .replace(EMAIL_PATTERN, "[email]")
    .replace(PHONE_CANDIDATE_PATTERN, (match) =>
      isLikelyPhone(match) ? "[phone]" : match
    );
}

export interface ContactDetails {
  email?: string;
  phone?: string;
}

/** Extracts the first email and phone number from the original (unredacted) resume. */
export function extractContactDetails(resumeText: string): ContactDetails {
  const email = resumeText.match(EMAIL_PATTERN)?.[0];
  const phone = resumeText
    .match(PHONE_CANDIDATE_PATTERN)
    ?.find(isLikelyPhone)
    ?.trim();
  return { email, phone };
}

/** Converts (possibly HTML) job descriptions into bounded plain text for prompting. */
export function toPromptPlainText(
  value: string | null | undefined,
  maxChars = MAX_JOB_DESCRIPTION_CHARS
): string {
  if (!value) return "";
  const text = value
    .replace(/<\s*(br|\/p|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

/** Removes redaction placeholders the model may have echoed back. */
export function stripRedactionPlaceholders(value: string): string {
  return value
    .replace(/\[(email|phone)\]/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

