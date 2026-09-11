export interface ParsedTailoredResume {
  summary: string;
  experience: string[];
}

export function parseTailoredResume(
  text?: string | null,
  structured?: unknown
): ParsedTailoredResume {
  if (structured && typeof structured === "object") {
    const s = structured as Record<string, unknown>;
    const summary = typeof s.summary === "string" ? s.summary : "";
    const experience: string[] = [];

    if (Array.isArray(s.experience)) {
      for (const item of s.experience) {
        if (item && Array.isArray(item.bullets)) {
          for (const b of item.bullets) {
            if (typeof b === "string" && b.trim()) {
              experience.push(b.trim().replace(/^[•\-\*]\s*/, ""));
              if (experience.length >= 2) break;
            }
          }
        }
        if (experience.length >= 2) break;
      }
    }

    if (summary || experience.length > 0) {
      return {
        summary: summary || "Tailored summary aligned to this position.",
        experience,
      };
    }
  }

  if (!text) {
    return { summary: "", experience: [] };
  }

  let summary = "";
  const experience: string[] = [];

  const summaryMatch = text.match(/##\s*Summary\s*([\s\S]*?)(?=##|$)/i);
  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].trim();
  }

  const expMatch = text.match(
    /##\s*(?:Work Experience|Experience|Relevant Experience)\s*([\s\S]*?)(?=##|$)/i
  );
  if (expMatch && expMatch[1]) {
    const lines = expMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    for (const line of lines) {
      const clean = line.replace(/^[•\-\*]\s*/, "");
      if (clean) {
        experience.push(clean);
        if (experience.length >= 2) break;
      }
    }
  }

  if (!summary && !experience.length) {
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length > 0) {
      summary = paragraphs[0];
      if (paragraphs.length > 1) {
        for (let i = 1; i < Math.min(paragraphs.length, 3); i++) {
          experience.push(paragraphs[i].replace(/^[•\-\*]\s*/, ""));
        }
      }
    }
  }

  return {
    summary: summary || text,
    experience,
  };
}
