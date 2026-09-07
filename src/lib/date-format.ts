/**
 * Date formatting utilities for candidate profiles and work experience.
 */

const MONTH_MAP: Record<string, string> = {
  jan: "Jan",
  january: "Jan",
  feb: "Feb",
  february: "Feb",
  mar: "Mar",
  march: "Mar",
  apr: "Apr",
  april: "Apr",
  may: "May",
  jun: "Jun",
  june: "Jun",
  jul: "Jul",
  july: "Jul",
  aug: "Aug",
  august: "Aug",
  sep: "Sep",
  sept: "Sep",
  september: "Sep",
  oct: "Oct",
  october: "Oct",
  nov: "Nov",
  november: "Nov",
  dec: "Dec",
  december: "Dec",
};

function cleanFieldLabels(text: string): string {
  return text
    .replace(/(?:STARTDATE|START_DATE|START DATE|START|ENDDATE|END_DATE|END DATE|END)\s*:\s*/gi, "")
    .replace(/^[:\-–—\s]+|[:\-–—\s]+$/g, "")
    .trim();
}

function normalizeDatePart(datePart: string): string {
  if (!datePart) return "";
  let clean = cleanFieldLabels(datePart);

  // Normalize month names to 3-letter abbreviations
  clean = clean.replace(
    /\b(January|February|March|April|May|June|July|August|September|Sept|October|November|December)\b/gi,
    (match) => MONTH_MAP[match.toLowerCase()] || match
  );

  // Normalize "present" / "current"
  clean = clean.replace(/\b(present|current)\b/gi, "Present");

  return clean;
}

/**
 * Formats start and end dates into a clean, normalized range (e.g. "Mar 2023 – Present" or "Sep 2020 – Sep 2020").
 * Strips leaked field names like "STARTDATE:" or "ENDDATE:" and removes duplicate composite values.
 */
export function formatProfileDateRange(
  startDate?: string | null,
  endDate?: string | null
): string {
  let start = (startDate || "").trim();
  let end = (endDate || "").trim();

  // Handle malformed composite ranges duplicated to both start and end
  if (start && end && start === end) {
    if (/ENDDATE:/i.test(start) || /\s*(?:—|–|-|\bto\b|\buntil\b)\s*/i.test(start)) {
      end = "";
    }
  }

  // Handle embedded "ENDDATE:" in start or end
  if (/ENDDATE:/i.test(start)) {
    const parts = start.split(/ENDDATE:\s*/i);
    start = parts[0]?.trim() || "";
    if (!end && parts[1]) {
      end = parts[1]?.trim() || "";
    }
  }
  if (/ENDDATE:/i.test(end)) {
    end = end.replace(/ENDDATE:\s*/i, "").trim();
  }

  // If only start is present but contains a range separator, split it
  if (start && !end) {
    const sepParts = start.split(/\s*(?:—|–|-|\bto\b|\buntil\b)\s*/i).filter(Boolean);
    if (sepParts.length >= 2) {
      start = sepParts[0].trim();
      end = sepParts[1].trim();
    }
  }

  start = cleanFieldLabels(start);
  end = cleanFieldLabels(end);

  const cleanStart = normalizeDatePart(start);
  const cleanEnd = normalizeDatePart(end);

  if (cleanStart && cleanEnd) {
    return `${cleanStart} – ${cleanEnd}`;
  }

  return cleanStart || cleanEnd || "";
}
