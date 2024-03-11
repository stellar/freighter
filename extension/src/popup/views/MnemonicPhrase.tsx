import React, { useState } from "react";
import { useSelector } from "react-redux";
import shuffle from "lodash/shuffle";
import { Redirect } from "react-router-dom";

import { APPLICATION_STATE } from "@shared/constants/applicationState";

import { ROUTES } from "popup/constants/routes";
import { Onboarding } from "popup/components/Onboarding";
import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";
import { applicationStateSelector } from "popup/ducks/accountServices";
import { View } from "popup/basics/layout/View";

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
      <React.Fragment>
        <View.Header />
        <View.Content alignment="center">
          <Onboarding layout="full" customWidth="31rem">
            <ConfirmMnemonicPhrase
              words={shuffle(mnemonicPhrase.split(" "))}
              customBackAction={() => setIsConfirmed(false)}
              hasGoBackBtn
            />
          </Onboarding>
        </View.Content>
      </React.Fragment>
    ) : (
      <React.Fragment>
        <View.Header />
        <View.Content alignment="center">
          <Onboarding layout="full">
            <DisplayMnemonicPhrase
              mnemonicPhrase={mnemonicPhrase}
              setIsConfirmed={setIsConfirmed}
            />
          </Onboarding>
        </View.Content>
      </React.Fragment>
    );
  }

  return null;
};
