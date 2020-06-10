import React, { useState } from "react";
import { shuffle } from "lodash";
import ConfirmMnemonicPhrase from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import useMnemonicPhrase from "popup/hooks/useMnemonicPhrase";
import DisplayMnemonicPhrase from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";
import Onboarding from "popup/components/Layout/Fullscreen/Onboarding";

const MnemonicPhrase = () => {
  const [readyToConfirm, setReadyToConfirm] = useState(false);

  const mnemonicPhrase = useMnemonicPhrase();

  const icon = {
    emoji: "🕵️‍♂️",
    alt: "Spy",
  };

  if (mnemonicPhrase) {
    return readyToConfirm ? (
      <Onboarding
        header="Confirm your secret phrase"
        icon={icon}
        goBack={() => setReadyToConfirm(false)}
      >
        <ConfirmMnemonicPhrase words={shuffle(mnemonicPhrase.split(" "))} />
      </Onboarding>
    ) : (
      <Onboarding header="Secret backup phrase" icon={icon}>
        <DisplayMnemonicPhrase
          mnemonicPhrase={mnemonicPhrase}
          setReadyToConfirm={setReadyToConfirm}
        />
      </Onboarding>
    );
  }

  return null;
};

export default MnemonicPhrase;
