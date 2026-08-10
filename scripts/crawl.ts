import { runDrcCrawler } from "../src/services/crawler/run";

async function main() {
  console.log("==========================================");
  console.log("🚀 Starting DRC Job Crawler execution...");
  console.log("==========================================\n");

  try {
    const result = await runDrcCrawler();

    console.log("------------------------------------------");
    console.log("📊 Crawl Results Summary:");
    console.log("------------------------------------------");
    for (const src of result.sources) {
      if (src.error) {
        console.log(` ❌ [${src.source.toUpperCase()}] Error: ${src.error}`);
      } else {
        console.log(
          ` ✅ [${src.source.toUpperCase()}] Fetched: ${src.fetched} | Matched DRC: ${src.matched} | Upserted DB: ${src.upserted}`
        );
      }
    }
    console.log("------------------------------------------");
    console.log(`✨ Total Jobs Upserted: ${result.totalUpserted}`);
    console.log(`⏱️ Duration: ${result.durationMs}ms`);
    console.log("==========================================\n");

    process.exit(0);
  } catch (fatalError) {
    console.error("❌ Fatal error during DRC crawl execution:", fatalError);
    process.exit(1);
  }
}

main();
