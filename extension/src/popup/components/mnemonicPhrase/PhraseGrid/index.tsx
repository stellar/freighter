import React from "react";

import "./styles.scss";

interface PhraseGridProps {
  phrase: string;
  testId?: string;
  /**
   * Blurs the words until the user asks to see them. The words stay out of
   * the DOM while blurred, so the blur hides nothing that a screen reader or
   * a copy could still reach.
   */
  isHidden?: boolean;
}

const HIDDEN_WORD = "••••••";

/** A recovery phrase as a numbered two-column grid. */
export const PhraseGrid = ({ phrase, testId, isHidden }: PhraseGridProps) => (
  <ol
    className={`PhraseGrid${isHidden ? " PhraseGrid--hidden" : ""}`}
    data-testid={testId}
    aria-hidden={isHidden ? true : undefined}
  >
    {phrase.split(" ").map((word, i) => (
      <li key={`${i}-${isHidden ? "" : word}`} className="PhraseGrid__word">
        <span className="PhraseGrid__number">{i + 1}</span>
        <span>{isHidden ? HIDDEN_WORD : word}</span>
      </li>
    ))}
  </ol>
);
