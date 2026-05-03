import { describe, it, expect } from "vitest";
import { sanitizeRichText, stripHtml } from "../lib/server/content/html.js";

describe("sanitizeRichText", () => {
  it("strips <script> tags", () => {
    const out = sanitizeRichText("<p>hi</p><script>alert(1)</script>");
    expect(out).not.toContain("script");
    expect(out).toContain("hi");
  });

  it("strips <iframe> tags", () => {
    const out = sanitizeRichText("<p>x</p><iframe src='http://e'></iframe>");
    expect(out).not.toContain("iframe");
  });

  it("strips on* event handlers", () => {
    const out = sanitizeRichText('<a href="/x" onclick="evil()">link</a>');
    expect(out).not.toContain("onclick");
    expect(out).toContain("/x");
  });

  it("strips javascript: hrefs", () => {
    const out = sanitizeRichText('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });

  it("forces rel=nofollow noopener noreferrer on anchors", () => {
    const out = sanitizeRichText('<a href="https://x.com">x</a>');
    expect(out).toContain('rel="nofollow noopener noreferrer"');
  });

  it("preserves safe formatting tags", () => {
    const html = "<h2>title</h2><p><strong>bold</strong> and <em>italic</em></p>";
    const out = sanitizeRichText(html);
    expect(out).toContain("<h2>title</h2>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
  });

  it("handles empty input safely", () => {
    expect(sanitizeRichText("")).toBe("");
    expect(sanitizeRichText(undefined)).toBe("");
    expect(sanitizeRichText(null)).toBe("");
  });
});

describe("stripHtml", () => {
  it("removes all tags", () => {
    expect(stripHtml("<p>hello <b>world</b></p>")).toBe("hello world");
  });

  it("collapses whitespace", () => {
    expect(stripHtml("<p>a</p>   <p>b</p>\n\n<p>c</p>")).toBe("a b c");
  });
});
