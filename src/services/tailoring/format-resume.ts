import type { TailoredResumeData } from "@/lib/ai";
import type { TailoringLanguage } from "./resume-prompt";
import { stripRedactionPlaceholders, type ContactDetails } from "./sanitize";

/** Standard ATS-recognized section headings per output language. */
const SECTION_HEADINGS: Record<TailoringLanguage, Record<string, string>> = {
  en: {
    summary: "Professional Summary",
    skills: "Core Skills",
    experience: "Professional Experience",
    projects: "Projects",
    education: "Education",
    certifications: "Certifications",
    languages: "Languages",
  },
  fr: {
    summary: "Profil professionnel",
    skills: "Compétences clés",
    experience: "Expérience professionnelle",
    projects: "Projets",
    education: "Formation",
    certifications: "Certifications",
    languages: "Langues",
  },
};

const clean = (value: string | undefined | null): string =>
  value ? stripRedactionPlaceholders(value) : "";

const joinParts = (parts: (string | undefined | null)[], separator: string) =>
  parts.map(clean).filter(Boolean).join(separator);

function formatHeader(data: TailoredResumeData, contact: ContactDetails): string {
  const name = clean(data.header?.fullName);
  const contactLine = joinParts(
    [data.header?.location, contact.email, contact.phone, ...(data.header?.links ?? [])],
    " | "
  );
  return [name && `# ${name}`, clean(data.headline), contactLine]
    .filter(Boolean)
    .join("\n");
}

function formatSection(heading: string, body: string): string {
  return body ? `## ${heading}\n${body}` : "";
}

function formatBullets(bullets: string[]): string {
  return bullets.map(clean).filter(Boolean).map((b) => `• ${b}`).join("\n");
}

function formatExperience(data: TailoredResumeData): string {
  return data.experience
    .map((exp) => {
      const dates = joinParts([exp.startDate, exp.endDate], " – ");
      const meta = joinParts([exp.location, dates], " | ");
      return [`### ${clean(exp.title)} — ${clean(exp.company)}`, meta, formatBullets(exp.bullets)]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function formatEducation(data: TailoredResumeData): string {
  return data.education
    .map((edu) => {
      const degree = joinParts([edu.degree, edu.field], ", ");
      const dates = joinParts([edu.startDate, edu.endDate], " – ");
      return [`### ${degree} — ${clean(edu.institution)}`, dates].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

function formatProjects(data: TailoredResumeData): string {
  return data.projects
    .map((project) => [`### ${clean(project.name)}`, formatBullets(project.bullets)].join("\n"))
    .join("\n\n");
}

/** Renders structured tailoring output as a single-column, ATS-parsable text document. */
export function formatTailoredResumeText(
  data: TailoredResumeData,
  contact: ContactDetails,
  language: TailoringLanguage
): string {
  const headings = SECTION_HEADINGS[language];
  const skills = data.skills
    .filter((group) => group.items.length > 0)
    .map((group) => `${clean(group.category)}: ${group.items.map(clean).join(", ")}`)
    .join("\n");

  return [
    formatHeader(data, contact),
    formatSection(headings.summary, clean(data.summary)),
    formatSection(headings.skills, skills),
    formatSection(headings.experience, formatExperience(data)),
    formatSection(headings.projects, formatProjects(data)),
    formatSection(headings.education, formatEducation(data)),
    formatSection(headings.certifications, formatBullets(data.certifications)),
    formatSection(headings.languages, data.languages.map(clean).filter(Boolean).join(" | ")),
  ]
    .filter(Boolean)
    .join("\n\n");
}

