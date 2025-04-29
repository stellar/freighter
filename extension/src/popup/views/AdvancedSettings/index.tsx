import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Notification, Button, Toggle, Loader } from "@stellar/design-system";
import { Field, Form, Formik } from "formik";

import { saveExperimentalFeatures } from "popup/ducks/settings";
import { SettingsState } from "@shared/api/types";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { AutoSaveFields } from "popup/components/AutoSave";
import { View } from "popup/basics/layout/View";
import IconExperimental from "popup/assets/icon-settings-experimental.svg";

import "./styles.scss";
import { AppDispatch } from "popup/App";
import { useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";

interface AdvancedSettingFeatureParams {
  title: string;
  isLoading: boolean;
  isToggled: boolean;
  toggleId: string;
  description: string | React.ReactNode;
}

const AdvancedSettingFeature = ({
  title,
  isLoading,
  isToggled,
  toggleId,
  description,
}: AdvancedSettingFeatureParams) => (
  <div className="AdvancedSettings__feature">
    <div className="AdvancedSettings__feature__row">
      <div className="AdvancedSettings__feature__row__title">
        <div className="AdvancedSettings__feature__row__icon">
          <img src={IconExperimental} alt="icon experimental feature" />
        </div>
        <span>{title}</span>
        {isLoading ? (
          <div className="AdvancedSettings__feature__row__loader">
            <Loader />
          </div>
        ) : null}
      </div>
      <div
        className="AdvancedSettings__feature__row__toggle"
        data-testid={toggleId}
      >
        <Toggle
          fieldSize="md"
          checked={isToggled}
          customInput={<Field />}
          id={toggleId}
        />
      </div>
    </div>
    <div className="AdvancedSettings__feature__description">{description}</div>
  </div>
);

export const AdvancedSettings = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isUnderstood, setIsUnderstood] = useState(false);
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

  const {
    isExperimentalModeEnabled,
    isHashSigningEnabled,
    experimentalFeaturesState,
    isNonSSLEnabled,
  } = state.data.settings;

  interface SettingValues {
    isExperimentalModeEnabledValue: boolean;
    isHashSigningEnabledValue: boolean;
    isNonSSLEnabledValue: boolean;
  }

  const initialValues: SettingValues = {
    isExperimentalModeEnabledValue: isExperimentalModeEnabled,
    isHashSigningEnabledValue: isHashSigningEnabled,
    isNonSSLEnabledValue: isNonSSLEnabled,
  };

  const handleSubmit = async (formValue: SettingValues) => {
    const {
      isExperimentalModeEnabledValue,
      isHashSigningEnabledValue,
      isNonSSLEnabledValue,
    } = formValue;

    await dispatch(
      saveExperimentalFeatures({
        isExperimentalModeEnabled: isExperimentalModeEnabledValue,
        isHashSigningEnabled: isHashSigningEnabledValue,
        isNonSSLEnabled: isNonSSLEnabledValue,
      }),
    );
  };

  const isLoading = experimentalFeaturesState === SettingsState.LOADING;

  return isUnderstood ? (
    <>
      <SubviewHeader title={t("Advanced Settings")} />
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        <View.Content hasNoTopPadding>
          <Form>
            <AutoSaveFields />
            <AdvancedSettingFeature
              title={t("Use Futurenet")}
              isLoading={isLoading}
              isToggled={initialValues.isExperimentalModeEnabledValue}
              toggleId="isExperimentalModeEnabledValue"
              description={t(
                "Use experimental API’s and connect to the Futurenet, a test network. Please proceed at your own risk as you may be interacting with schemas that are untested and still changing.",
              )}
            />
            <AdvancedSettingFeature
              title={t("Enable Blind Signing on Ledger")}
              isLoading={isLoading}
              isToggled={initialValues.isHashSigningEnabledValue}
              toggleId="isHashSigningEnabledValue"
              description={
                <>
                  {t(
                    "This can be used to sign arbitrary transaction hashes without having to decode them first. Ledger will not display the transaction details in the device display prior to signing so make sure you only interact with applications you know and trust.",
                  )}{" "}
                  <a
                    href="https://www.ledger.com/academy/enable-blind-signing-why-when-and-how-to-stay-safe/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("Learn More")}
                  </a>
                </>
              }
            />
            <AdvancedSettingFeature
              title={t("Connect to domain without SSL certificate")}
              isLoading={isLoading}
              isToggled={initialValues.isNonSSLEnabledValue}
              toggleId="isNonSSLEnabledValue"
              description={t(
                "Allow Freighter to connect to domains that do not have an SSL certificate on Mainnet. SSL certificates provide an encrypted network connection and also provide proof of ownership of the domain. Use caution when connecting to domains without an SSL certificate.",
              )}
            />
          </Form>
        </View.Content>
      </Formik>
    </>
  ) : (
    <>
      <SubviewHeader title={t("Important")} />
      <View.Content hasNoTopPadding>
        <div className="AdvancedSettings__column">
          <Notification
            variant="warning"
            title={t(
              "Advanced settings are not recommended for new or unexperienced users. Enabling these may impact the security of your wallets and result in loss of funds. Only utilize these features if you can understand and manage the potential security risks.",
            )}
          />
          <div className="AdvancedSettings__understood-buttons">
            <Button
              size="md"
              variant="error"
              isFullWidth
              onClick={() => setIsUnderstood(true)}
            >
              {t("I understand, continue")}
            </Button>
            <Button
              size="md"
              variant="tertiary"
              isFullWidth
              onClick={() => navigate(-1)}
            >
              {t("Go back")}
            </Button>
          </div>
        </div>
      </View.Content>
    </>
  );
};
