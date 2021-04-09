import React from "react";
import styled from "styled-components";
import { Formik } from "formik";
import { useSelector, useDispatch } from "react-redux";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { ROUTES } from "popup/constants/routes";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/helpers/stellar";

import {
  saveSettings,
  settingsSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import { navigateTo } from "popup/helpers/navigate";

import { SubviewHeader, SubviewWrapper } from "popup/basics/AccountSubview";
import {
  Form,
  FormRow,
  CheckboxField,
  RadioField,
  SubmitButton,
} from "popup/basics/Forms";

const SettingRowEl = styled.div`
  margin-bottom: 2.8rem;
`;
const FormRowEl = styled.div`
  margin-top: 2.5rem;
`;
const SubheaderEl = styled.h2`
  color: ${COLOR_PALETTE.primary};
  font-size: 1.43rem;
  font-weight: ${FONT_WEIGHT.normal};
`;
const RadioFieldEl = styled(RadioField)`
  margin-bottom: 0.625rem;
`;
const SettingsLabelEl = styled.span`
  width: 21.375rem;
`;
const SettingsCheckboxFieldEl = styled(CheckboxField)`
  align-items: flex-start;
`;

export const Settings = () => {
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
    navigateTo(ROUTES.account);
  };

  return (
    <SubviewWrapper>
      <SubviewHeader headerText="Settings" />
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        <Form>
          <SettingRowEl>
            <SubheaderEl>Network</SubheaderEl>
            <FormRow>
              <RadioFieldEl
                name="networkSelected"
                label={<SettingsLabelEl>Public network</SettingsLabelEl>}
                value={MAINNET_NETWORK_DETAILS.network}
              />
              <RadioFieldEl
                name="networkSelected"
                label={<SettingsLabelEl>Test network</SettingsLabelEl>}
                value={TESTNET_NETWORK_DETAILS.network}
              />
            </FormRow>
          </SettingRowEl>
          <SettingRowEl>
            <SubheaderEl>Verification with stellar.expert</SubheaderEl>
            <FormRow>
              <CheckboxField
                name="isValidatingMemoValue"
                label={
                  <SettingsLabelEl>
                    Validate addresses that require a memo
                  </SettingsLabelEl>
                }
              />
            </FormRow>
            <FormRow>
              <CheckboxField
                name="isValidatingSafetyValue"
                label={
                  <SettingsLabelEl>
                    Block malicious or unsafe addresses and domains
                  </SettingsLabelEl>
                }
              />
            </FormRow>
          </SettingRowEl>
          <SettingRowEl>
            <SubheaderEl>Anonymous data sharing</SubheaderEl>
            <FormRow>
              <SettingsCheckboxFieldEl
                name="isDataSharingAllowedValue"
                label={
                  <SettingsLabelEl>
                    Allow Freighter to collect anonymous information about
                    usage. Freighter will never collect your personal
                    information such as IP address, keys, balance or transaction
                    amounts.
                  </SettingsLabelEl>
                }
              />
            </FormRow>
          </SettingRowEl>
          <FormRowEl>
            <SubmitButton>Save settings</SubmitButton>
          </FormRowEl>
        </Form>
      </Formik>
    </SubviewWrapper>
  );
};
