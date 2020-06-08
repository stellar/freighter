import React, { useState } from "react";
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

  return readyToConfirm ? (
    <Onboarding
      header="Confirm your secret phrase"
      icon={icon}
      goBack={() => setReadyToConfirm(false)}
    >
      <ConfirmMnemonicPhrase mnemonicPhrase={mnemonicPhrase} />
    </Onboarding>
  ) : (
    <Onboarding header="Secret backup phrase" icon={icon}>
      <DisplayMnemonicPhrase
        mnemonicPhrase={mnemonicPhrase}
        setReadyToConfirm={setReadyToConfirm}
      />
    </Onboarding>
  );
};

export default MnemonicPhrase;
