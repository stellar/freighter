import React, { useState } from "react";
import ConfirmMnemonicPhrase from "components/mnemonicPhrase/ConfirmMnemonicPhrase";
import useMnemonicPhrase from "hooks/useMnemonicPhrase";
import DisplayMnemonicPhrase from "components/mnemonicPhrase/DisplayMnemonicPhrase";
import Fullscreen from "components/Layout/Fullscreen";

import spy from "assets/spy.png";

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
