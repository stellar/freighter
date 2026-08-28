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
});
