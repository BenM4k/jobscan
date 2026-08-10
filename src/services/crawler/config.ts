export interface ATSCompanyConfig {
  boardToken: string;
  companyName: string;
}

/**
 * Configuration for ATS per-company crawling.
 * Add company board tokens/slugs here to monitor specific organization job boards.
 * 
 * Example:
 * export const GREENHOUSE_COMPANIES: ATSCompanyConfig[] = [
 *   { boardToken: "monusco", companyName: "MONUSCO" },
 * ];
 */

export const GREENHOUSE_COMPANIES: ATSCompanyConfig[] = [];
export const LEVER_COMPANIES: ATSCompanyConfig[] = [];
export const ASHBY_COMPANIES: ATSCompanyConfig[] = [];
