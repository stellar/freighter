import React from "react";
import { Toggle } from "@stellar/design-system";
import { Field, Form, Formik } from "formik";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { View } from "popup/basics/layout/View";

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
    isValidatingSafeAssetsEnabled,
    isExperimentalModeEnabled,
  } = useSelector(settingsSelector);

  interface SettingValues {
    isValidatingMemoValue: boolean;
    isValidatingSafetyValue: boolean;
    isDataSharingAllowedValue: boolean;
    isValidatingSafeAssetsValue: boolean;
    isExperimentalModeEnabledValue: boolean;
  }

  const initialValues: SettingValues = {
    isValidatingMemoValue: isMemoValidationEnabled,
    isValidatingSafetyValue: isSafetyValidationEnabled,
    isDataSharingAllowedValue: isDataSharingAllowed,
    isValidatingSafeAssetsValue: isValidatingSafeAssetsEnabled,
    isExperimentalModeEnabledValue: isExperimentalModeEnabled,
  };

  const handleSubmit = async (formValue: SettingValues) => {
    const {
      isValidatingMemoValue,
      isValidatingSafetyValue,
      isDataSharingAllowedValue,
      isValidatingSafeAssetsValue,
      isExperimentalModeEnabledValue,
    } = formValue;

    await dispatch(
      saveSettings({
        isMemoValidationEnabled: isValidatingMemoValue,
        isSafetyValidationEnabled: isValidatingSafetyValue,
        isDataSharingAllowed: isDataSharingAllowedValue,
        isValidatingSafeAssetsEnabled: isValidatingSafeAssetsValue,
        isExperimentalModeEnabled: isExperimentalModeEnabledValue,
      }),
    );
  };

  return (
    <React.Fragment>
      <SubviewHeader title={t("Preferences")} />
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        <View.Content hasNoTopPadding>
          <div className="Preferences">
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
                    {t("Validate addresses that require a memo")}
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
                    {t("Block malicious or unsafe addresses and domains")}
                  </label>
                  <Toggle
                    checked={initialValues.isValidatingSafetyValue}
                    customInput={<Field />}
                    id="isValidatingSafetyValue"
                  />
                </div>

                <div className="Preferences--toggle">
                  <label
                    htmlFor="isValidatingSafeAssetsValue"
                    className="Preferences--label"
                  >
                    {t("Block trustlines to malicious or fraudulent assets")}
                  </label>
                  <Toggle
                    checked={initialValues.isValidatingSafeAssetsValue}
                    customInput={<Field />}
                    id="isValidatingSafeAssetsValue"
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
                      "Freighter will use experimental API‘s and connect to the Futurenet, a test network. Please proceed at your own risk as you may be interacting with schemas that are untested and still changing.",
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
          </div>
        </View.Content>
      </Formik>
    </React.Fragment>
  );
};
