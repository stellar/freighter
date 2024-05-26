import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import { Notification, Button, Toggle } from "@stellar/design-system";
import { Field, Form, Formik } from "formik";

import {
  saveExperimentalFeatures,
  settingsSelector,
} from "popup/ducks/settings";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { AutoSaveFields } from "popup/components/AutoSave";
import { View } from "popup/basics/layout/View";
import IconExperimental from "popup/assets/icon-settings-experimental.svg";

import "./styles.scss";

export const ExperimentalFeatures = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [isUnderstood, setIsUnderstood] = useState(false);

  const { isExperimentalModeEnabled, isHashSigningEnabled } =
    useSelector(settingsSelector);

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
                <div className="ExperimentalFeatures__feature__row__icon">
                  <img src={IconExperimental} alt="icon experimental feature" />
                </div>
                <div className="ExperimentalFeatures__feature__row__title">
                  {t("Use Futurenet")}
                </div>
                <Toggle
                  checked={initialValues.isExperimentalModeEnabledValue}
                  customInput={<Field />}
                  id="isExperimentalModeEnabledValue"
                />
              </div>
              <div className="ExperimentalFeatures__feature__description">
                {t(
                  "Use experimental API‘s and connect to the Futurenet, a test network. Please proceed at your own risk as you may be interacting with schemas that are untested and still changing.",
                )}
              </div>
            </div>
            <div className="ExperimentalFeatures__feature">
              <div className="ExperimentalFeatures__feature__row">
                <div className="ExperimentalFeatures__feature__row__icon">
                  <img src={IconExperimental} alt="icon experimental feature" />
                </div>
                <div className="ExperimentalFeatures__feature__row__title">
                  {t("Allow Ledger to sign arbitrary hashes")}
                </div>
                <Toggle
                  checked={initialValues.isHashSigningEnabledValue}
                  customInput={<Field />}
                  id="isHashSigningEnabledValue"
                />
              </div>
              <div className="ExperimentalFeatures__feature__description">
                {t(
                  "This can be used to sign arbitrary transaction hashes without having to decode them first.",
                )}
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
            "Experimental features are advised for advanced users only. Enabling these may impact the security of your wallets and result in loss of funds.",
          )}
        >
          {t("Do not continue if you‘re not sure about what you're doing")}
        </Notification>
        <div className="ExperimentalFeatures__understood-buttons">
          <Button
            size="md"
            variant="error"
            isFullWidth
            onClick={() => setIsUnderstood(true)}
          >
            {t("I understand, continue")}
          </Button>
          <Button size="md" variant="primary" isFullWidth>
            {t("Go back")}
          </Button>
        </div>
      </View.Content>
    </>
  );
};
