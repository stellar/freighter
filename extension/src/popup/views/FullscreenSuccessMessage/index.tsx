import React from "react";
import { useLocation } from "react-router-dom";

import { emitMetric } from "helpers/metrics";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { navigateTo } from "popup/helpers/navigate";
import { InfoBlock } from "popup/basics/InfoBlock";
import { SubmitButtonWrapper } from "popup/basics/Forms";
import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { Header } from "popup/components/Header";
import { OnboardingHeader } from "popup/components/Onboarding";
import { Button } from "popup/basics/buttons/Button";
import SuccessIllo from "popup/assets/illo-success-screen.svg";

import "./styles.scss";

const AvoidScamsWarningBlock = () => (
  <div className="FullscreenSuccessMessage__infoBlock">
    <InfoBlock variant={InfoBlock.variant.warning}>
      <div className="InfoBlock__content">
        <div className="InfoBlock__header">
          Avoid scams and keep your account safe
        </div>
        <ul>
          <li>
            Freighter will never ask for your recovery phrase unless you're
            actively importing your account using the browser extension - never
            on an external website.
          </li>
          <li>
            Always check the domain of websites you’re using Freighter with
          </li>
          <li>
            Freighter cannot recover your account if you lose your recovery
            phrase, so keep it safe
          </li>
        </ul>
      </div>
    </InfoBlock>
  </div>
);

const MnemonicPhraseConfirmedMessage = () => (
  <>
    <div className="FullscreenSuccessMessage__copy">
      <p>
        Awesome, you passed the test. Keep your recovery phrase safe, it’s your
        responsibility.
      </p>
    </div>
    <AvoidScamsWarningBlock />
    <SubmitButtonWrapper>
      <Button
        fullWidth
        onClick={() => {
          emitMetric(METRIC_NAMES.accountCreatorFinished);
          navigateTo(ROUTES.pinExtension);
        }}
      >
        CONTINUE
      </Button>
    </SubmitButtonWrapper>
  </>
);

const RecoverAccountSuccessMessage = () => (
  <>
    <div className="FullscreenSuccessMessage__copy">
      <p>
        You successfully imported your account. Keep your recovery phrase safe,
        it’s your responsibility
      </p>
    </div>
    <AvoidScamsWarningBlock />
    <SubmitButtonWrapper>
      <Button
        fullWidth
        onClick={() => {
          emitMetric(METRIC_NAMES.recoverAccountFinished);
          navigateTo(ROUTES.pinExtension);
        }}
      >
        CONTINUE
      </Button>
    </SubmitButtonWrapper>
  </>
);

export const FullscreenSuccessMessage = () => {
  const location = useLocation();

  const IS_MNEMONIC_PHRASE_STATE =
    location.pathname === ROUTES.mnemonicPhraseConfirmed;

  return (
    <>
      <Header />
      <FullscreenStyle />
      <div className="FullscreenSuccessMessage__wrapper">
        <div className="FullscreenSuccessMessage__illo-container">
          <img
            className="FullscreenSuccessMessage__success-image"
            src={SuccessIllo}
            alt="Success"
          />
        </div>
        <OnboardingHeader className="FullscreenSuccessMessage__header">
          Woo, you’re in!
        </OnboardingHeader>
        <div className="FullscreenSuccessMessage__content-wrapper">
          {IS_MNEMONIC_PHRASE_STATE ? (
            <MnemonicPhraseConfirmedMessage />
          ) : (
            <RecoverAccountSuccessMessage />
          )}
        </div>
      </div>
    </>
  );
};
