import "server-only";
import * as cheerio from "cheerio";

const ALLOWED_TAGS = new Set([
  "p",
  "b",
  "strong",
  "i",
  "em",
  "ul",
  "ol",
  "li",
  "br",
]);

const STRIP_WITH_CONTENT = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "form",
  "input",
  "textarea",
  "select",
  "button",
  "noscript",
]);

function cleanElement(
  $: cheerio.CheerioAPI,
  el: Parameters<cheerio.CheerioAPI>[0]
): void {
  const $el = $(el);

  for (const child of $el.children().toArray()) {
    cleanElement($, child);
  }

  // Strip HTML comments inside kept elements
  $el
    .contents()
    .filter((_, node) => node.type === "comment")
    .remove();

  const tagName = (el as { tagName?: string }).tagName?.toLowerCase();
  if (!tagName) return;

  if (STRIP_WITH_CONTENT.has(tagName)) {
    $el.remove();
    return;
  }

  if (!ALLOWED_TAGS.has(tagName)) {
    $el.replaceWith($el.contents());
    return;
  }

  const attribs = (el as { attribs?: Record<string, string> }).attribs;
  if (attribs) {
    for (const attr of Object.keys(attribs)) {
      $el.removeAttr(attr);
    }
  }
}

/**
 * Deterministically sanitizes job description HTML on the server using a strict tag allowlist
 * (p, b, strong, i, em, ul, ol, li, br) and stripping all attributes and active elements.
 */
export function sanitizeJobDescriptionHtml(rawHtml?: string | null): string {
  if (!rawHtml) return "";

  const $ = cheerio.load(rawHtml, null, false);
  const root = $.root();

  for (const child of root.children().toArray()) {
    cleanElement($, child);
  }

  root
    .contents()
    .filter((_, node) => node.type === "comment")
    .remove();

  return root.html() ?? "";
}
