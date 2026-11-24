export interface TailoredResumeRole {
  title: string;
  company: string;
  period: string;
  bullets: string[];
}

export interface TailoredResumeEducation {
  degree: string;
  institution: string;
  period: string;
}

export interface TailoredResumeProject {
  name: string;
  bullets: string[];
}

export interface TailoredResumeExtraSection {
  heading: string;
  content: string;
}

export interface TailoredResumeDocument {
  fullName: string;
  headline: string;
  contactLine: string;
  summary: string;
  skillsText: string;
  experience: TailoredResumeRole[];
  projects: TailoredResumeProject[];
  education: TailoredResumeEducation[];
  certifications: string[];
  languages: string[];
  extraSections: TailoredResumeExtraSection[];
}

type SectionKey =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "certifications"
  | "languages";

const SECTION_HEADING_MAP: Record<string, SectionKey> = {
  summary: "summary",
  "professional summary": "summary",
  "executive summary": "summary",
  profil: "summary",
  "profil professionnel": "summary",
  résumé: "summary",
  resume: "summary",
  skills: "skills",
  "core skills": "skills",
  "technical skills": "skills",
  compétences: "skills",
  "compétences clés": "skills",
  "compétences techniques": "skills",
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  "relevant experience": "experience",
  expérience: "experience",
  "expérience professionnelle": "experience",
  projects: "projects",
  projets: "projects",
  education: "education",
  formation: "education",
  études: "education",
  certifications: "certifications",
  languages: "languages",
  langues: "languages",
};

