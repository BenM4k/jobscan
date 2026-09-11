import * as cheerio from "cheerio";

/**
 * Strips HTML tags and script/style elements from text.
 * Falls back safely to regex if HTML parsing fails.
 */
export function stripHtml(html?: string | null): string {
  if (!html) return "";
  if (!html.includes("<") && !html.includes("&")) {
    return html;
  }
  try {
    const $ = cheerio.load(html);
    $("script, style, noscript").remove();
    return $.text();
  } catch {
    return html.replace(/<[^>]+>/g, " ");
  }
}

/**
 * Strips punctuation and symbols while preserving unicode letters, digits, and spaces.
 */
export function stripPunctuation(text: string): string {
  return text.replace(/[\p{P}\p{S}]/gu, " ");
}

/**
 * Strips HTML, converts to lowercase, strips punctuation, and collapses whitespace.
 * Applies across ALL sources so hash comparability holds across scraped and clean JSON API sources.
 */
export function normalizeText(text?: string | null): string {
  if (!text) return "";
  const plain = stripHtml(text);
  const lower = plain.toLowerCase();
  const withoutPunctuation = stripPunctuation(lower);
  return withoutPunctuation.replace(/\s+/g, " ").trim();
}
