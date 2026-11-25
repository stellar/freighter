import React from "react";

import { parseLinkedText } from "./parseLinkedText";

interface LinkifiedTextProps {
  text: string;
}

/**
 * Renders text while turning markdown-style `[text](https://...)` links and
 * bare `https://` URLs into clickable links. Everything else is rendered
 * as plain text - no other markdown/HTML is parsed, so this is safe to use
 * directly on untrusted/external strings (e.g. API responses).
 */
export const LinkifiedText = ({ text }: LinkifiedTextProps) => (
  <>
    {parseLinkedText(text).map((segment, index) =>
      segment.url ? (
        <a
          key={`${index}-${segment.url}`}
          href={segment.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {segment.text}
        </a>
      ) : (
        <React.Fragment key={`${index}-text`}>{segment.text}</React.Fragment>
      ),
    )}
  </>
);
