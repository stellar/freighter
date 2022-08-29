import React from "react";
import { Toggle } from "@stellar/design-system";
import { Field, Form, Formik } from "formik";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";

import { NetworkDetails } from "@shared/constants/stellar";

import {
  saveSettings,
  settingsSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";

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
  } = useSelector(settingsSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  interface SettingValues {
    networkDetailsValue: NetworkDetails;
    isValidatingMemoValue: boolean;
    isValidatingSafetyValue: boolean;
    isDataSharingAllowedValue: boolean;
    isValidatingSafeAssetsValue: boolean;
  }

  const initialValues: SettingValues = {
    networkDetailsValue: networkDetails,
    isValidatingMemoValue: isMemoValidationEnabled,
    isValidatingSafetyValue: isSafetyValidationEnabled,
    isDataSharingAllowedValue: isDataSharingAllowed,
    isValidatingSafeAssetsValue: isValidatingSafeAssetsEnabled,
  };

  const handleSubmit = async (formValue: SettingValues) => {
    const {
      networkDetailsValue,
      isValidatingMemoValue,
      isValidatingSafetyValue,
      isDataSharingAllowedValue,
      isValidatingSafeAssetsValue,
    } = formValue;

    await dispatch(
      saveSettings({
        networkDetails: networkDetailsValue,
        isMemoValidationEnabled: isValidatingMemoValue,
        isSafetyValidationEnabled: isValidatingSafetyValue,
        isDataSharingAllowed: isDataSharingAllowedValue,
        isValidatingSafeAssetsEnabled: isValidatingSafeAssetsValue,
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
        </Form>
      </Formik>
    </div>
  );
};
