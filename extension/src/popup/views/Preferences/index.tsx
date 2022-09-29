import React from "react";
import { Toggle } from "@stellar/design-system";
import { Field, Form, Formik } from "formik";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";

import { saveSettings, settingsSelector } from "popup/ducks/settings";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { AutoSaveFields } from "popup/components/AutoSave";

import "./styles.scss";

export const Preferences = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const {
    isDataSharingAllowed,
    isMemoValidationEnabled,
    isSafetyValidationEnabled,
    isExperimentalModeEnabled,
  } = useSelector(settingsSelector);

  interface SettingValues {
    isValidatingMemoValue: boolean;
    isValidatingSafetyValue: boolean;
    isDataSharingAllowedValue: boolean;
    isExperimentalModeEnabledValue: boolean;
  }

  const initialValues: SettingValues = {
    isValidatingMemoValue: isMemoValidationEnabled,
    isValidatingSafetyValue: isSafetyValidationEnabled,
    isDataSharingAllowedValue: isDataSharingAllowed,
    isExperimentalModeEnabledValue: isExperimentalModeEnabled,
  };

  const handleSubmit = async (formValue: SettingValues) => {
    const {
      isValidatingMemoValue,
      isValidatingSafetyValue,
      isDataSharingAllowedValue,
      isExperimentalModeEnabledValue,
    } = formValue;

    await dispatch(
      saveSettings({
        isMemoValidationEnabled: isValidatingMemoValue,
        isSafetyValidationEnabled: isValidatingSafetyValue,
        isDataSharingAllowed: isDataSharingAllowedValue,
        isExperimentalModeEnabled: isExperimentalModeEnabledValue,
      }),
    );
  };

  return (
    <div className="Preferences">
      <SubviewHeader title={t("Preferences")} />
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        <Form>
          <AutoSaveFields />
          <div className="Preferences--section">
            <div className="Preferences--section--title">
              {t("Verification with")} stellar.expert
            </div>
            <div className="Preferences--toggle">
              <label
                htmlFor="isValidatingMemoValue"
                className="Preferences--label"
              >
                {t(
                  "Validate addresses that require a memo (external app transactions only)",
                )}
              </label>
              <Toggle
                checked={initialValues.isValidatingMemoValue}
                customInput={<Field />}
                id="isValidatingMemoValue"
              />
            </div>

            <div className="Preferences--toggle">
              <label
                htmlFor="isValidatingSafetyValue"
                className="Preferences--label"
              >
                {t(
                  "Block malicious or unsafe addresses and domains (external app transactions only)",
                )}
              </label>
              <Toggle
                checked={initialValues.isValidatingSafetyValue}
                customInput={<Field />}
                id="isValidatingSafetyValue"
              />
            </div>
          </div>
          <div className="Preferences--section">
            <div className="Preferences--section--title">
              {t("Anonymous data sharing")}{" "}
            </div>

            <div className="Preferences--toggle">
              <label
                htmlFor="isDataSharingAllowedValue"
                className="Preferences--label"
              >
                {t(
                  "Allow Freighter to collect anonymous information about usage. Freighter will never collect your personal information such as IP address, keys, balance or transaction amounts.",
                )}
              </label>
              <Toggle
                checked={initialValues.isDataSharingAllowedValue}
                customInput={<Field />}
                id="isDataSharingAllowedValue"
              />
            </div>
          </div>
          <div className="Preferences--section">
            <div className="Preferences--section--title">
              {t("Enable experimental mode")}{" "}
            </div>

            <div className="Preferences--toggle">
              <label
                htmlFor="isExperimentalModeEnabledValue"
                className="Preferences--label"
              >
                {t(
                  "Allow Freighter to use experimental API‘s on a test network. Please proceed at your own risk as you may be interacting with schemas that are untested and still changing.",
                )}
              </label>
              <Toggle
                checked={initialValues.isExperimentalModeEnabledValue}
                customInput={<Field />}
                id="isExperimentalModeEnabledValue"
              />
            </div>
          </div>
        </Form>
      </Formik>
    </div>
  );
};
