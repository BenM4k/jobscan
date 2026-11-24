export interface ATSCompanyConfig {
  boardToken: string;
  companyName: string;
}

/**
 * Parses comma-separated `token:Company Name` pairs from environment config.
 */
export function parseAtsCompanyList(raw?: string): ATSCompanyConfig[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const idx = entry.indexOf(":");
      if (idx === -1) {
        return { boardToken: entry, companyName: entry };
      }
      const boardToken = entry.slice(0, idx).trim();
      const companyName = entry.slice(idx + 1).trim() || boardToken;
      return { boardToken, companyName };
    })
    .filter((item) => Boolean(item.boardToken));
}

export const GREENHOUSE_COMPANIES: ATSCompanyConfig[] = parseAtsCompanyList(
  process.env.ATS_GREENHOUSE_BOARDS
);
export const LEVER_COMPANIES: ATSCompanyConfig[] = parseAtsCompanyList(
  process.env.ATS_LEVER_BOARDS
);
export const ASHBY_COMPANIES: ATSCompanyConfig[] = parseAtsCompanyList(
  process.env.ATS_ASHBY_BOARDS
);
