const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "B",
  "I",
  "EM",
  "STRONG",
  "UL",
  "OL",
  "LI",
]);

const BLOCK_TAGS = new Set([
  "DIV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "ASIDE",
  "MAIN",
  "NAV",
  "BLOCKQUOTE",
  "PRE",
  "HR",
  "TR",
  "TD",
  "TH",
  "DT",
  "DD",
  "FIGCAPTION",
]);

const SELF_BREAKING_TAGS = new Set(["P", "UL", "OL", "BR"]);

const BLOCKED_EXECUTABLE_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "SVG",
  "MATH",
  "FORM",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "BUTTON",
  "NOSCRIPT",
]);

function isMeaningfulDomNode(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return Boolean(node.textContent?.trim());
  }
  return node.nodeType === Node.ELEMENT_NODE;
}

function getDomTag(node: Node | undefined): string | undefined {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return undefined;
  return (node as HTMLElement).tagName.toUpperCase();
}

/**
 * Client-side DOMParser fallback sanitizer for job description HTML when server-pre-sanitized markup isn't supplied.
 */
export function sanitizeDescriptionClientFallback(rawHtml?: string | null): string {
  if (!rawHtml || typeof window === "undefined") {
    return "";
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    const cleanNode = (node: Node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.COMMENT_NODE) {
          node.removeChild(child);
          continue;
        }
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tagName = el.tagName.toUpperCase();

          if (!ALLOWED_TAGS.has(tagName)) {
            if (BLOCKED_EXECUTABLE_TAGS.has(tagName)) {
              el.remove();
              continue;
            }
            if (tagName === "HR") {
              node.replaceChild(doc.createElement("br"), el);
              continue;
            }

            const prevNodes: Node[] = [];
            for (let p = el.previousSibling; p; p = p.previousSibling) {
              if (isMeaningfulDomNode(p)) {
                prevNodes.push(p);
                break;
              }
            }
            const nextNodes: Node[] = [];
            for (let n = el.nextSibling; n; n = n.nextSibling) {
              if (isMeaningfulDomNode(n)) {
                nextNodes.push(n);
                break;
              }
            }

            const frag = doc.createDocumentFragment();
            while (el.firstChild) {
              frag.appendChild(el.firstChild);
            }
            cleanNode(frag);

            if (BLOCK_TAGS.has(tagName)) {
              const meaningful = Array.from(frag.childNodes).filter(isMeaningfulDomNode);
              if (meaningful.length > 0) {
                const firstTag = getDomTag(meaningful[0]);
                const lastTag = getDomTag(meaningful[meaningful.length - 1]);
                const prevTag = getDomTag(prevNodes[0]);
                const nextTag = getDomTag(nextNodes[0]);

                if (
                  prevNodes.length > 0 &&
                  (!firstTag || !SELF_BREAKING_TAGS.has(firstTag)) &&
                  (!prevTag || !SELF_BREAKING_TAGS.has(prevTag))
                ) {
                  frag.insertBefore(doc.createElement("br"), frag.firstChild);
                }
                if (
                  nextNodes.length > 0 &&
                  (!lastTag || !SELF_BREAKING_TAGS.has(lastTag)) &&
                  (!nextTag || !SELF_BREAKING_TAGS.has(nextTag))
                ) {
                  frag.appendChild(doc.createElement("br"));
                }
              }
            }

            node.replaceChild(frag, el);
            continue;
          }

          for (const attr of Array.from(el.attributes)) {
            el.removeAttribute(attr.name);
          }

          cleanNode(el);
        }
      }
    };

    cleanNode(doc.body);
    return doc.body.innerHTML;
  } catch {
    return "";
  }
}
