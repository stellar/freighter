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
  settingsDataSharingSelector,
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
const NetworkRadioLabelEl = styled.span`
  width: 21.375rem;
`;
const CheckboxFieldEl = styled(CheckboxField)`
  align-items: flex-start;
`;

export const Settings = () => {
  const dispatch = useDispatch();
  const userDataSharingSetting = useSelector(settingsDataSharingSelector);
  const { network } = useSelector(settingsNetworkDetailsSelector);

  interface SettingValues {
    isDataSharingAllowed: boolean;
    networkSelected: string;
  }

  const initialValues: SettingValues = {
    isDataSharingAllowed: userDataSharingSetting,
    networkSelected: network,
  };

  const handleSubmit = async (formValue: SettingValues) => {
    const { isDataSharingAllowed, networkSelected } = formValue;

    await dispatch(
      saveSettings({
        isDataSharingAllowed,
        isTestnet: networkSelected === TESTNET_NETWORK_DETAILS.network,
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
                label={
                  <NetworkRadioLabelEl>Public network</NetworkRadioLabelEl>
                }
                value={MAINNET_NETWORK_DETAILS.network}
              />
              <RadioFieldEl
                name="networkSelected"
                label={<NetworkRadioLabelEl>Test network</NetworkRadioLabelEl>}
                value={TESTNET_NETWORK_DETAILS.network}
              />
            </FormRow>
          </SettingRowEl>
          <SettingRowEl>
            <SubheaderEl>Anonymous data sharing</SubheaderEl>
            <FormRow>
              <CheckboxFieldEl
                name="isDataSharingAllowed"
                label={
                  <span>
                    Allow Freighter to collect anonymous information about
                    usage. Freighter will never collect your personal
                    information such as IP address, keys, balance or transaction
                    amounts.
                  </span>
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
