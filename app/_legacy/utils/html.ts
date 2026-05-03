const BLOCKED_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "meta",
  "link",
];

const blockedTagPattern = new RegExp(
  `<(?:${BLOCKED_TAGS.join("|")})\\b[^>]*>[\\s\\S]*?<\\/(?:${BLOCKED_TAGS.join("|")})>|<(?:${BLOCKED_TAGS.join("|")})\\b[^>]*\\/?\\s*>`,
  "gi"
);

export const sanitizeHtml = (html: string = ""): string =>
  String(html)
    .replace(blockedTagPattern, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])javascript:[\s\S]*?\2/gi, "")
    .trim();

export const stripHtml = (html: string = ""): string =>
  sanitizeHtml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
