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
  const { isDataSharingAllowed, isMemoValidationEnabled, isNonSSLEnabled } =
    useSelector(settingsSelector);

  interface SettingValues {
    isValidatingMemoValue: boolean;
    isDataSharingAllowedValue: boolean;
    isNonSSLEnabledValue: boolean;
  }

  const initialValues: SettingValues = {
    isValidatingMemoValue: isMemoValidationEnabled,
    isDataSharingAllowedValue: isDataSharingAllowed,
    isNonSSLEnabledValue: isNonSSLEnabled,
  };

  const handleSubmit = async (formValue: SettingValues) => {
    const {
      isValidatingMemoValue,
      isDataSharingAllowedValue,
      isNonSSLEnabledValue,
    } = formValue;

    // eslint-disable-next-line
    await dispatch(
      saveSettings({
        isMemoValidationEnabled: isValidatingMemoValue,
        isDataSharingAllowed: isDataSharingAllowedValue,
        isNonSSLEnabled: isNonSSLEnabledValue,
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
                  {t("Connect to domain without SSL certificate")}{" "}
                </div>

                <div className="Preferences--toggle">
                  <label
                    htmlFor="isNonSSLEnabledValue"
                    className="Preferences--label"
                  >
                    {t(
                      "Allow Freighter to connect to domains that do not have an SSL certificate on Mainnet. SSL certificates provide an encrypted network connection and also provide proof of ownership of the domain. Use caution when connecting to domains without an SSL certificate.",
                    )}
                  </label>
                  <Toggle
                    checked={initialValues.isNonSSLEnabledValue}
                    customInput={<Field />}
                    id="isNonSSLEnabledValue"
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
