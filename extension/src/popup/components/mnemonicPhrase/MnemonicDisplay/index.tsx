import React from "react";
import { Card } from "@stellar/design-system";
import StellarHdWallet from "stellar-hd-wallet";
import random from "lodash/random";

import "./styles.scss";

interface GenerateMnemonicPhraseDisplayProps {
  mnemonicPhrase: string;
}

export const generateMnemonicPhraseDisplay = ({
  mnemonicPhrase = "",
}: GenerateMnemonicPhraseDisplayProps) =>
  mnemonicPhrase.split(" ").map((word: string, i: number) => {
    /*
      As a security measure, we want to prevent writing the mnemonic phrase to the DOM.
      The browser can leak this string into memory where a hacker could possibly access it.
      A solution here is to insert random, hidden words into the string so the browser is
      only has an obfuscated menemonic phrase that can leak into memory.
    */

    const randomNumber = random(1, 10);
    const randomWordArr = StellarHdWallet.generateMnemonic().split(" ");
    const randomWordIndex = random(0, randomWordArr.length - 1);
    const randomWord = randomWordArr[randomWordIndex];

    return (
      <li className="MnemonicDisplay__list-item" key={`${word}-${i}`}>
        {randomNumber % 2 === 0 ? (
          <>
            <span className="MnemonicDisplay__random-word">{randomWord}</span>

            <span data-testid="word">{word}</span>
          </>
        ) : (
          <>
            <span data-testid="word">{word}</span>
            <span className="MnemonicDisplay__random-word">{randomWord}</span>
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
    <Card variant="primary">
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
