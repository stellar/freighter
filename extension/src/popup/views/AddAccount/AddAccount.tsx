import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";

import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";

import { SubviewHeader, SubviewWrapper } from "popup/basics/AccountSubview";

import {
  ApiErrorMessage,
  Error,
  FormRow,
  TextField,
  SubmitButton,
} from "popup/basics/Forms";

import { addAccount, authErrorSelector } from "popup/ducks/authServices";

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
      <SubviewWrapper>
        <SubviewHeader headerText="Add a new Stellar address" />
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
                  Add New Address
                </SubmitButton>
              </FormRow>
            </>
          )}
        </Formik>
      </SubviewWrapper>
    </>
  );
};
