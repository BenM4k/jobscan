import * as cheerio from "cheerio";
import { ok, err, type Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import {
  normalizeExtractedJobFields,
  type ExtractedJobFields,
} from "./schema";

type UnknownRecord = Record<string, unknown>;

function asRecord(val: unknown): UnknownRecord | null {
  return typeof val === "object" && val !== null && !Array.isArray(val)
    ? (val as UnknownRecord)
    : null;
}

function firstString(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return "";
}

/** Converts HTML fragments inside JSON-LD descriptions to readable plain text. */
export function htmlFragmentToText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  const $ = cheerio.load(trimmed);
  $("script, style, noscript, iframe, form").remove();
  $("br").replaceWith("\n");
  $("p, div, h1, h2, h3, h4, h5, h6, tr").each((_, el) => {
    $(el).append("\n");
  });
  $("li").each((_, el) => {
    $(el).prepend("• ").append("\n");
  });

  return $.text()
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeWorkplaceType(
  rawValue: unknown,
  fallbackText: string
): ExtractedJobFields["workplaceType"] {
  if (rawValue === true) return "remote";
  const str = typeof rawValue === "string" ? rawValue.trim().toLowerCase() : "";
  if (
    str.includes("telecommute") ||
    str.includes("remote") ||
    str.includes("télétravail") ||
    str.includes("teletravail")
  ) {
    return "remote";
  }
  if (str.includes("hybrid") || str.includes("hybride")) {
    return "hybrid";
  }
  if (
    str.includes("on-site") ||
    str.includes("onsite") ||
    str.includes("on site") ||
    str.includes("sur site") ||
    str.includes("présentiel")
  ) {
    return "on-site";
  }

  const lower = fallbackText.toLowerCase();
  if (/\b(fully remote|100% remote|télétravail complet)\b/.test(lower)) {
    return "remote";
  }
  return "";
}

function extractLocation(obj: UnknownRecord): string {
  const direct = firstString(obj.location, obj.city, obj.place);
  if (direct) return direct;

  const jobLocationRaw = obj.jobLocation ?? obj.location;
  const locList = Array.isArray(jobLocationRaw)
    ? jobLocationRaw
    : [jobLocationRaw];

  const parts: string[] = [];
  for (const loc of locList) {
    if (typeof loc === "string" && loc.trim()) {
      parts.push(loc.trim());
      continue;
    }
    const locObj = asRecord(loc);
    if (!locObj) continue;

    const address = asRecord(locObj.address);
    if (address) {
      const addressParts = [
        firstString(address.addressLocality),
        firstString(address.addressRegion),
        firstString(address.addressCountry),
      ].filter(Boolean);
      if (addressParts.length > 0) {
        parts.push(addressParts.join(", "));
        continue;
      }
    }

    const name = firstString(locObj.name);
    if (name) parts.push(name);
  }

  return Array.from(new Set(parts)).join(" / ");
}

function extractSalary(obj: UnknownRecord): string {
  const direct = firstString(
    obj.rawSalaryText,
    obj.salary,
    obj.salaryRange,
    obj.compensation
  );
  if (direct) return direct;

  const baseSalary = asRecord(obj.baseSalary ?? obj.estimatedSalary);
  if (!baseSalary) return "";

  const currency = firstString(baseSalary.currency);
  const valueRec = asRecord(baseSalary.value);
  const unit = firstString(valueRec?.unitText, baseSalary.unitText);

  let amountText = "";
  if (valueRec) {
    const min = valueRec.minValue;
    const max = valueRec.maxValue;
    const val = valueRec.value;
    if (min != null && max != null) {
      amountText = `${min} - ${max}`;
    } else if (val != null) {
      amountText = String(val);
    } else if (min != null) {
      amountText = `${min}+`;
    }
  } else if (
    typeof baseSalary.value === "number" ||
    typeof baseSalary.value === "string"
  ) {
    amountText = String(baseSalary.value);
  }

  if (!amountText) return "";
  return [currency, amountText, unit ? `/ ${unit.toLowerCase()}` : ""]
    .filter(Boolean)
    .join(" ");
}

function detectLanguage(rawLang: string, textSample: string): "en" | "fr" {
  const normalized = rawLang.trim().toLowerCase();
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("en")) return "en";

  const frMatches = (
    textSample
      .toLowerCase()
      .match(
        /\b(poste|mission|missions|profil|compétences|entreprise|expérience|candidature|télétravail|contrat|salaire|nous recherchons)\b/g
      ) || []
  ).length;
  return frMatches >= 2 ? "fr" : "en";
}

/**
 * Maps a Jobpilot-shaped object or `schema.org/JobPosting` object into form fields.
 */
export function mapJobObjectToFields(obj: UnknownRecord): ExtractedJobFields {
  const title = firstString(obj.title, obj.jobTitle, obj.position, obj.role, obj.name);

  const hiringOrg = asRecord(obj.hiringOrganization);
  const company = firstString(
    obj.company,
    obj.companyName,
    obj.organization,
    obj.employer,
    hiringOrg?.name
  );

  const location = extractLocation(obj);
  const rawDescription = firstString(
    obj.description,
    obj.body,
    obj.details,
    obj.summary,
    obj.responsibilities
  );
  const description = htmlFragmentToText(rawDescription);

  const workplaceType = normalizeWorkplaceType(
    obj.workplaceType ?? obj.workplace ?? obj.jobLocationType ?? obj.remote,
    `${title} ${location} ${description}`
  );

  const rawSalaryText = extractSalary(obj);
  const url = firstString(obj.url, obj.applyUrl, obj.jobUrl, obj.link, obj.sameAs);
  const rawLang = firstString(obj.language, obj.lang, obj.inLanguage);
  const language = detectLanguage(rawLang, `${title} ${description}`);

  return normalizeExtractedJobFields({
    title,
    company,
    location,
    workplaceType,
    rawSalaryText,
    language,
    url,
    description,
  });
}

/**
 * Parses pasted JSON (Jobpilot fields or schema.org/JobPosting) into extracted job fields.
 */
export function parseJobJson(
  rawJson: string
): Result<ExtractedJobFields, AppError> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson.trim());
  } catch {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Invalid JSON format. Please verify brackets and quotes."
      )
    );
  }

  const target = Array.isArray(parsed) ? asRecord(parsed[0]) : asRecord(parsed);
  if (!target) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "JSON must be an object (or non-empty array of objects) describing a job posting."
      )
    );
  }

  const fields = mapJobObjectToFields(target);
  if (!fields.title && !fields.description) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Could not find a job title or description in the pasted JSON."
      )
    );
  }

  return ok(fields);
}
