export interface LinkedTextSegment {
  text: string;
  url?: string;
}

// Only https:// is ever recognized as a link - no other scheme (e.g.
// `http:`, `javascript:`) matches, matching the isSafeHttpsUrl convention
// used elsewhere for protocol.websiteUrl.
const HTTPS_PREFIX = "https://";

// Characters that always end a URL, whether or not it's inside a markdown
// link: whitespace, angle brackets, square brackets (markdown syntax), and
// quotes (prose delimiters - a quoted URL shouldn't swallow the closing
// quote). Parentheses are handled separately in findUrlEnd, since a URL may
// legitimately contain balanced ones (e.g. a Wikipedia article title).
const URL_BOUNDARY_CHAR = /[\s<>[\]"']/;

const TRAILING_PUNCTUATION = /[.,!?;:]+$/;

const splitTrailingPunctuation = (
  url: string,
): { url: string; trailing: string } => {
  const match = url.match(TRAILING_PUNCTUATION);
  if (!match) {
    return { url, trailing: "" };
  }
  return {
    url: url.slice(0, url.length - match[0].length),
    trailing: match[0],
  };
};

// Extends a URL starting at `start` as far as possible, allowing balanced
// parentheses inside it (e.g. https://en.wikipedia.org/wiki/Function_(maths))
// so a legitimate paren in the URL path isn't mistaken for markdown/prose
// punctuation. An unmatched closing paren ends the URL instead of being
// consumed by it, since it's almost always the boundary of a markdown link
// or the prose wrapping a link in parens.
const findUrlEnd = (text: string, start: number): number => {
  let depth = 0;
  let index = start;

  while (index < text.length) {
    const char = text[index];
    if (URL_BOUNDARY_CHAR.test(char)) {
      break;
    }
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      if (depth === 0) {
        break;
      }
      depth -= 1;
    }
    index += 1;
  }

  return index;
};

interface MarkdownLink {
  label: string;
  url: string;
  end: number;
}

// Tries to parse a complete markdown link `[label](https://...)` starting
// at the `[` found at `openIndex`. Returns null if it isn't one - e.g. no
// matching `]`, the label itself contains an unescaped `[` (meaning
// `openIndex` isn't the real opening bracket - see the "nested brackets"
// test case), or there's no `(https://...)` immediately after the `]`.
// Parsing forward like this (rather than scanning backward from a `https://`
// occurrence) means a label that itself contains a URL - e.g.
// `[https://a.example](https://b.example)` - is handled as a single link
// instead of the label's URL being matched as a stray bare link first.
const tryParseMarkdownLink = (
  text: string,
  openIndex: number,
): MarkdownLink | null => {
  const closeBracket = text.indexOf("]", openIndex + 1);
  if (closeBracket === -1) {
    return null;
  }

  const label = text.slice(openIndex + 1, closeBracket);
  if (label.includes("[")) {
    return null;
  }

  if (text[closeBracket + 1] !== "(") {
    return null;
  }

  const urlStart = closeBracket + 2;
  if (!text.startsWith(HTTPS_PREFIX, urlStart)) {
    return null;
  }

  const urlEnd = findUrlEnd(text, urlStart);
  if (text[urlEnd] !== ")") {
    return null;
  }

  return { label, url: text.slice(urlStart, urlEnd), end: urlEnd + 1 };
};

/**
 * Parses plain text for markdown-style links (`[text](https://...)`) and
 * bare `https://` URLs, returning an ordered list of segments to render.
 * A segment with a `url` should be rendered as a clickable link; a segment
 * without one is plain text.
 *
 * This never parses or renders any other markdown/HTML - it's safe to use
 * on untrusted/external strings (e.g. an API response) since the output is
 * always plain text plus a small, whitelisted set of link segments.
 */
export const parseLinkedText = (text: string): LinkedTextSegment[] => {
  const segments: LinkedTextSegment[] = [];
  let emitted = 0;
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const bracketIndex = text.indexOf("[", searchFrom);
    const httpsIndex = text.indexOf(HTTPS_PREFIX, searchFrom);

    if (
      bracketIndex !== -1 &&
      (httpsIndex === -1 || bracketIndex < httpsIndex)
    ) {
      const link = tryParseMarkdownLink(text, bracketIndex);
      if (link) {
        if (bracketIndex > emitted) {
          segments.push({ text: text.slice(emitted, bracketIndex) });
        }
        segments.push({ text: link.label, url: link.url });
        emitted = link.end;
        searchFrom = link.end;
        continue;
      }

      // Not a complete markdown link - this "[" is just literal text.
      // Keep it pending and resume searching right after it (e.g. it may
      // be a stray bracket preceding the real link, per the nested-bracket
      // test case).
      searchFrom = bracketIndex + 1;
      continue;
    }

    if (httpsIndex === -1) {
      break;
    }

    const urlEnd = findUrlEnd(text, httpsIndex);
    const { url, trailing } = splitTrailingPunctuation(
      text.slice(httpsIndex, urlEnd),
    );

    if (httpsIndex > emitted) {
      segments.push({ text: text.slice(emitted, httpsIndex) });
    }
    segments.push({ text: url, url });
    emitted = httpsIndex + url.length;
    searchFrom = emitted;

    if (trailing) {
      segments.push({ text: trailing });
      emitted += trailing.length;
      searchFrom = emitted;
    }
  }

  if (emitted < text.length) {
    segments.push({ text: text.slice(emitted) });
  }

  return segments;
};
