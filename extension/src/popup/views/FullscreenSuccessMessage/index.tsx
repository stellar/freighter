import React from "react";
import { useTranslation } from "react-i18next";
import { Text, Icon } from "@stellar/design-system";

import { emitMetric } from "helpers/metrics";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { Onboarding, OnboardingModal } from "popup/components/Onboarding";
import { View } from "popup/basics/layout/View";

import LogoWelcome from "popup/assets/logo-freighter-welcome-2.svg";

import "./styles.scss";

export const FullscreenSuccessMessage = () => {
  const { t } = useTranslation();

  emitMetric(METRIC_NAMES.recoverAccountFinished);

  return (
    <>
      <div className="FullscreenSuccessMessage__pin">
        <div className="FullscreenSuccessMessage__pin__row">
          {t("Pin Freighter to the toolbar")}
        </div>
        <div className="FullscreenSuccessMessage__pin__row">
          <div className="FullscreenSuccessMessage__pin__row__gradient"></div>
          <div className="FullscreenSuccessMessage__pin__row__toolbar">
            <Icon.PuzzlePiece01 />
          </div>
        </div>
        <div className="FullscreenSuccessMessage__pin__row">
          <div className="FullscreenSuccessMessage__pin__row__logo">
            <img src={LogoWelcome} alt={t("Freighter logo")} />
          </div>
          <div className="FullscreenSuccessMessage__pin__row__text">
            {t("Freighter - Stellar Wallet")}
          </div>
          <div className="FullscreenSuccessMessage__pin__row__pin-icon">
            <Icon.Pin01 />
          </div>
        </div>
      </div>
      <View.Content alignment="center" hasNoTopPadding>
        <div className="FullscreenSuccessMessage">
          <Onboarding layout="half">
            <OnboardingModal
              headerText={t("You’re all set!")}
              bodyText={
                <div className="FullscreenSuccessMessage__text">
                  <Text as="p" size="md">
                    {t(
                      "To access your wallet, click Freighter from your browser Extensions browser menu.",
                    )}
                  </Text>
                </div>
              }
            >
              <div className="FullscreenSuccessMessage__infoBlock">
                <div className="FullscreenSuccessMessage__infoBlock__row">
                  <div className="FullscreenSuccessMessage__infoBlock__row__icon">
                    <Icon.Globe01 />
                  </div>
                  <div className="FullscreenSuccessMessage__infoBlock__row__text">
                    {t(
                      "Always check the domain of websites you're using Freighter with",
                    )}
                  </div>
                </div>
                <div className="FullscreenSuccessMessage__infoBlock__row">
                  <div className="FullscreenSuccessMessage__infoBlock__row__icon">
                    <Icon.LockKeyholeSquare />
                  </div>
                  <div className="FullscreenSuccessMessage__infoBlock__row__text">
                    {t(
                      "Freighter cannot recover your account if you lose your recovery phrase, so keep it safe",
                    )}
                  </div>
                </div>
              </div>
            </OnboardingModal>
          </Onboarding>
        </div>
      </View.Content>
    </>
  );
};
