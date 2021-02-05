import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import styled from "styled-components";

import { POPUP_WIDTH } from "constants/dimensions";
import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";

import { SubviewHeader } from "popup/basics/AccountSubview";

import {
  ApiErrorMessage,
  Error,
  FormRow,
  TextField,
  SubmitButton,
} from "popup/basics/Forms";

import { addAccount, authErrorSelector } from "popup/ducks/authServices";

const UnlockAccountEl = styled.div`
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  box-sizing: border-box;
  padding: 2rem 2.5rem;
`;

interface FormValues {
  password: string;
}

const initialValues: FormValues = {
  password: "",
};

export const AddAccount = () => {
  interface FormValues {
    password: string;
  }

  const dispatch = useDispatch();
  const authError = useSelector(authErrorSelector);

  const handleSubmit = async (values: FormValues) => {
    const { password } = values;
    await dispatch(addAccount(password));
    navigateTo(ROUTES.account);
  };

  return (
    <>
      <UnlockAccountEl>
        <SubviewHeader headerText="Enter password to continue" />
        <Formik initialValues={initialValues} onSubmit={handleSubmit}>
          {({ dirty, isSubmitting, isValid }) => (
            <>
              <FormRow>
                <TextField
                  autoComplete="off"
                  name="password"
                  placeholder="Enter password"
                  type="password"
                />
                <Error name="password" />
                <ApiErrorMessage error={authError}></ApiErrorMessage>
              </FormRow>
              <FormRow>
                <SubmitButton
                  dirty={dirty}
                  isSubmitting={isSubmitting}
                  isValid={isValid}
                >
                  Add new account
                </SubmitButton>
              </FormRow>
            </>
          )}
        </Formik>{" "}
      </UnlockAccountEl>
    </>
  );
};
