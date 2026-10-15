export const RICH_TEXT_PREFIX = "<!--benglish-editor-rich-text-v1-->";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeHtmlEntities(value: string) {
  return value.replace(
    /&(#(?:x[\da-f]+|\d+)|amp|apos|gt|lt|nbsp|quot);/gi,
    (entity, reference: string) => {
      if (!reference.startsWith("#")) {
        return NAMED_ENTITIES[reference.toLowerCase()] ?? entity;
      }

      const codePoint = reference[1]?.toLowerCase() === "x"
        ? Number.parseInt(reference.slice(2), 16)
        : Number.parseInt(reference.slice(1), 10);

      if (
        !Number.isInteger(codePoint) ||
        codePoint < 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        return entity;
      }

      return String.fromCodePoint(codePoint);
    },
  );
}

export function richContentToText(content: string) {
  if (!content.startsWith(RICH_TEXT_PREFIX)) {
    return content;
  }

  return decodeHtmlEntities(
    content
      .slice(RICH_TEXT_PREFIX.length)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:div|p|li|ul|ol|blockquote)>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n");
}
