import React from "react";
import { Card } from "@stellar/design-system";
// @ts-ignore
import { generateMnemonic } from "stellar-hd-wallet";
import random from "lodash/random";

import "./styles.scss";

function getVerticalChunks(words: string[], columns: number) {
  const rows = Math.ceil(words.length / columns);
  const result: { word: string; globalIndex: number }[][] = Array.from(
    { length: columns },
    () => [],
  );

  words.forEach((word, i) => {
    const colIndex = Math.floor(i / rows);
    result[colIndex].push({ word, globalIndex: i });
  });

  return result;
}

interface GenerateMnemonicPhraseDisplayProps {
  mnemonicPhrase: string;
}

export const generateMnemonicPhraseDisplay = ({
  mnemonicPhrase = "",
  columns = 2,
}: GenerateMnemonicPhraseDisplayProps & { columns?: number }) => {
  const words = mnemonicPhrase.split(" ");
  const columnChunks = getVerticalChunks(words, columns);

  return (
    <div className="MnemonicDisplay__columns">
      {columnChunks.map((column, colIdx) => (
        <div className="MnemonicDisplay__column" key={`column-${colIdx}`}>
          {column.map(({ word, globalIndex }) => {
            const randomNumber = random(1, 10);
            const randomWordArr = generateMnemonic().split(" ");
            const randomWordIndex = random(0, randomWordArr.length - 1);
            const randomWord = randomWordArr[randomWordIndex];

            return (
              <div
                className="MnemonicDisplay__list-item"
                key={`${word}-${globalIndex}`}
              >
                <span className="MnemonicDisplay__list-item__index">
                  {globalIndex + 1}
                </span>
                {randomNumber % 2 === 0 ? (
                  <>
                    <span className="MnemonicDisplay__random-word">
                      {randomWord}
                    </span>
                    <span data-testid="word">{word}</span>
                  </>
                ) : (
                  <>
                    <span data-testid="word">{word}</span>
                    <span className="MnemonicDisplay__random-word">
                      {randomWord}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

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
      <div
        onCopy={(e) => e.preventDefault()}
        className={`MnemonicDisplay__ordered-list ${
          isPopupView ? "MnemonicDisplay__ordered-list--popup-view" : ""
        }`}
      >
        {generateMnemonicPhraseDisplay({ mnemonicPhrase })}
      </div>
    </Card>
  </div>
);
