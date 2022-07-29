import React from "react";
import { useSelector } from "react-redux";
import shuffle from "lodash/shuffle";
import { Switch, Redirect } from "react-router-dom";

import { APPLICATION_STATE } from "@shared/constants/applicationState";

import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";
import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { useMnemonicPhrase } from "popup/helpers/useMnemonicPhrase";
import { Header } from "popup/components/Header";
import { Onboarding } from "popup/components/Onboarding";
import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";
import { applicationStateSelector } from "popup/ducks/accountServices";

export const MnemonicPhrase = () => {
  const mnemonicPhrase = useMnemonicPhrase();
  const applicationState = useSelector(applicationStateSelector);

  if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
    return <Redirect to={ROUTES.pinExtension} />;
  }

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
