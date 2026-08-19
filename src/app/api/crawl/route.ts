import { NextRequest, NextResponse } from "next/server";
import { runDrcCrawler } from "@/services/crawler/run";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const expectedSecret = process.env.CRAWL_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing crawl secret" },
      { status: 401 }
    );
  }

  try {
    const result = await runDrcCrawler();
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to execute DRC crawl process";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
