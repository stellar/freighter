import React from "react";
import { Icon, Toggle } from "@stellar/design-system";
import { Field, Formik } from "formik";
import { useSelector, useDispatch } from "react-redux";

import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/helpers/stellar";

import {
  saveSettings,
  settingsSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";

import { Form } from "popup/basics/Forms";
import { PopupWrapper } from "popup/basics/PopupWrapper";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { AutoSaveFields } from "popup/components/AutoSave";
import { BottomNav } from "popup/components/BottomNav";

import "./styles.scss";

interface RadioCheckProps {
  name: string;
  title: string;
  value: string;
}

const RadioCheck = ({ name, title, value }: RadioCheckProps) => (
  <label className="Preferences--label Preferences--radio-label">
    {title}
    <Field
      className="Preferences--radio-field"
      name={name}
      type="radio"
      value={value}
    />
    <div className="Preferences--radio-check">
      <Icon.Check />
    </div>
  </label>
);

export const Preferences = () => {
  const dispatch = useDispatch();
  const {
    isDataSharingAllowed,
    isMemoValidationEnabled,
    isSafetyValidationEnabled,
  } = useSelector(settingsSelector);
  const { network } = useSelector(settingsNetworkDetailsSelector);

  interface SettingValues {
    networkSelected: string;
    isValidatingMemoValue: boolean;
    isValidatingSafetyValue: boolean;
    isDataSharingAllowedValue: boolean;
  }

  const initialValues: SettingValues = {
    networkSelected: network,
    isValidatingMemoValue: isMemoValidationEnabled,
    isValidatingSafetyValue: isSafetyValidationEnabled,
    isDataSharingAllowedValue: isDataSharingAllowed,
  };

  const handleSubmit = async (formValue: SettingValues) => {
    const {
      networkSelected,
      isValidatingMemoValue,
      isValidatingSafetyValue,
      isDataSharingAllowedValue,
    } = formValue;

    await dispatch(
      saveSettings({
        isTestnet: networkSelected === TESTNET_NETWORK_DETAILS.network,
        isMemoValidationEnabled: isValidatingMemoValue,
        isSafetyValidationEnabled: isValidatingSafetyValue,
        isDataSharingAllowed: isDataSharingAllowedValue,
      }),
    );
  };

  return (
    <>
      <PopupWrapper>
        <SubviewHeader title="Preferences" />
        <div className="Preferences">
          <Formik
            initialValues={initialValues}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            <Form>
              <AutoSaveFields />
              <div className="Preferences--section">
                <div className="Preferences--section--title">Network</div>
                <RadioCheck
                  name="networkSelected"
                  title="Public Network"
                  value={MAINNET_NETWORK_DETAILS.network}
                />
                <RadioCheck
                  name="networkSelected"
                  title="Test Network"
                  value={TESTNET_NETWORK_DETAILS.network}
                />
              </div>
              <div className="Preferences--section">
                <div className="Preferences--section--title">
                  Verification with stellar.expert
                </div>
                <div className="Preferences--toggle">
                  <label
                    htmlFor="isValidatingMemoValue"
                    className="Preferences--label"
                  >
                    Validate addresses that require a memo
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
                    Block malicious or unsafe addresses and domains
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
                  Anonymous data sharing{" "}
                </div>

                <div className="Preferences--toggle">
                  <label
                    htmlFor="isDataSharingAllowedValue"
                    className="Preferences--label"
                  >
                    Allow Freighter to collect anonymous information about
                    usage. Freighter will never collect your personal
                    information such as IP address, keys, balance or transaction
                    amounts.
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
      </PopupWrapper>
      <BottomNav />
    </>
  );
};
