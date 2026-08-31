import { parseLinkedText } from "../parseLinkedText";

describe("parseLinkedText", () => {
  it("returns a single plain-text segment when there are no links", () => {
    expect(parseLinkedText("just plain text")).toEqual([
      { text: "just plain text" },
    ]);
  });

  it("parses a markdown-style link", () => {
    expect(
      parseLinkedText("See the [incident update](https://example.com/x) now."),
    ).toEqual([
      { text: "See the " },
      { text: "incident update", url: "https://example.com/x" },
      { text: " now." },
    ]);
  });

  it("linkifies a bare URL", () => {
    expect(parseLinkedText("Visit https://example.com/x today")).toEqual([
      { text: "Visit " },
      { text: "https://example.com/x", url: "https://example.com/x" },
      { text: " today" },
    ]);
  });

  it("strips trailing punctuation from a bare URL", () => {
    expect(parseLinkedText("See https://example.com/x.")).toEqual([
      { text: "See " },
      { text: "https://example.com/x", url: "https://example.com/x" },
      { text: "." },
    ]);
  });

  it("handles multiple links in the same string", () => {
    expect(
      parseLinkedText(
        "First https://a.com then [second](https://b.com) link.",
      ),
    ).toEqual([
      { text: "First " },
      { text: "https://a.com", url: "https://a.com" },
      { text: " then " },
      { text: "second", url: "https://b.com" },
      { text: " link." },
    ]);
  });

  it("does not linkify non-https schemes", () => {
    expect(parseLinkedText("Run javascript:alert(1) please")).toEqual([
      { text: "Run javascript:alert(1) please" },
    ]);
  });

  it("does not linkify a bare http (non-https) URL", () => {
    expect(parseLinkedText("Visit http://example.com/x today")).toEqual([
      { text: "Visit http://example.com/x today" },
    ]);
  });

  it("keeps balanced parentheses inside a bare URL", () => {
    expect(
      parseLinkedText(
        "See https://en.wikipedia.org/wiki/Function_(mathematics) for details.",
      ),
    ).toEqual([
      { text: "See " },
      {
        text: "https://en.wikipedia.org/wiki/Function_(mathematics)",
        url: "https://en.wikipedia.org/wiki/Function_(mathematics)",
      },
      { text: " for details." },
    ]);
  });

  it("keeps balanced parentheses inside a markdown-style URL", () => {
    expect(
      parseLinkedText(
        "See [Function](https://en.wikipedia.org/wiki/Function_(mathematics)) for details.",
      ),
    ).toEqual([
      { text: "See " },
      {
        text: "Function",
        url: "https://en.wikipedia.org/wiki/Function_(mathematics)",
      },
      { text: " for details." },
    ]);
  });

  it("does not let a stray unmatched bracket swallow the real link", () => {
    expect(
      parseLinkedText("Rates [APY vary. See the [docs](https://b.com)."),
    ).toEqual([
      { text: "Rates [APY vary. See the " },
      { text: "docs", url: "https://b.com" },
      { text: "." },
    ]);
  });

  it("does not double-linkify a markdown label that is itself a URL", () => {
    expect(
      parseLinkedText("[https://label.example](https://target.example)"),
    ).toEqual([
      { text: "https://label.example", url: "https://target.example" },
    ]);
  });

  it("does not absorb a quote that closes a quoted bare URL", () => {
    expect(parseLinkedText('See "https://example.com/x" now.')).toEqual([
      { text: 'See "' },
      { text: "https://example.com/x", url: "https://example.com/x" },
      { text: '" now.' },
    ]);
  });

  it("does not linkify a malformed bare URL with no host", () => {
    expect(parseLinkedText("See https:// for syntax")).toEqual([
      { text: "See https:// for syntax" },
    ]);
    expect(parseLinkedText("See https://?query for syntax")).toEqual([
      { text: "See https://?query for syntax" },
    ]);
  });

  it("does not linkify a malformed markdown URL with no host", () => {
    expect(parseLinkedText("[bad](https://)")).toEqual([
      { text: "[bad](https://)" },
    ]);
  });

  it("keeps square brackets inside a markdown destination", () => {
    expect(
      parseLinkedText(
        "Search [tags](https://example.com/search?tag[]=security) here.",
      ),
    ).toEqual([
      { text: "Search " },
      { text: "tags", url: "https://example.com/search?tag[]=security" },
      { text: " here." },
    ]);
  });
});
