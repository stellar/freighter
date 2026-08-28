export interface LinkedTextSegment {
  text: string;
  url?: string;
}

// Matches markdown-style `[text](https://...)` links, or a bare
// `https://` URL. Deliberately restricted to https - no other scheme
// (e.g. `http:`, `javascript:`) is ever recognized as a link, matching the
// isSafeHttpsUrl convention used elsewhere for protocol.websiteUrl.
const LINK_PATTERN =
  /\[([^\]]+)]\((https:\/\/[^\s)]+)\)|(https:\/\/[^\s<>()[\]]+)/g;

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
  let lastIndex = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    const [full, markdownText, markdownUrl, bareUrl] = match;
    const start = match.index ?? 0;

    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start) });
    }

    if (markdownText && markdownUrl) {
      segments.push({ text: markdownText, url: markdownUrl });
    } else if (bareUrl) {
      const { url, trailing } = splitTrailingPunctuation(bareUrl);
      segments.push({ text: url, url });
      if (trailing) {
        segments.push({ text: trailing });
      }
    }

    lastIndex = start + full.length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments;
};
