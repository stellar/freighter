import React from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
import ExtensionIllo from "popup/assets/illo-extension.png";

import "./styles.scss";

// userAgent sniffing is not foolproof so shouldn't expect this method
// to be 100% accurate.
const isChrome = () =>
  navigator.userAgent.toLowerCase().indexOf("chrome") > -1 && !!window.chrome;

const AvoidScamsWarningBlock = () => {
  const { t } = useTranslation();

  return (
    <div className="FullscreenSuccessMessage__infoBlock">
      <InfoBlock variant={InfoBlock.variant.warning}>
        <div className="InfoBlock__content">
          <div className="InfoBlock__header">
            {t("Avoid scams and keep your account safe")}
          </div>
          <ul className="FullscreenSuccessMessage__infoBlock__list">
            <li>
              {t(
                "Freighter will never ask for your recovery phrase unless you’re actively importing your account using the browser extension - never on an external website.",
              )}
            </li>
            <li>
              {t(
                "Always check the domain of websites you’re using Freighter with",
              )}
            </li>
            <li>
              {t(
                "Freighter cannot recover your account if you lose your recovery phrase, so keep it safe",
              )}
            </li>
          </ul>
        </div>
      </InfoBlock>
    </div>
  );
};

const MnemonicPhraseConfirmedMessage = () => {
  const { t } = useTranslation();

  return (
    <>
      <div className="FullscreenSuccessMessage__copy">
        <p>
          {t(
            "Awesome, you passed the test. Keep your recovery phrase safe, it’s your responsibility.",
          )}
        </p>
      </div>
      <AvoidScamsWarningBlock />
      <SubmitButtonWrapper>
        <Button
          fullWidth
          onClick={() => {
            emitMetric(METRIC_NAMES.accountCreatorFinished);
            if (isChrome()) {
              navigateTo(ROUTES.pinExtension);
            } else {
              window.close();
            }
          }}
        >
          {isChrome() ? t("CONTINUE") : t("ALL DONE")}
        </Button>
      </SubmitButtonWrapper>
    </>
  );
};

const RecoverAccountSuccessMessage = () => {
  const { t } = useTranslation();

  return (
    <>
      <div className="FullscreenSuccessMessage__copy">
        <p>
          {t(
            "You successfully imported your account. Keep your recovery phrase safe, it’s your responsibility",
          )}
        </p>
        {!isChrome() && (
          <p>
            {t(
              "Check your account details by clicking on the Freighter icon on your browser.",
            )}
          </p>
        )}
      </div>
      {isChrome() ? (
        <AvoidScamsWarningBlock />
      ) : (
        <div className="FullscreenSuccessMessage__illo-container">
          <img
            className="FullscreenSuccessMessage__extension-image"
            src={ExtensionIllo}
            alt="Extension"
          />
        </div>
      )}
      <SubmitButtonWrapper>
        <Button
          fullWidth
          onClick={() => {
            emitMetric(METRIC_NAMES.recoverAccountFinished);
            if (isChrome()) {
              navigateTo(ROUTES.pinExtension);
            } else {
              window.close();
            }
          }}
        >
          {isChrome() ? t("CONTINUE") : t("ALL DONE")}
        </Button>
      </SubmitButtonWrapper>
    </>
  );
};

export const FullscreenSuccessMessage = () => {
  const location = useLocation();
  const { t } = useTranslation();

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
          {t("Woo, you’re in!")}
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
