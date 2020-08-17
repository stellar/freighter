import React, { useState } from "react";
import shuffle from "lodash/shuffle";

import { emitMetric } from "helpers/metrics";
import { useMnemonicPhrase } from "popup/helpers/useMnemonicPhrase";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { EMOJI } from "popup/constants/emoji";

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
        goBack={() => {
          setReadyToConfirm(false);
          emitMetric(METRIC_NAMES.newWalletConfirmMnemonicBack);
        }}
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
