import React, { useState } from "react";
import shuffle from "lodash/shuffle";
import styled from "styled-components";

import { emitMetric } from "helpers/metrics";
import { useMnemonicPhrase } from "popup/helpers/useMnemonicPhrase";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { Header } from "popup/components/Header";
import { Onboarding } from "popup/components/Onboarding";
import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";

import ImportWalletIllo from "popup/assets/illo-backup-phrase.svg";

const IconImgEl = styled.img`
  height: 7.5rem;
`;

const IconEl = () => <IconImgEl src={ImportWalletIllo} alt="Import wallet" />;

export const MnemonicPhrase = () => {
  const [readyToConfirm, setReadyToConfirm] = useState(false);

  const mnemonicPhrase = useMnemonicPhrase();

  if (mnemonicPhrase) {
    return (
      <>
        <Header />
        {readyToConfirm ? (
          <Onboarding
            header="Confirm your backup phrase"
            icon={<IconEl />}
            subheader="Select each word in the correct order to confirm you got them right"
            goBack={() => {
              setReadyToConfirm(false);
              emitMetric(METRIC_NAMES.accountCreatorConfirmMnemonicBack);
            }}
          >
            <ConfirmMnemonicPhrase words={shuffle(mnemonicPhrase.split(" "))} />
          </Onboarding>
        ) : (
          <Onboarding header="Backup phrase" icon={<IconEl />}>
            <DisplayMnemonicPhrase
              mnemonicPhrase={mnemonicPhrase}
              setReadyToConfirm={setReadyToConfirm}
            />
          </Onboarding>
        )}
      </>
    );
  }

  return null;
};
