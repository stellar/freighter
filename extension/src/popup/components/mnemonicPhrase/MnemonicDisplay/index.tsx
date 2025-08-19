import React from "react";
// @ts-ignore
import { generateMnemonic } from "stellar-hd-wallet";
import random from "lodash/random";

import "./styles.scss";

interface GenerateMnemonicPhraseDisplayProps {
  mnemonicPhrase: string;
}

export const generateMnemonicPhraseDisplay = ({
  mnemonicPhrase = "",
}: GenerateMnemonicPhraseDisplayProps) => {
  const words = mnemonicPhrase.split(" ");

  return words.map((word, ind) => {
    const randomNumber = random(1, 10);
    const randomWordArr = generateMnemonic().split(" ");
    const randomWordIndex = random(0, randomWordArr.length - 1);
    const randomWord = randomWordArr[randomWordIndex];

    return (
      <div className="MnemonicDisplay__word" key={`${word}-${ind}`}>
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
      </div>
    );
  });
};

interface MnemonicDisplayProps {
  mnemonicPhrase: string;
}

export const MnemonicDisplay = ({ mnemonicPhrase }: MnemonicDisplayProps) => (
  <div className="MnemonicDisplay" onCopy={(e) => e.preventDefault()}>
    {generateMnemonicPhraseDisplay({ mnemonicPhrase })}
  </div>
);
