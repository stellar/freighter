import React, { useState } from "react";
import { shuffle } from "lodash";

import { EMOJI } from "popup/constants";

import useMnemonicPhrase from "popup/hooks/useMnemonicPhrase";

import { Onboarding } from "popup/components/Layout/Fullscreen/Onboarding";

import ConfirmMnemonicPhrase from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import DisplayMnemonicPhrase from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";

const MnemonicPhrase = () => {
  const [readyToConfirm, setReadyToConfirm] = useState(false);

  const mnemonicPhrase = useMnemonicPhrase();

  if (mnemonicPhrase) {
    return readyToConfirm ? (
      <Onboarding
        header="Confirm your secret phrase"
        icon={EMOJI.spy}
        goBack={() => setReadyToConfirm(false)}
      >
        <ConfirmMnemonicPhrase words={shuffle(mnemonicPhrase.split(" "))} />
      </Onboarding>
    ) : (
      <Onboarding header="Secret backup phrase" icon={EMOJI.spy}>
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
