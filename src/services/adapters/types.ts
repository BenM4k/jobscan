export interface NormalizedJob {
  externalId: string;
  source: "greenhouse" | "remoteok" | "lever" | "ashby";
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

export interface JobSource {
  id: "greenhouse" | "remoteok" | "lever" | "ashby";
  fetchRaw(target?: string): Promise<unknown[]>;
  normalize(raw: unknown): NormalizedJob;
}

