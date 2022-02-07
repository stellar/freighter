import React, { useState } from "react";
import shuffle from "lodash/shuffle";

import { useMnemonicPhrase } from "popup/helpers/useMnemonicPhrase";
import { Header } from "popup/components/Header";
import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";

export const MnemonicPhrase = () => {
  const [readyToConfirm, setReadyToConfirm] = useState(false);

  const mnemonicPhrase = useMnemonicPhrase();

  if (mnemonicPhrase) {
    return (
      <>
        <Header />
        {readyToConfirm ? (
          <ConfirmMnemonicPhrase
            words={shuffle(mnemonicPhrase.split(" "))}
            setReadyToConfirm={setReadyToConfirm}
          />
        ) : (
          <DisplayMnemonicPhrase
            mnemonicPhrase={mnemonicPhrase}
            setReadyToConfirm={setReadyToConfirm}
          />
        )}
      </>
    );
  }

  return null;
};
