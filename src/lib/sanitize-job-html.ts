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

const BLOCK_TAGS = new Set([
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "section",
  "article",
  "header",
  "footer",
  "aside",
  "main",
  "nav",
  "blockquote",
  "pre",
  "hr",
  "tr",
  "td",
  "th",
  "dt",
  "dd",
  "figcaption",
]);

const SELF_BREAKING_TAGS = new Set(["p", "ul", "ol", "br"]);

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

function isMeaningfulNode(node: { type?: string; data?: string }): boolean {
  if (node.type === "text") {
    return Boolean(node.data?.trim());
  }
  return node.type === "tag";
}

function getBoundaryTag(node: { type?: string; tagName?: string } | undefined): string | undefined {
  if (!node || node.type !== "tag") return undefined;
  return node.tagName?.toLowerCase();
}

function findMeaningfulSibling(
  start: { prev?: unknown; next?: unknown; type?: string; data?: string } | null | undefined,
  direction: "prev" | "next"
): { type?: string; tagName?: string; data?: string } | undefined {
  let cursor = start;
  while (cursor) {
    if (isMeaningfulNode(cursor)) {
      return cursor as { type?: string; tagName?: string; data?: string };
    }
    cursor = cursor[direction] as typeof start;
  }
  return undefined;
}

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
    if (tagName === "hr") {
      $el.replaceWith("<br>");
      return;
    }

    if (BLOCK_TAGS.has(tagName)) {
      const meaningful = $el
        .contents()
        .toArray()
        .filter((node) => isMeaningfulNode(node as { type?: string; data?: string }));

      if (meaningful.length > 0) {
        const firstTag = getBoundaryTag(meaningful[0] as { type?: string; tagName?: string });
        const lastTag = getBoundaryTag(
          meaningful[meaningful.length - 1] as { type?: string; tagName?: string }
        );

        const rawEl = el as unknown as {
          prev?: { prev?: unknown; type?: string; data?: string } | null;
          next?: { next?: unknown; type?: string; data?: string } | null;
        };
        const prevMeaningful = findMeaningfulSibling(rawEl.prev, "prev");
        const prevTag = getBoundaryTag(prevMeaningful);

        const nextMeaningful = findMeaningfulSibling(rawEl.next, "next");
        const nextTag = getBoundaryTag(nextMeaningful);

        if (
          prevMeaningful &&
          (!firstTag || !SELF_BREAKING_TAGS.has(firstTag)) &&
          (!prevTag || !SELF_BREAKING_TAGS.has(prevTag))
        ) {
          $el.prepend("<br>");
        }
        if (
          nextMeaningful &&
          (!lastTag || !SELF_BREAKING_TAGS.has(lastTag)) &&
          (!nextTag || !SELF_BREAKING_TAGS.has(nextTag))
        ) {
          $el.append("<br>");
        }
      }
    }

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
