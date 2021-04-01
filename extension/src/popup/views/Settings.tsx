import React from "react";
import styled from "styled-components";
import { Formik } from "formik";
import { useSelector, useDispatch } from "react-redux";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { ROUTES } from "popup/constants/routes";

import {
  saveSettings,
  settingsDataSharingSelector,
} from "popup/ducks/settings";
import { navigateTo } from "popup/helpers/navigate";

import { SubviewHeader, SubviewWrapper } from "popup/basics/AccountSubview";
import { Form, FormRow, CheckboxField, SubmitButton } from "popup/basics/Forms";

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
const CheckboxFieldEl = styled(CheckboxField)`
  align-items: flex-start;

  input {
    flex: 1 0 auto;
  }
`;

export const Settings = () => {
  const dispatch = useDispatch();
  const userDataSharingSetting = useSelector(settingsDataSharingSelector);

  interface SettingValues {
    isDataSharingAllowed: boolean;
  }

  const initialValues: SettingValues = {
    isDataSharingAllowed: userDataSharingSetting,
  };

  const handleSubmit = async (formValue: SettingValues) => {
    const { isDataSharingAllowed } = formValue;

    await dispatch(saveSettings({ isDataSharingAllowed, isTestnet: false }));
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
