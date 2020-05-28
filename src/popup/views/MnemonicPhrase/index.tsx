import React, { useState } from "react";
import ConfirmMnemonicPhrase from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import useMnemonicPhrase from "popup/hooks/useMnemonicPhrase";
import DisplayMnemonicPhrase from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";
import Fullscreen from "popup/components/Layout/Fullscreen";
import spy from "popup/assets/spy.png";

const MnemonicPhrase = () => {
  const [readyToConfirm, setReadyToConfirm] = useState(false);

  const mnemonicPhrase = useMnemonicPhrase();

  const icon = {
    src: spy,
    alt: "Spy",
  };

  return readyToConfirm ? (
    <Fullscreen
      header="Confirm your secret phrase"
      icon={icon}
      goBack={() => setReadyToConfirm(false)}
    >
      <ConfirmMnemonicPhrase mnemonicPhrase={mnemonicPhrase} />
    </Fullscreen>
  ) : (
    <Fullscreen header="Secret backup phrase" icon={icon}>
      <DisplayMnemonicPhrase
        mnemonicPhrase={mnemonicPhrase}
        setReadyToConfirm={setReadyToConfirm}
      />
    </Fullscreen>
  );
};

export default MnemonicPhrase;
