import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runDrcCrawler } from "@/services/crawler/run";

function extractCrawlSecret(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  const headerSecret = request.headers.get("x-crawl-secret");
  if (headerSecret) {
    return headerSecret.trim();
  }

  return null;
}

function isAuthorizedCrawlRequest(request: NextRequest): boolean {
  const expectedSecret = process.env.CRAWL_SECRET?.trim();
  const providedSecret = extractCrawlSecret(request);
  if (!expectedSecret || !providedSecret) {
    return false;
  }

  const expectedBuf = Buffer.from(expectedSecret, "utf8");
  const providedBuf = Buffer.from(providedSecret, "utf8");
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

async function handleCrawl(request: NextRequest) {
  if (!isAuthorizedCrawlRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing crawl secret" },
      { status: 401 }
    );
  }

  try {
    const result = await runDrcCrawler();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: unknown) {
    console.error("[API /crawl] Failed to execute DRC crawl process:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute DRC crawl process",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleCrawl(request);
}

export async function GET(request: NextRequest) {
  return handleCrawl(request);
}
