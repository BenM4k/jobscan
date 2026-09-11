import { CrawledJob, CrawlSourceResult } from "../types";
import { fetchRaw, normalize } from "@/services/adapters/fecrdc.adapter";

export { fetchRaw, normalize };

export async function fetchFecRdcJobs(): Promise<{
  jobs: CrawledJob[];
  result: CrawlSourceResult;
}> {
  const rawItems = await fetchRaw();
  return {
    jobs: [],
    result: {
      source: "fecrdc",
      fetched: rawItems.length,
      matched: 0,
      upserted: 0,
    },
  };
}
