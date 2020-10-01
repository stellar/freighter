import React, { useState } from "react";
import shuffle from "lodash/shuffle";

import { emitMetric } from "helpers/metrics";
import { useMnemonicPhrase } from "popup/helpers/useMnemonicPhrase";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { Onboarding } from "popup/components/Onboarding";
import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";

import ImportWalletIllo from "popup/assets/illo-backup-phrase.svg";

export const MnemonicPhrase = () => {
  const [readyToConfirm, setReadyToConfirm] = useState(false);

  const mnemonicPhrase = useMnemonicPhrase();

  if (mnemonicPhrase) {
    return readyToConfirm ? (
      <Onboarding
        header="Confirm your secret phrase"
        icon={ImportWalletIllo}
        subheader="Please select each word in the same order you have them noted to confirm you got them right"
        goBack={() => {
          setReadyToConfirm(false);
          emitMetric(METRIC_NAMES.accountCreatorConfirmMnemonicBack);
        }}
      >
        <ConfirmMnemonicPhrase words={shuffle(mnemonicPhrase.split(" "))} />
      </Onboarding>
    ) : (
      <Onboarding header="Secret backup phrase" icon={ImportWalletIllo}>
        <DisplayMnemonicPhrase
          mnemonicPhrase={mnemonicPhrase}
          setReadyToConfirm={setReadyToConfirm}
        />
      </Onboarding>
    );
  }

  return null;
};
