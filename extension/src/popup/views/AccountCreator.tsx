import React, { useEffect } from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import { object as YupObject } from "yup";

import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigateTo";
import {
  password as passwordValidator,
  confirmPassword as confirmPasswordValidator,
  termsOfUse as termsofUseValidator,
} from "popup/helpers/validators";
import { createAccount, publicKeySelector } from "popup/ducks/authServices";

import {
  Form,
  SubmitButton,
  Error,
  FormRow,
  CheckboxField,
  TextField,
} from "popup/basics/Forms";

import { Header } from "popup/components/Header";
import { Onboarding, HalfScreen } from "popup/components/Onboarding";
import { PasswordRequirements } from "popup/components/PasswordRequirements";

import CreatePasswordIllo from "popup/assets/illo-create-password.svg";

const ModifiedHalfScreenEl = styled(HalfScreen)`
  padding-left: 1.55rem;
`;

export const AccountCreator = () => {
  const publicKey = useSelector(publicKeySelector);
  const dispatch = useDispatch();

  interface FormValues {
    password: string;
    confirmPassword: string;
    termsOfUse: boolean;
  }

  const initialValues: FormValues = {
    password: "",
    confirmPassword: "",
    termsOfUse: false,
  };

  const handleSubmit = async (values: FormValues) => {
    await dispatch(createAccount(values.password));
  };

  const AccountCreatorSchema = YupObject().shape({
    password: passwordValidator,
    confirmPassword: confirmPasswordValidator,
    termsOfUse: termsofUseValidator,
  });

  useEffect(() => {
    if (publicKey) {
      navigateTo(ROUTES.mnemonicPhrase);
    }
  }, [publicKey]);

  return (
    <>
      <Header />
      <Onboarding
        header="Create a password"
        icon={CreatePasswordIllo}
        goBack={() => navigateTo(ROUTES.welcome)}
      >
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={AccountCreatorSchema}
        >
          {({ dirty, isSubmitting, isValid }) => (
            <Form>
              <ModifiedHalfScreenEl>
                <FormRow>
                  <TextField
                    autoComplete="off"
                    name="password"
                    placeholder="New password"
                    type="password"
                  />
                  <Error name="password" />
                </FormRow>
                <FormRow>
                  <TextField
                    autoComplete="off"
                    name="confirmPassword"
                    placeholder="Confirm password"
                    type="password"
                  />
                  <Error name="confirmPassword" />
                </FormRow>
                <PasswordRequirements />
                <FormRow>
                  <CheckboxField
                    name="termsOfUse"
                    label={
                      <span>
                        I have read and agree to <a href="/ac">Terms of Use</a>
                      </span>
                    }
                  />
                  <Error name="termsOfUse" />
                </FormRow>
                <FormRow>
                  <SubmitButton
                    dirty={dirty}
                    isSubmitting={isSubmitting}
                    isValid={isValid}
                  >
                    Log In
                  </SubmitButton>
                </FormRow>
              </ModifiedHalfScreenEl>
            </Form>
          )}
        </Formik>
      </Onboarding>
    </>
  );
};
