import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { Notification, Button, Toggle, Loader } from "@stellar/design-system";
import { Field, Form, Formik } from "formik";

import {
  saveExperimentalFeatures,
  settingsSelector,
} from "popup/ducks/settings";
import { SettingsState } from "@shared/api/types";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { AutoSaveFields } from "popup/components/AutoSave";
import { View } from "popup/basics/layout/View";
import IconExperimental from "popup/assets/icon-settings-experimental.svg";

import "./styles.scss";

export const ExperimentalFeatures = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const history = useHistory();
  const [isUnderstood, setIsUnderstood] = useState(false);

  const {
    isExperimentalModeEnabled,
    isHashSigningEnabled,
    experimentalFeaturesState,
  } = useSelector(settingsSelector);

  interface SettingValues {
    isExperimentalModeEnabledValue: boolean;
    isHashSigningEnabledValue: boolean;
  }

  const initialValues: SettingValues = {
    isExperimentalModeEnabledValue: isExperimentalModeEnabled,
    isHashSigningEnabledValue: isHashSigningEnabled,
  };

  const handleSubmit = async (formValue: SettingValues) => {
    const { isExperimentalModeEnabledValue, isHashSigningEnabledValue } =
      formValue;

    // eslint-disable-next-line
    await dispatch(
      saveExperimentalFeatures({
        isExperimentalModeEnabled: isExperimentalModeEnabledValue,
        isHashSigningEnabled: isHashSigningEnabledValue,
      }),
    );
  };

  const isLoading = experimentalFeaturesState === SettingsState.LOADING;

  return isUnderstood ? (
    <>
      <SubviewHeader title={t("Experimental Features")} />
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        <View.Content hasNoTopPadding>
          <Form>
            <AutoSaveFields />
            <div className="ExperimentalFeatures__feature">
              <div className="ExperimentalFeatures__feature__row">
                <div className="ExperimentalFeatures__feature__row__title">
                  <div className="ExperimentalFeatures__feature__row__icon">
                    <img
                      src={IconExperimental}
                      alt="icon experimental feature"
                    />
                  </div>
                  <span>{t("Use Futurenet")}</span>
                  {isLoading ? (
                    <div className="ExperimentalFeatures__feature__row__loader">
                      <Loader />
                    </div>
                  ) : null}
                </div>
                <div className="ExperimentalFeatures__feature__row__toggle">
                  <Toggle
                    checked={initialValues.isExperimentalModeEnabledValue}
                    customInput={<Field />}
                    id="isExperimentalModeEnabledValue"
                  />
                </div>
              </div>
              <div className="ExperimentalFeatures__feature__description">
                {t(
                  "Use experimental API’s and connect to the Futurenet, a test network. Please proceed at your own risk as you may be interacting with schemas that are untested and still changing.",
                )}
              </div>
            </div>
            <div className="ExperimentalFeatures__feature">
              <div className="ExperimentalFeatures__feature__row">
                <div className="ExperimentalFeatures__feature__row__title">
                  <div className="ExperimentalFeatures__feature__row__icon">
                    <img
                      src={IconExperimental}
                      alt="icon experimental feature"
                    />
                  </div>
                  <span>{t("Enable Blind Signing on Ledger")}</span>
                  {isLoading ? (
                    <div className="ExperimentalFeatures__feature__row__loader">
                      <Loader />
                    </div>
                  ) : null}
                </div>
                <div className="ExperimentalFeatures__feature__row__toggle">
                  <Toggle
                    checked={initialValues.isHashSigningEnabledValue}
                    customInput={<Field />}
                    id="isHashSigningEnabledValue"
                  />
                </div>
              </div>
              <div className="ExperimentalFeatures__feature__description">
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
              </div>
            </div>
          </Form>
        </View.Content>
      </Formik>
    </>
  ) : (
    <>
      <SubviewHeader title={t("Important")} />
      <View.Content hasNoTopPadding>
        <Notification
          variant="warning"
          title={t(
            "Experimental features are not recommended for new or unexperienced users. Enabling these may impact the security of your wallets and result in loss of funds. Only utilize these features if you can understand and manage the potential security risks.",
          )}
        />
        <div className="ExperimentalFeatures__understood-buttons">
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
            variant="primary"
            isFullWidth
            onClick={() => history.goBack()}
          >
            {t("Go back")}
          </Button>
        </div>
      </View.Content>
    </>
  );
};
