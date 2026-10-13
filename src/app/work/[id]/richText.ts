export const RICH_TEXT_PREFIX = "<!--benglish-editor-rich-text-v1-->";

const ALLOWED_TAGS = new Set([
  "B",
  "BLOCKQUOTE",
  "BR",
  "DEL",
  "DIV",
  "EM",
  "FONT",
  "I",
  "LI",
  "MARK",
  "OL",
  "P",
  "S",
  "SPAN",
  "STRIKE",
  "STRONG",
  "U",
  "UL",
]);

const ALLOWED_STYLES = new Set([
  "background-color",
  "color",
  "font-size",
  "text-align",
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeStyle(style: string) {
  return style
    .split(";")
    .map((declaration) => {
      const separator = declaration.indexOf(":");

      if (separator < 0) {
        return "";
      }

      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim();

      if (
        !ALLOWED_STYLES.has(property) ||
        /url\s*\(|expression\s*\(/i.test(value)
      ) {
        return "";
      }

      if (property === "text-align" && !/^(left|center|right|justify)$/i.test(value)) {
        return "";
      }

      if (
        property === "font-size" &&
        !/^\d+(\.\d+)?(px|pt|em|rem|%)$/i.test(value)
      ) {
        return "";
      }

      return `${property}: ${value}`;
    })
    .filter(Boolean)
    .join("; ");
}

function sanitizeNode(node: Node, target: Document) {
  if (node.nodeType === Node.TEXT_NODE) {
    return target.createTextNode(node.textContent ?? "");
  }

  if (!(node instanceof HTMLElement)) {
    return null;
  }

  if (!ALLOWED_TAGS.has(node.tagName)) {
    const fragment = target.createDocumentFragment();

    for (const child of Array.from(node.childNodes)) {
      const sanitized = sanitizeNode(child, target);
      if (sanitized) {
        fragment.appendChild(sanitized);
      }
    }

    return fragment;
  }

  const element = target.createElement(node.tagName.toLowerCase());
  const style = sanitizeStyle(node.getAttribute("style") ?? "");

  if (style) {
    element.setAttribute("style", style);
  }

  const alignment = node.getAttribute("align")?.toLowerCase();
  if (
    alignment &&
    ["left", "center", "right", "justify"].includes(alignment)
  ) {
    element.style.textAlign = alignment;
  }

  if (node.tagName === "FONT") {
    const color = node.getAttribute("color");
    if (color && /^#[\da-f]{3,8}$/i.test(color)) {
      element.style.color = color;
    }
  }

  for (const child of Array.from(node.childNodes)) {
    const sanitized = sanitizeNode(child, target);
    if (sanitized) {
      element.appendChild(sanitized);
    }
  }

  return element;
}

export function sanitizeRichHtml(html: string) {
  const source = new DOMParser().parseFromString(html, "text/html");
  const target = document.implementation.createHTMLDocument("");
  const fragment = target.createDocumentFragment();

  for (const child of Array.from(source.body.childNodes)) {
    const sanitized = sanitizeNode(child, target);
    if (sanitized) {
      fragment.appendChild(sanitized);
    }
  }

  const container = target.createElement("div");
  container.appendChild(fragment);
  return container.innerHTML;
}

export function decodeRichContent(content: string) {
  if (!content.startsWith(RICH_TEXT_PREFIX)) {
    return content
      .split(/\r\n|\n|\r/)
      .map((line) => escapeHtml(line))
      .join("<br>");
  }

  return sanitizeRichHtml(content.slice(RICH_TEXT_PREFIX.length));
}

export function encodeRichContent(html: string) {
  return `${RICH_TEXT_PREFIX}${sanitizeRichHtml(html)}`;
}

export function richContentToText(content: string) {
  if (!content.startsWith(RICH_TEXT_PREFIX)) {
    return content;
  }

  const container = document.createElement("div");
  container.innerHTML = sanitizeRichHtml(
    content.slice(RICH_TEXT_PREFIX.length),
  );

  return (container.innerText || container.textContent || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n");
}
