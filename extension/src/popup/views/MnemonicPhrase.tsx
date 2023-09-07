import React, { useState } from "react";
import { useSelector } from "react-redux";
import shuffle from "lodash/shuffle";
import { Redirect } from "react-router-dom";

import { APPLICATION_STATE } from "@shared/constants/applicationState";

import { ROUTES } from "popup/constants/routes";
import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { Header } from "popup/components/Header";
import { Onboarding } from "popup/components/Onboarding";
import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";
import { applicationStateSelector } from "popup/ducks/accountServices";

interface MnemonicPhraseProps {
  mnemonicPhrase: string;
}

export const MnemonicPhrase = ({
  mnemonicPhrase = "",
}: MnemonicPhraseProps) => {
  const applicationState = useSelector(applicationStateSelector);
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
    return <Redirect to={ROUTES.pinExtension} />;
  }

  if (mnemonicPhrase) {
    return isConfirmed ? (
      <>
        <Header />
        <FullscreenStyle />
        <Onboarding customBackAction={() => setIsConfirmed(false)} hasGoBackBtn>
          <ConfirmMnemonicPhrase words={shuffle(mnemonicPhrase.split(" "))} />
        </Onboarding>
      </>
    ) : (
      <>
        <Header />
        <FullscreenStyle />
        <Onboarding>
          <DisplayMnemonicPhrase
            mnemonicPhrase={mnemonicPhrase}
            setIsConfirmed={setIsConfirmed}
          />
        </Onboarding>
      </>
    );
  }

  return null;
};
