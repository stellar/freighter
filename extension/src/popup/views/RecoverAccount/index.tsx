import React, { useEffect } from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { Field, Formik, FieldProps } from "formik";
import { object as YupObject } from "yup";

// import { HEADER_HEIGHT } from "constants/dimensions";

// ALEC TODO - why is this needed here but not in MnemonicPhrase.tsx?
import { FullscreenStyle } from "popup/components/FullscreenStyle";

import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";
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
} from "popup/ducks/accountServices";

import { FormRow, Form } from "popup/basics/Forms";

import { Header } from "popup/components/Header";
import { HalfScreen } from "popup/components/Onboarding";
import { PasswordRequirements } from "popup/components/PasswordRequirements";

import { Input, Button, Checkbox, TextLink } from "@stellar/design-system";

const HalfScreenEl = styled(HalfScreen)`
  display: flex;
  flex-direction: column;
  justify-content: start;
  padding: 2rem 0 2rem 1.55rem;
  width: 27rem;
`;

const Screen = styled.div`
  display: flex;
  flex-flow: row wrap;
  align-content: center;
  justify-content: space-between;
  // TODO - use HEADER_HEIGHT constant
  height: calc(100vh - 119px);
  max-height: 40rem;
  max-width: 57rem;
  width: 100%;
  margin: auto;
`;
const TextHeader = styled.div`
  font-size: 2.5rem;
  line-height: 3rem;
  font-weight: var(--font-weight-normal);
  color: var(--pal-text-primary);
  text-align: left;
  margin-bottom: 2rem;
`;

const MnemonicPhrase = styled.div`
  height: 10rem;
  width: 24rem;
`;

import "./styles.scss";

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
  };

  useEffect(() => {
    if (publicKey) {
      navigateTo(ROUTES.recoverAccountSuccess);
      window.close();
    }
  }, [publicKey]);

  return (
    <>
      <Header />
      <FullscreenStyle />
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={RecoverAccountSchema}
      >
        {({ dirty, touched, isSubmitting, isValid, errors }) => (
          <Form>
            <Screen>
              <HalfScreenEl>
                <TextHeader>Import wallet from recovery phrase</TextHeader>
                <FormRow>
                  <MnemonicPhrase>
                    <Field name="mnemonic-input">
                      {({ field }: FieldProps) => (
                        <>
                          <textarea
                            className="TextArea Card Card--highlight"
                            autoComplete="off"
                            id="mnemonic-input"
                            placeholder="Enter your 12 word phrase to restore your wallet"
                            {...field}
                          />
                          {/* ALEC TODO - do something */}
                          {authError}
                        </>
                      )}
                    </Field>
                  </MnemonicPhrase>
                </FormRow>
              </HalfScreenEl>
              <HalfScreenEl>
                <FormRow>
                  <Field name="password">
                    {({ field }: FieldProps) => (
                      <Input
                        autoComplete="off"
                        id="password-input"
                        placeholder="New password"
                        type="text"
                        error={
                          authError || (errors.password && touched.password)
                            ? errors.password
                            : ""
                        }
                        {...field}
                      />
                    )}
                  </Field>
                </FormRow>
                <FormRow>
                  <Field name="confirmPassword">
                    {({ field }: FieldProps) => (
                      <Input
                        autoComplete="off"
                        id="confirm-password-input"
                        placeholder="Confirm password"
                        type="text"
                        error={
                          authError ||
                          (errors.confirmPassword && touched.confirmPassword)
                            ? errors.confirmPassword
                            : null
                        }
                        {...field}
                      />
                    )}
                  </Field>
                </FormRow>
                <PasswordRequirements />
                <FormRow>
                  <Field name="termsOfUse">
                    {({ field }: FieldProps) => (
                      <Checkbox
                        autoComplete="off"
                        id="termsOfUse-input"
                        label={
                          <span>
                            I have read and agree to{" "}
                            <TextLink
                              variant={TextLink.variant.secondary}
                              href="https://stellar.org/terms-of-service"
                            >
                              Terms of Use
                            </TextLink>
                          </span>
                        }
                        {...field}
                      />
                    )}
                  </Field>
                </FormRow>
                {/* TODO - add error to Checkbox in SDS */}
                {errors.termsOfUse && touched.termsOfUse
                  ? errors.termsOfUse
                  : null}
                <FormRow>
                  <div className="RecoverAccount__button-row">
                    <Button
                      fullWidth
                      isLoading={isSubmitting}
                      disabled={!(dirty && isValid)}
                    >
                      IMPORT
                    </Button>
                  </div>
                </FormRow>
              </HalfScreenEl>
            </Screen>
          </Form>
        )}
      </Formik>
    </>
  );
};
