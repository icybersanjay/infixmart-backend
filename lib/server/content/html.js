import sanitizeHtmlLib from "sanitize-html";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span",
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "name", "target", "rel", "title"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  th: ["align", "colspan", "rowspan"],
  td: ["align", "colspan", "rowspan"],
  "*": ["class", "style", "id"],
};

const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];
const ALLOWED_SCHEMES_BY_TAG = {
  img: ["http", "https", "data"],
};

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedSchemes: ALLOWED_SCHEMES,
  allowedSchemesByTag: ALLOWED_SCHEMES_BY_TAG,
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tagName, attribs) => ({
      tagName: "a",
      attribs: {
        ...attribs,
        rel: "nofollow noopener noreferrer",
        target: attribs.target === "_self" ? "_self" : "_blank",
      },
    }),
  },
  // Remove style content + script-likes outright (also caught by allowedTags).
  exclusiveFilter: (frame) =>
    frame.tag === "script" || frame.tag === "style" || frame.tag === "iframe",
};

function sanitizeRichText(html = "") {
  if (!html) return "";
  return sanitizeHtmlLib(String(html), SANITIZE_OPTIONS).trim();
}

function stripHtml(html = "") {
  if (!html) return "";
  return sanitizeHtmlLib(String(html), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export { sanitizeRichText, stripHtml };
