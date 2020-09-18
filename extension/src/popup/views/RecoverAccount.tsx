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
  mnemonicPhrase as mnemonicPhraseValidator,
} from "popup/helpers/validators";
import {
  authErrorSelector,
  publicKeySelector,
  recoverAccount,
} from "popup/ducks/authServices";

import { HEADER_HEIGHT } from "constants/dimensions";

import {
  ApiErrorMessage,
  Error,
  FormRow,
  CheckboxField,
  TextField,
  SubmitButton,
  Form,
} from "popup/basics/Forms";
import { Onboarding, HalfScreen } from "popup/components/Onboarding";

const FullHeightFormEl = styled(Form)`
  height: calc(100vh - ${HEADER_HEIGHT}px);

  section {
    & > * {
      flex: 0 1 6.25rem;
    }
  }
`;

export const RecoverAccount = () => {
  const publicKey = useSelector(publicKeySelector);
  const authError = useSelector(authErrorSelector);

  interface FormValues {
    password: string;
    confirmPassword: string;
    mnemonicPhrase: string;
    termsOfUse: boolean;
  }

  const initialValues: FormValues = {
    password: "",
    confirmPassword: "",
    mnemonicPhrase: "",
    termsOfUse: false,
  };

  const RecoverAccountSchema = YupObject().shape({
    mnemonicPhrase: mnemonicPhraseValidator,
    password: passwordValidator,
    confirmPassword: confirmPasswordValidator,
    termsOfUse: termsofUseValidator,
  });

  const dispatch = useDispatch();

  const handleSubmit = async (values: FormValues) => {
    const { password, mnemonicPhrase } = values;
    await dispatch(
      recoverAccount({
        password,
        mnemonicPhrase: mnemonicPhrase.trim(),
      }),
    );
    navigateTo(ROUTES.recoverAccountSuccess);
  };

  useEffect(() => {
    if (publicKey) {
      window.close();
    }
  }, [publicKey]);

  const icon = {
    emoji: "🕵",
    alt: "Spy",
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={RecoverAccountSchema}
    >
      {({ isSubmitting, isValid }) => (
        <FullHeightFormEl>
          <Onboarding
            header="Recover wallet from backup phrase"
            icon={icon}
            isMaxHeaderLength
            goBack={() => navigateTo(ROUTES.welcome)}
          >
            <>
              <FormRow>
                <TextField
                  component="textarea"
                  name="mnemonicPhrase"
                  placeholder="Enter your 12 word phrase to restore your wallet"
                />
                <Error name="mnemonicPhrase" />
                <ApiErrorMessage error={authError}></ApiErrorMessage>
              </FormRow>
              <HalfScreen>
                <FormRow>
                  <TextField
                    autoComplete="off"
                    name="password"
                    placeholder="Define new password"
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
                <FormRow>
                  <CheckboxField
                    label={
                      <span>
                        I have read and agree to <a href="/ac">Terms of Use</a>
                      </span>
                    }
                    name="termsOfUse"
                  />
                  <Error name="termsOfUse" />
                </FormRow>
                <FormRow>
                  <SubmitButton isSubmitting={isSubmitting} isValid={isValid}>
                    Recover
                  </SubmitButton>
                </FormRow>
              </HalfScreen>
            </>
          </Onboarding>
        </FullHeightFormEl>
      )}
    </Formik>
  );
};
