import React from "react";
import { Card } from "@stellar/design-system";
// @ts-ignore
import { generateMnemonic } from "stellar-hd-wallet";
import { random } from "lodash";

import "./styles.scss";

interface generateMnemonicPhraseDisplayProps {
  mnemonicPhrase: string;
}

export const generateMnemonicPhraseDisplay = ({
  mnemonicPhrase,
}: generateMnemonicPhraseDisplayProps) =>
  mnemonicPhrase.split(" ").map((word: string) => {
    const randomNumber = random(1, 10);
    const randomWordArr = generateMnemonic().split(" ");
    const randomWordIndex = random(0, randomWordArr.length);
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
