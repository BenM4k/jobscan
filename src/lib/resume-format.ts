import type { EducationItem, ExperienceItem } from "@/lib/ai";
import { formatProfileDateRange } from "@/lib/date-format";

export interface ParsedResumeSections {
  summary: string;
  skills: string[];
  education: EducationItem[];
  experience: ExperienceItem[];
}

export interface StructuredResumeData {
  summary?: string;
  skills?: string[];
  education?: EducationItem[];
  experience?: ExperienceItem[];
  rawResumeText?: string;
}

/**
 * Parses markdown resume text (e.g. sections created by saveMasterResumeAction
 * or AI formatters) into structured summary, skills, experience, and education.
 */
export function parseResumeContent(content: string): ParsedResumeSections {
  if (!content || !content.trim()) {
    return { summary: "", skills: [], education: [], experience: [] };
  }

  let summary = "";
  const skills: string[] = [];
  const education: EducationItem[] = [];
  const experience: ExperienceItem[] = [];

  // 1. Summary
  const summaryMatch = content.match(
    /##\s*(?:Professional\s+)?Summary\s*\n+([\s\S]*?)(?=\n+##\s+|$)/i
  );
  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].trim();
  }

  // 2. Skills
  const skillsMatch = content.match(
    /##\s*(?:Core\s+)?(?:Technical\s+)?Skills\s*\n+([\s\S]*?)(?=\n+##\s+|$)/i
  );
  if (skillsMatch && skillsMatch[1]) {
    const rawSkills = skillsMatch[1]
      .split(/[,•\n]+/)
      .map((s) => s.trim().replace(/^[-*]\s*/, ""))
      .filter(Boolean);
    skills.push(...Array.from(new Set(rawSkills)));
  }

  // 3. Work Experience
  const expMatch = content.match(
    /##\s*Work\s+Experience\s*\n+([\s\S]*?)(?=\n+##\s+|$)/i
  );
  if (expMatch && expMatch[1]) {
    const expBlocks = expMatch[1].split(/\n+(?=###\s+)/);
    for (const block of expBlocks) {
      const trimmed = block.trim();
      if (!trimmed.startsWith("###")) continue;

      const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
      const headerLine = lines[0].replace(/^###\s*/, "");

      let title = headerLine;
      let company = "";
      let period = "";

      const periodInParenMatch = headerLine.match(/\(([^)]+)\)$/);
      let rest = headerLine;
      if (periodInParenMatch) {
        period = periodInParenMatch[1].trim();
        rest = headerLine.replace(/\s*\([^)]+\)$/, "").trim();
      }

      const separatorMatch = rest.match(/\s+[-—–]\s+/);
      if (separatorMatch && separatorMatch.index !== undefined) {
        title = rest.slice(0, separatorMatch.index).trim();
        company = rest.slice(separatorMatch.index + separatorMatch[0].length).trim();
      }

      let bulletStartIndex = 1;
      if (lines.length > 1 && /^_[^_]+_$/.test(lines[1])) {
        const italicContent = lines[1].replace(/^_|_$/g, "").trim();
        const [p] = italicContent.split(/\s*\|\s*/);
        if (!period && p) period = p.trim();
        bulletStartIndex = 2;
      }

      const bullets: string[] = [];
      for (let i = bulletStartIndex; i < lines.length; i++) {
        const line = lines[i];
        const cleanedBullet = line.replace(/^[•\-*]\s*/, "").trim();
        if (cleanedBullet) {
          bullets.push(cleanedBullet);
        }
      }

      let cleanPeriod = period;
      if (cleanPeriod && /ENDDATE:/i.test(cleanPeriod)) {
        cleanPeriod = cleanPeriod.replace(/ENDDATE:\s*/i, " — ").trim();
      }
      cleanPeriod = cleanPeriod
        ? cleanPeriod.replace(/(?:STARTDATE|START_DATE|START)\s*:\s*/gi, "").trim()
        : "";

      const dates = cleanPeriod
        ? cleanPeriod.split(/\s*(?:—|–|\bto\b|\buntil\b)\s*|\s+-\s+/i).filter(Boolean)
        : [];

      experience.push({
        company: company || "Company",
        title: title || "Role",
        startDate: dates[0]?.trim() || undefined,
        endDate: dates.length > 1 ? dates[1]?.trim() : undefined,
        bullets:
          bullets.length > 0
            ? bullets
            : [lines.slice(bulletStartIndex).join(" ")].filter(Boolean),
      });
    }
  }

  // 4. Education
  const eduMatch = content.match(
    /##\s*Education(?:\s*&\s*Credentials)?\s*\n+([\s\S]*?)(?=\n+##\s+|$)/i
  );
  if (eduMatch && eduMatch[1]) {
    const eduLines = eduMatch[1].split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of eduLines) {
      const cleanLine = line.replace(/^[•\-*]\s*/, "").trim();
      if (!cleanLine) continue;

      let degreeAndField = cleanLine;
      let institution = "";
      let period = "";

      const parenMatch = cleanLine.match(/\(([^)]+)\)$/);
      let rest = cleanLine;
      if (parenMatch) {
        period = parenMatch[1].trim();
        rest = cleanLine.replace(/\s*\([^)]+\)$/, "").trim();
      }

      const sepParts = rest.match(/\s+[-—–]\s+/);
      if (sepParts && sepParts.index !== undefined) {
        degreeAndField = rest.slice(0, sepParts.index).trim();
        institution = rest.slice(sepParts.index + sepParts[0].length).trim();
      }

      let degree = degreeAndField;
      let field: string | undefined = undefined;
      const inMatch = degreeAndField.match(/^(.+?)\s+in\s+(.+)$/i);
      if (inMatch) {
        degree = inMatch[1].trim();
        field = inMatch[2].trim();
      }

      let cleanEduPeriod = period;
      if (cleanEduPeriod && /ENDDATE:/i.test(cleanEduPeriod)) {
        cleanEduPeriod = cleanEduPeriod.replace(/ENDDATE:\s*/i, " — ").trim();
      }
      cleanEduPeriod = cleanEduPeriod
        ? cleanEduPeriod.replace(/(?:STARTDATE|START_DATE|START)\s*:\s*/gi, "").trim()
        : "";

      const eduDates = cleanEduPeriod
        ? cleanEduPeriod.split(/\s*(?:—|–|\bto\b|\buntil\b)\s*|\s+-\s+/i).filter(Boolean)
        : [];

      education.push({
        institution: institution || "Institution",
        degree: degree || "Degree",
        field,
        startDate: eduDates[0]?.trim() || undefined,
        endDate: eduDates.length > 1 ? eduDates[1]?.trim() : undefined,
      });
    }
  }

  // Fallback: if no summary section heading exists and content doesn't start with markdown header
  if (!summary && !content.startsWith("##")) {
    const firstSection = content.split(/\n+##\s+/)[0].trim();
    if (firstSection.length > 0 && firstSection.length < 600) {
      summary = firstSection;
    }
  }

  return { summary, skills, education, experience };
}

