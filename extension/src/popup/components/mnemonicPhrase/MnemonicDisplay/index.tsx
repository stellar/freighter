import React from "react";
import { Card } from "@stellar/design-system";
// @ts-ignore
import { generateMnemonic } from "stellar-hd-wallet";
import random from "lodash/random";

import "./styles.scss";

interface generateMnemonicPhraseDisplayProps {
  mnemonicPhrase: string;
}

export const generateMnemonicPhraseDisplay = ({
  mnemonicPhrase = "",
}: generateMnemonicPhraseDisplayProps) =>
  mnemonicPhrase.split(" ").map((word: string) => {
    /* 
      As a security measure, we want to prevent writing the mnemonic phrase to the DOM. 
      The browser can leak this string into memory where a hacker could possibly access it.
      A solution here is to insert random, hidden words into the string so the browser is
      only has an obfuscated menemonic phrase that can leak into memory.
    */

    const randomNumber = random(1, 10);
    const randomWordArr = generateMnemonic().split(" ");
    const randomWordIndex = random(0, randomWordArr.length - 1);
    const randomWord = randomWordArr[randomWordIndex];

    return (
      <li className="MnemonicDisplay__list-item" key={word}>
        {randomNumber % 2 === 0 ? (
          <>
            <span className="MnemonicDisplay__random-word">
              <strong>{randomWord}</strong>
            </span>

            <span>
              <strong>{word}</strong>
            </span>
          </>
        ) : (
          <>
            <span>
              <strong>{word}</strong>
            </span>
            <span className="MnemonicDisplay__random-word">
              <strong>{randomWord}</strong>
            </span>
          </>
        )}
      </li>
    );
  });

interface MnemonicDisplayProps {
  mnemonicPhrase: string;
  isPopupView?: boolean;
}

export const MnemonicDisplay = ({
  mnemonicPhrase,
  isPopupView,
}: MnemonicDisplayProps) => (
  <div className="MnemonicDisplay">
    <Card variant={Card.variant.highlight}>
      <ol
        onCopy={(e) => e.preventDefault()}
        className={`MnemonicDisplay__ordered-list ${
          isPopupView ? "MnemonicDisplay__ordered-list--popup-view" : ""
        }`}
      >
        {generateMnemonicPhraseDisplay({ mnemonicPhrase })}
      </ol>
    </Card>
  </div>
);
