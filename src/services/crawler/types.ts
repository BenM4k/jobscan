export interface CrawledJob {
  source: string; // 'reliefweb' | 'remoteok' | 'greenhouse' | 'lever' | 'ashby'
  externalId: string;
  title: string;
  company: string;
  url: string;
  description: string;
  postedAt?: Date;
  country?: string;
  countryCode?: string;
  city?: string;
  workplaceType?: "remote" | "on-site" | "hybrid";
  remoteRegions?: string[];
}

export interface CrawlSourceResult {
  source: string;
  fetched: number;
  matched: number;
  upserted: number;
  error?: string;
}

export interface CrawlResult {
  success: boolean;
  totalUpserted: number;
  sources: CrawlSourceResult[];
  durationMs: number;
  error?: string;
}
