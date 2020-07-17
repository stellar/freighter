import React, { useState } from "react";
import { shuffle } from "lodash";

import { EMOJI } from "popup/constants/emoji";

import useMnemonicPhrase from "popup/helpers/useMnemonicPhrase";

import { Onboarding } from "popup/components/Onboarding";

import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";

export const MnemonicPhrase = () => {
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
