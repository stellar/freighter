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
  const { isDataSharingAllowed, isMemoValidationEnabled, isHideDustEnabled } =
    useSelector(settingsSelector);

  interface SettingValues {
    isValidatingMemoValue: boolean;
    isDataSharingAllowedValue: boolean;
    isHideDustEnabledValue: boolean;
  }

  const initialValues: SettingValues = {
    isValidatingMemoValue: isMemoValidationEnabled,
    isDataSharingAllowedValue: isDataSharingAllowed,
    isHideDustEnabledValue: isHideDustEnabled,
  };

  const handleSubmit = async (formValue: SettingValues) => {
    const {
      isValidatingMemoValue,
      isDataSharingAllowedValue,
      isHideDustEnabledValue,
    } = formValue;

    // eslint-disable-next-line
    await dispatch(
      saveSettings({
        isMemoValidationEnabled: isValidatingMemoValue,
        isDataSharingAllowed: isDataSharingAllowedValue,
        isHideDustEnabled: isHideDustEnabledValue,
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
                    fieldSize="md"
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
                    fieldSize="md"
                    checked={initialValues.isDataSharingAllowedValue}
                    customInput={<Field />}
                    id="isDataSharingAllowedValue"
                  />
                </div>
              </div>

              <div className="Preferences--section">
                <div className="Preferences--section--title">
                  {t("Hide small payments")}{" "}
                </div>

                <div className="Preferences--toggle">
                  <label
                    htmlFor="isHideDustEnabledValue"
                    className="Preferences--label"
                  >
                    {t("Hide payments smaller than 0.1 XLM")}
                  </label>
                  <Toggle
                    fieldSize="md"
                    checked={initialValues.isHideDustEnabledValue}
                    customInput={<Field />}
                    id="isHideDustEnabledValue"
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