const SERIALIZED_HEADINGS: Record<"en" | "fr", Record<SectionKey, string>> = {
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

function stripBulletPrefix(line: string): string {
  return line.replace(/^[•\-*]\s*/, "").trim();
}

function splitTitlePair(raw: string): [string, string] {
  const trimmed = raw.trim();
  const leadingMatch = trimmed.match(/^(?:—|–|-|\|)\s*(.*)$/);
  if (leadingMatch) {
    return ["", leadingMatch[1].trim()];
  }
  const separators = [" — ", " – ", " - ", " | "];
  for (const sep of separators) {
    const idx = trimmed.indexOf(sep);
    if (idx !== -1) {
      return [
        trimmed.slice(0, idx).trim(),
        trimmed.slice(idx + sep.length).trim(),
      ];
    }
  }
  return [trimmed, ""];
}

function formatTitlePair(first: string, second: string): string {
  const a = first.trim();
  const b = second.trim();
  if (a && b) return `${a} — ${b}`;
  if (a) return a;
  if (b) return `— ${b}`;
  return "";
}

function parseExperienceBlock(body: string): TailoredResumeRole[] {
  const chunks = body
    .split(/(?=^###\s+)/m)
    .map((c) => c.trim())
    .filter(Boolean);

  if (chunks.length === 0) return [];

  const roles: TailoredResumeRole[] = [];
  for (const chunk of chunks) {
    const lines = chunk
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    let title = "";
    let company = "";
    let startIndex = 0;

    if (lines[0].startsWith("###")) {
      const heading = lines[0].replace(/^###\s*/, "").trim();
      [title, company] = splitTitlePair(heading);
      startIndex = 1;
    }

    let period = "";
    const bullets: string[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const isBullet = /^[•\-*]\s+/.test(line);
      if (!isBullet && !period && bullets.length === 0 && line.length <= 120) {
        period = line;
      } else {
        const cleaned = stripBulletPrefix(line);
        if (cleaned) bullets.push(cleaned);
      }
    }

    roles.push({ title, company, period, bullets });
  }

  return roles;
}

function parseProjectsBlock(body: string): TailoredResumeProject[] {
  const chunks = body
    .split(/(?=^###\s+)/m)
    .map((c) => c.trim())
    .filter(Boolean);

  const projects: TailoredResumeProject[] = [];
  for (const chunk of chunks) {
    const lines = chunk
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    let name = "";
    let startIndex = 0;
    if (lines[0].startsWith("###")) {
      name = lines[0].replace(/^###\s*/, "").trim();
      startIndex = 1;
    }

    const bullets = lines
      .slice(startIndex)
      .map(stripBulletPrefix)
      .filter(Boolean);

    if (name || bullets.length > 0) {
      projects.push({ name, bullets });
    }
  }
  return projects;
}

function parseEducationBlock(body: string): TailoredResumeEducation[] {
  const chunks = body
    .split(/(?=^###\s+)/m)
    .map((c) => c.trim())
    .filter(Boolean);

  const items: TailoredResumeEducation[] = [];
  for (const chunk of chunks) {
    const lines = chunk
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    let degree = "";
    let institution = "";
    let period = "";

    if (lines[0].startsWith("###")) {
      const heading = lines[0].replace(/^###\s*/, "").trim();
      [degree, institution] = splitTitlePair(heading);
      period = lines
        .slice(1)
        .map(stripBulletPrefix)
        .filter(Boolean)
        .join(" · ");
    } else {
      [degree, institution] = splitTitlePair(stripBulletPrefix(lines[0]));
      period = lines
        .slice(1)
        .map(stripBulletPrefix)
        .filter(Boolean)
        .join(" · ");
    }

    if (degree || institution || period) {
      items.push({ degree, institution, period });
    }
  }
  return items;
}

function parseBulletList(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((l) => stripBulletPrefix(l.trim()))
    .filter(Boolean);
}

function parseLanguagesBlock(body: string): string[] {
  return body
    .split(/[|\n,]/)
    .map((s) => stripBulletPrefix(s.trim()))
    .filter(Boolean);
}

/**
 * Parses a full tailored resume Markdown document (English or French headings)
 * into structured sections without truncating bullets or losing unknown sections.
 */
export function parseTailoredResumeDocument(
  markdown?: string | null,
): TailoredResumeDocument {
  const emptyDoc: TailoredResumeDocument = {
    fullName: "",
    headline: "",
    contactLine: "",
    summary: "",
    skillsText: "",
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    languages: [],
    extraSections: [],
  };

  const trimmed = markdown?.trim();
  if (!trimmed) return emptyDoc;

  const lines = trimmed.split(/\r?\n/);
  const h2Indices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^##(?!#)\s+/.test(lines[i].trim())) {
      h2Indices.push(i);
    }
  }

  if (h2Indices.length === 0) {
    return { ...emptyDoc, summary: trimmed };
  }

  // Parse header block before first ## heading
  const headerLines = lines
    .slice(0, h2Indices[0])
    .map((l) => l.trim())
    .filter(Boolean);
  let fullName = "";
  let headline = "";
  let contactLine = "";

  for (const line of headerLines) {
    if (!fullName && /^#(?!#)\s+/.test(line)) {
      fullName = line.replace(/^#\s+/, "").trim();
    } else if (!headline && !line.includes("|")) {
      headline = line;
    } else if (!contactLine) {
      contactLine = line;
    } else {
      contactLine = `${contactLine} | ${line}`;
    }
  }

  const doc: TailoredResumeDocument = {
    ...emptyDoc,
    fullName,
    headline,
    contactLine,
  };

  for (let idx = 0; idx < h2Indices.length; idx++) {
    const start = h2Indices[idx];
    const end = idx + 1 < h2Indices.length ? h2Indices[idx + 1] : lines.length;
    const rawHeading = lines[start]
      .trim()
      .replace(/^##\s+/, "")
      .trim();
    const body = lines
      .slice(start + 1, end)
      .join("\n")
      .trim();
    if (!body) continue;

    const mapped = SECTION_HEADING_MAP[rawHeading.toLowerCase()];
    switch (mapped) {
      case "summary":
        doc.summary = doc.summary ? `${doc.summary}\n\n${body}` : body;
        break;
      case "skills":
        doc.skillsText = doc.skillsText ? `${doc.skillsText}\n${body}` : body;
        break;
      case "experience":
        doc.experience.push(...parseExperienceBlock(body));
        break;
      case "projects":
        doc.projects.push(...parseProjectsBlock(body));
        break;
      case "education":
        doc.education.push(...parseEducationBlock(body));
        break;
      case "certifications":
        doc.certifications.push(...parseBulletList(body));
        break;
      case "languages":
        doc.languages.push(...parseLanguagesBlock(body));
        break;
      default:
        doc.extraSections.push({ heading: rawHeading, content: body });
        break;
    }
  }

  return doc;
}

/**
 * Serializes a structured TailoredResumeDocument back into ATS-friendly Markdown.
 */
export function serializeTailoredResumeDocument(
  doc: TailoredResumeDocument,
  language: "en" | "fr" = "en",
): string {
  const headings = SERIALIZED_HEADINGS[language];
  const sections: string[] = [];

  const headerParts = [
    doc.fullName.trim() ? `# ${doc.fullName.trim()}` : "",
    doc.headline.trim(),
    doc.contactLine.trim(),
  ].filter(Boolean);
  if (headerParts.length > 0) {
    sections.push(headerParts.join("\n"));
  }

  if (doc.summary.trim()) {
    sections.push(`## ${headings.summary}\n${doc.summary.trim()}`);
  }

  if (doc.skillsText.trim()) {
    sections.push(`## ${headings.skills}\n${doc.skillsText.trim()}`);
  }

  if (doc.experience.length > 0) {
    const expBlocks = doc.experience
      .filter(
        (r) =>
          r.title.trim() || r.company.trim() || r.bullets.some((b) => b.trim()),
      )
      .map((role) => {
        const heading = formatTitlePair(role.title, role.company);
        const bullets = role.bullets
          .map((b) => b.trim())
          .filter(Boolean)
          .map((b) => `• ${b}`)
          .join("\n");
        return [heading ? `### ${heading}` : "", role.period.trim(), bullets]
          .filter(Boolean)
          .join("\n");
      })
      .filter(Boolean);

    if (expBlocks.length > 0) {
      sections.push(`## ${headings.experience}\n${expBlocks.join("\n\n")}`);
    }
  }

  if (doc.projects.length > 0) {
    const projectBlocks = doc.projects
      .filter((p) => p.name.trim() || p.bullets.some((b) => b.trim()))
      .map((proj) => {
        const bullets = proj.bullets
          .map((b) => b.trim())
          .filter(Boolean)
          .map((b) => `• ${b}`)
          .join("\n");
        return [proj.name.trim() ? `### ${proj.name.trim()}` : "", bullets]
          .filter(Boolean)
          .join("\n");
      })
      .filter(Boolean);

    if (projectBlocks.length > 0) {
      sections.push(`## ${headings.projects}\n${projectBlocks.join("\n\n")}`);
    }
  }

  if (doc.education.length > 0) {
    const eduBlocks = doc.education
      .filter((e) => e.degree.trim() || e.institution.trim() || e.period.trim())
      .map((edu) => {
        const heading = formatTitlePair(edu.degree, edu.institution);
        return [heading ? `### ${heading}` : "", edu.period.trim()]
          .filter(Boolean)
          .join("\n");
      })
      .filter(Boolean);

    if (eduBlocks.length > 0) {
      sections.push(`## ${headings.education}\n${eduBlocks.join("\n\n")}`);
    }
  }

  const certs = doc.certifications.map((c) => c.trim()).filter(Boolean);
  if (certs.length > 0) {
    sections.push(
      `## ${headings.certifications}\n${certs.map((c) => `• ${c}`).join("\n")}`,
    );
  }

  const langs = doc.languages.map((l) => l.trim()).filter(Boolean);
  if (langs.length > 0) {
    sections.push(`## ${headings.languages}\n${langs.join(" | ")}`);
  }

  for (const extra of doc.extraSections) {
    if (extra.heading.trim() && extra.content.trim()) {
      sections.push(`## ${extra.heading.trim()}\n${extra.content.trim()}`);
    }
  }

  return sections.join("\n\n");
}

/** Counts words in a plain or Markdown text draft. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
