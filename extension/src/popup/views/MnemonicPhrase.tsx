import React, { useState } from "react";
import shuffle from "lodash/shuffle";

// import { emitMetric } from "helpers/metrics";
import { useMnemonicPhrase } from "popup/helpers/useMnemonicPhrase";

// import { METRIC_NAMES } from "popup/constants/metricsNames";

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
          <ConfirmMnemonicPhrase words={shuffle(mnemonicPhrase.split(" "))} />
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
