import React from "react";
import shuffle from "lodash/shuffle";
import { Switch } from "react-router-dom";

import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";
import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { useMnemonicPhrase } from "popup/helpers/useMnemonicPhrase";
import { Header } from "popup/components/Header";
import { Onboarding } from "popup/components/Onboarding";
import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";

export const MnemonicPhrase = () => {
  const mnemonicPhrase = useMnemonicPhrase();

  if (mnemonicPhrase) {
    return (
      <Switch>
        <PublicKeyRoute exact path={ROUTES.mnemonicPhrase}>
          <Header />
          <FullscreenStyle />
          <Onboarding>
            <DisplayMnemonicPhrase mnemonicPhrase={mnemonicPhrase} />
          </Onboarding>
        </PublicKeyRoute>
        <PublicKeyRoute exact path={ROUTES.mnemonicPhraseConfirm}>
          <Header />
          <FullscreenStyle />
          <Onboarding hasGoBackBtn>
            <ConfirmMnemonicPhrase words={shuffle(mnemonicPhrase.split(" "))} />
          </Onboarding>
        </PublicKeyRoute>
      </Switch>
    );
  }

  return null;
};
