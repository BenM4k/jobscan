import { CrawledJob, CrawlSourceResult } from "../types";

export function escapeLuceneQuery(query: string): string {
  if (!query) return "";
  let escaped = query.replace(/([+\-!(){}\[\]^"~*?:\\\/]|&&|\|\|)/g, "\\$1");
  escaped = escaped.replace(/\b(AND|OR|NOT)\b/g, "\\$1");
  return escaped;
}

export async function fetchReliefWebJobs(keyword?: string): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  const appName = process.env.RELIEFWEB_APP_NAME || "jobpilot";
  const url = `https://api.reliefweb.int/v2/jobs?appname=${encodeURIComponent(appName)}&limit=100`;

  const conditions: Array<{ field: string; value: string }> = [
    {
      field: "country",
      value: "Democratic Republic of the Congo",
    },
    {
      field: "status",
      value: "published",
    },
  ];

  const payload: Record<string, unknown> = {
    filter: {
      operator: "AND",
      conditions,
    },
    fields: {
      include: ["title", "body", "url", "date", "source", "country", "city"],
    },
  };

  if (keyword?.trim()) {
    payload.query = { value: escapeLuceneQuery(keyword.trim()) };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error(
          "ReliefWeb API returned 403 (Forbidden). ReliefWeb requires a pre-approved appname. Please register your appname at https://reliefweb.int/help/api and configure RELIEFWEB_APP_NAME in .env.local"
        );
      }
      throw new Error(`ReliefWeb API returned status ${res.status}`);
    }

    const data = await res.json();
    const items = data.data || [];
    const jobs: CrawledJob[] = [];

    for (const item of items) {
      const fields = item.fields || {};
      const companyName = fields.source?.[0]?.name || "ReliefWeb Partner";
      const cityName = fields.city?.[0]?.name;

      const cleanDescription = (fields.body || "No description provided.")
        .replace(/<[^>]*>?/gm, "")
        .replace(/\s+/g, " ")
        .trim();

      jobs.push({
        source: "reliefweb",
        externalId: String(item.id),
        title: fields.title || "Untitled Position",
        company: companyName,
        url: fields.url || `https://reliefweb.int/job/${item.id}`,
        description: cleanDescription,
        postedAt: fields.date?.created ? new Date(fields.date.created) : new Date(),
        country: "Democratic Republic of the Congo",
        countryCode: "CD",
        city: cityName,
        workplaceType: "on-site",
      });
    }

    return {
      jobs,
      result: {
        source: "reliefweb",
        fetched: items.length,
        matched: jobs.length,
        upserted: 0,
      },
    };
  } catch (error: unknown) {
    return {
      jobs: [],
      result: {
        source: "reliefweb",
        fetched: 0,
        matched: 0,
        upserted: 0,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