/**
 * Formats structured resume data into standardized ATS markdown text.
 */
export function formatResumeToMarkdown(data: StructuredResumeData): string {
  if (data.rawResumeText && !data.summary && (!data.experience || data.experience.length === 0)) {
    return data.rawResumeText.trim();
  }

  const summaryBlock = data.summary?.trim()
    ? `## Professional Summary\n${data.summary.trim()}`
    : "";

  const skillsBlock = data.skills?.length
    ? `## Core Skills\n${data.skills.join(", ")}`
    : "";

  const expBlock = data.experience?.length
    ? `## Work Experience\n\n` +
      data.experience
        .map((exp) => {
          const dateRange = formatProfileDateRange(exp.startDate, exp.endDate);
          const header = `### ${exp.title} — ${exp.company}${dateRange ? ` (${dateRange})` : ""}`;
          const bullets = exp.bullets?.length
            ? exp.bullets.map((b) => `• ${b}`).join("\n")
            : "";
          return bullets ? `${header}\n${bullets}` : header;
        })
        .join("\n\n")
    : "";

  const eduBlock = data.education?.length
    ? `## Education\n\n` +
      data.education
        .map((edu) => {
          const dateRange = formatProfileDateRange(edu.startDate, edu.endDate);
          return `• ${edu.degree}${edu.field ? ` in ${edu.field}` : ""} — ${edu.institution}${dateRange ? ` (${dateRange})` : ""}`;
        })
        .join("\n")
    : "";

  const formatted = [summaryBlock, skillsBlock, expBlock, eduBlock]
    .filter(Boolean)
    .join("\n\n");

  return formatted || data.rawResumeText?.trim() || "";
}
