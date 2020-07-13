import React, { useEffect } from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";

import { history } from "popup/App";
import {
  password as passwordValidator,
  confirmPassword as confirmPasswordValidator,
  termsOfUse as termsofUseValidator,
} from "popup/components/Form/validators";
import {
  authErrorSelector,
  publicKeySelector,
  recoverAccount,
} from "popup/ducks/authServices";

import { HEADER_HEIGHT } from "popup/constants";

import {
  ApiErrorMessage,
  FormError,
  FormRow,
  FormCheckboxField,
  FormCheckboxLabel,
  FormSubmitButton,
  FormTextField,
} from "popup/basics";
import Form from "popup/components/Form";
import {
  Onboarding,
  HalfScreen,
} from "popup/components/Layout/Fullscreen/Onboarding";

const FullHeightForm = styled(Form)`
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
    mnemonicPhrase: YupString().required(),
    password: passwordValidator,
    confirmPassword: confirmPasswordValidator,
    termsOfUse: termsofUseValidator,
  });

  const dispatch = useDispatch();

  const handleSubmit = async (values: FormValues) => {
    const { password, mnemonicPhrase } = values;
    await dispatch(recoverAccount({ password, mnemonicPhrase }));
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
      {({ handleChange, isSubmitting, isValid }) => (
        <FullHeightForm>
          <Onboarding
            header="Recover wallet from backup phrase"
            icon={icon}
            isMaxHeaderLength
            goBack={() => history.push({ pathname: "/" })}
          >
            <>
              <FormRow>
                <FormTextField
                  as="textarea"
                  name="mnemonicPhrase"
                  placeholder="Enter your 12 word phrase to restore your wallet"
                  onChange={handleChange}
                />
                <FormError name="mnemonicPhrase" />
                <ApiErrorMessage error={authError}></ApiErrorMessage>
              </FormRow>
              <HalfScreen>
                <FormRow>
                  <FormTextField
                    autoComplete="off"
                    name="password"
                    placeholder="Define new password"
                    type="password"
                  />
                  <FormError name="password" />
                </FormRow>
                <FormRow>
                  <FormTextField
                    autoComplete="off"
                    name="confirmPassword"
                    placeholder="Confirm password"
                    type="password"
                  />
                  <FormError name="confirmPassword" />
                </FormRow>
                <FormRow>
                  <FormCheckboxField name="termsOfUse" />
                  <FormCheckboxLabel htmlFor="termsOfUse">
                    I have read and agree to <a href="/ac">Terms of Use</a>
                  </FormCheckboxLabel>
                  <FormError name="termsOfUse" />
                </FormRow>
                <FormRow>
                  <FormSubmitButton
                    buttonCTA="Recover"
                    isSubmitting={isSubmitting}
                    isValid={isValid}
                  />
                </FormRow>
              </HalfScreen>
            </>
          </Onboarding>
        </FullHeightForm>
      )}
    </Formik>
  );
};
