import React, { useState } from "react";
import shuffle from "lodash/shuffle";

import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { useMnemonicPhrase } from "popup/helpers/useMnemonicPhrase";
import { Header } from "popup/components/Header";
import { Onboarding } from "popup/components/Onboarding";
import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";

export const MnemonicPhrase = () => {
  const [readyToConfirm, setReadyToConfirm] = useState(false);

  const mnemonicPhrase = useMnemonicPhrase();

  if (mnemonicPhrase) {
    return (
      <>
        <Header />
        <FullscreenStyle />
        <Onboarding
          goBack={() => setReadyToConfirm(false)}
          hasGoBackBtn={readyToConfirm}
        >
          {readyToConfirm ? (
            <ConfirmMnemonicPhrase words={shuffle(mnemonicPhrase.split(" "))} />
          ) : (
            <DisplayMnemonicPhrase
              mnemonicPhrase={mnemonicPhrase}
              setReadyToConfirm={setReadyToConfirm}
            />
          )}
        </Onboarding>
      </>
    );
  }

  return null;
};
