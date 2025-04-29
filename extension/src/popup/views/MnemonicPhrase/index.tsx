import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Text, Icon, Notification } from "@stellar/design-system";

import { APPLICATION_STATE } from "@shared/constants/applicationState";

import { ROUTES } from "popup/constants/routes";
import { Onboarding, OnboardingModal } from "popup/components/Onboarding";
import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";
import { confirmMnemonicPhrase } from "popup/ducks/accountServices";
import { View } from "popup/basics/layout/View";
import { AppDispatch } from "popup/App";

import "./styles.scss";
import { useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";

interface MnemonicPhraseProps {
  mnemonicPhrase: string;
}

export const MnemonicPhrase = ({
  mnemonicPhrase = "",
}: MnemonicPhraseProps) => {
  const { t } = useTranslation();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(true);
  const dispatch = useDispatch<AppDispatch>();
  const { state, fetchData } = useGetAppData();

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    state.state === RequestState.IDLE ||
    state.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  if (state.state === RequestState.ERROR) {
    return (
      <div className="AddAsset__fetch-fail">
        <Notification
          variant="error"
          title={t("Failed to fetch your account data.")}
        >
          {t("Your account data could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (state.data?.type === "re-route") {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${state.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (
    state.data.type === "resolved" &&
    (state.data.account.applicationState ===
      APPLICATION_STATE.PASSWORD_CREATED ||
      state.data.account.applicationState ===
        APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    window.close();
  }
  const { applicationState } = state.data.account;

  const handleSkip = () => {
    // confirm the mnemonic phrase for the user

    dispatch(confirmMnemonicPhrase(mnemonicPhrase));
  };

  if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
    return <Navigate to={ROUTES.mnemonicPhraseConfirmed} />;
  }

  if (mnemonicPhrase) {
    if (isModalShowing) {
      return (
        <div
          className="MnemonicPhrase__view__wrapper"
          data-testid="MnemonicPhrase__modal"
        >
          <OnboardingModal
            headerText={t("Recovery Phrase")}
            bodyText={
              <>
                <Text as="p" size="md">
                  {t(
                    "Your recovery phrase gives you access to your account and is the only way to access it in a new browser. ",
                  )}
                  <span className="MnemonicPhrase__modal__text--highlight">
                    {t("Keep it in a safe place.")}
                  </span>
                </Text>
                <Text as="p" size="md">
                  {t(
                    "For your security, we'll check if you got it right in the next step.",
                  )}
                </Text>
              </>
            }
          >
            <div className="MnemonicPhrase__modal__rows">
              <div className="MnemonicPhrase__modal__row">
                <div className="MnemonicPhrase__modal__row__icon">
                  <Icon.Lock01 />
                </div>
                <div className="MnemonicPhrase__modal__row__text">
                  {t(
                    "Your recovery phrase gives you full access to your wallets and funds",
                  )}
                </div>
              </div>
              <div className="MnemonicPhrase__modal__row">
                <div className="MnemonicPhrase__modal__row__icon">
                  <Icon.Passcode />
                </div>
                <div className="MnemonicPhrase__modal__row__text">
                  {t(
                    "If you forget your password, you can use the recovery phrase to access your wallet",
                  )}
                </div>
              </div>
              <div className="MnemonicPhrase__modal__row">
                <div className="MnemonicPhrase__modal__row__icon">
                  <Icon.EyeOff />
                </div>
                <div className="MnemonicPhrase__modal__row__text">
                  {t("NEVER share this phrase with anyone")}
                </div>
              </div>
              <div className="MnemonicPhrase__modal__row">
                <div className="MnemonicPhrase__modal__row__icon">
                  <Icon.AlertCircle />
                </div>
                <div className="MnemonicPhrase__modal__row__text">
                  {t(
                    "No one from Stellar Development Foundation will ever ask for your recovery phrase",
                  )}
                </div>
              </div>
            </div>
            <div className="MnemonicPhrase__modal__footer">
              <Button
                variant="secondary"
                isFullWidth
                size="lg"
                onClick={() => setIsModalShowing(false)}
              >
                {t("Show recovery phrase")}
              </Button>
              <Button
                variant="tertiary"
                isFullWidth
                size="lg"
                onClick={handleSkip}
              >
                {t("Do this later")}
              </Button>
            </div>
          </OnboardingModal>
        </div>
      );
    }
    return isConfirmed ? (
      <div className="MnemonicPhrase__view__wrapper">
        <View.Content alignment="center" hasNoTopPadding>
          <Onboarding layout="full" customWidth="31rem">
            <ConfirmMnemonicPhrase mnemonicPhrase={mnemonicPhrase} />
          </Onboarding>
        </View.Content>
      </div>
    ) : (
      <div className="MnemonicPhrase__view__wrapper">
        <View.Content alignment="center" hasNoTopPadding>
          <Onboarding layout="full">
            <DisplayMnemonicPhrase
              mnemonicPhrase={mnemonicPhrase}
              setIsConfirmed={setIsConfirmed}
            />
          </Onboarding>
        </View.Content>
      </div>
    );
  }

  return null;
};
