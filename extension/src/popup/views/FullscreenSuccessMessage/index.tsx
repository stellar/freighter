import React from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Notification } from "@stellar/design-system";

import { emitMetric } from "helpers/metrics";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { navigateTo } from "popup/helpers/navigate";
import { SubmitButtonWrapper } from "popup/basics/Forms";
import { Onboarding, OnboardingHeader } from "popup/components/Onboarding";
import { View } from "popup/basics/layout/View";
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
      <Notification variant="primary" title={t("Keep your account safe")}>
        <div className="InfoBlock__content">
          <ul className="FullscreenSuccessMessage__infoBlock__list">
            <li>
              {t(
                "Freighter will never ask for your recovery phrase unless you’re actively importing your account using the browser extension - never on an external website",
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
      </Notification>
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
      <SubmitButtonWrapper isCenterAligned>
        <Button
          size="md"
          variant="secondary"
          onClick={() => {
            emitMetric(METRIC_NAMES.accountCreatorFinished);
            if (isChrome()) {
              navigateTo(ROUTES.pinExtension);
            } else {
              window.close();
            }
          }}
        >
          {isChrome() ? t("Continue") : t("All Done")}
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
            "Awesome, you passed the test! Pin the extension in your browser to access it easily.",
          )}{" "}
          <strong>
            {t("Keep your recovery phrase safe, it’s your responsibility.")}
          </strong>
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
      <SubmitButtonWrapper isCenterAligned>
        <Button
          size="md"
          variant="secondary"
          onClick={() => {
            emitMetric(METRIC_NAMES.recoverAccountFinished);
            if (isChrome()) {
              navigateTo(ROUTES.pinExtension);
            } else {
              window.close();
            }
          }}
        >
          {t("I have my recovery phrase safe")}
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
    <React.Fragment>
      <View.Header />
      <View.Content alignment="center">
        <Onboarding layout="full" customWidth="31rem">
          <OnboardingHeader>
            {t("Wallet created successfully!")}
          </OnboardingHeader>
          <div className="FullscreenSuccessMessage__content-wrapper">
            {IS_MNEMONIC_PHRASE_STATE ? (
              <MnemonicPhraseConfirmedMessage />
            ) : (
              <RecoverAccountSuccessMessage />
            )}
          </div>
        </Onboarding>
      </View.Content>
    </React.Fragment>
  );
};
