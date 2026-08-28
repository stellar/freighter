export interface LinkedTextSegment {
  text: string;
  url?: string;
}

// Only https:// is ever recognized as a link - no other scheme (e.g.
// `http:`, `javascript:`) matches, matching the isSafeHttpsUrl convention
// used elsewhere for protocol.websiteUrl.
const HTTPS_PREFIX = "https://";

// A markdown link opener (`[label](`) ending exactly where a `https://`
// occurrence begins, e.g. matched against the text preceding the URL.
const MARKDOWN_OPENER_PATTERN = /\[([^\]]+)]\($/;

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
    if (/[\s<>[\]]/.test(char)) {
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

const matchMarkdownOpener = (
  text: string,
  httpsIndex: number,
): { labelStart: number; label: string } | null => {
  const match = text.slice(0, httpsIndex).match(MARKDOWN_OPENER_PATTERN);
  if (!match) {
    return null;
  }
  return { labelStart: httpsIndex - match[0].length, label: match[1] };
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
  let cursor = 0;

  while (cursor < text.length) {
    const httpsIndex = text.indexOf(HTTPS_PREFIX, cursor);
    if (httpsIndex === -1) {
      segments.push({ text: text.slice(cursor) });
      break;
    }

    const opener = matchMarkdownOpener(text, httpsIndex);
    if (opener) {
      const urlEnd = findUrlEnd(text, httpsIndex);
      if (text[urlEnd] === ")") {
        if (opener.labelStart > cursor) {
          segments.push({ text: text.slice(cursor, opener.labelStart) });
        }
        segments.push({
          text: opener.label,
          url: text.slice(httpsIndex, urlEnd),
        });
        cursor = urlEnd + 1;
        continue;
      }
    }

    const urlEnd = findUrlEnd(text, httpsIndex);
    const { url, trailing } = splitTrailingPunctuation(
      text.slice(httpsIndex, urlEnd),
    );

    if (httpsIndex > cursor) {
      segments.push({ text: text.slice(cursor, httpsIndex) });
    }
    segments.push({ text: url, url });
    cursor = httpsIndex + url.length;

    if (trailing) {
      segments.push({ text: trailing });
      cursor += trailing.length;
    }
  }

  return segments;
};
