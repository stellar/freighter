import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Formik, FieldProps } from "formik";
import { object as YupObject } from "yup";

import { Onboarding } from "popup/components/Onboarding";
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
import { PasswordRequirements } from "popup/components/PasswordRequirements";

import { Input, Button, Checkbox, TextLink } from "@stellar/design-system";

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
      <Onboarding goBack={() => navigateTo(ROUTES.welcome)}>
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={RecoverAccountSchema}
        >
          {({ dirty, touched, isSubmitting, isValid, errors }) => (
            <Form>
              <div className="RecoverAccount__screen">
                <div className="RecoverAccount__half-screen">
                  <div className="RecoverAccount__header">
                    Import wallet from recovery phrase
                  </div>
                  <FormRow>
                    <div className="RecoverAccount__mnemonic-input">
                      <Field name="mnemonicPhrase">
                        {({ field }: FieldProps) => (
                          <>
                            <textarea
                              className="TextArea Card Card--highlight"
                              autoComplete="off"
                              id="mnemonic-input"
                              placeholder="Enter your 12 word phrase to restore your wallet"
                              {...field}
                            />
                            {/* TODO - add textarea to SDS */}
                            {authError ||
                              (errors.mnemonicPhrase && touched.mnemonicPhrase
                                ? errors.mnemonicPhrase
                                : "")}
                          </>
                        )}
                      </Field>
                    </div>
                  </FormRow>
                </div>
                <div className="RecoverAccount__half-screen">
                  <FormRow>
                    <Field name="password">
                      {({ field }: FieldProps) => (
                        <Input
                          autoComplete="off"
                          id="password-input"
                          placeholder="New password"
                          type="password"
                          error={
                            authError ||
                            (errors.password && touched.password
                              ? errors.password
                              : "")
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
                          type="password"
                          error={
                            authError ||
                            (errors.confirmPassword && touched.confirmPassword
                              ? errors.confirmPassword
                              : null)
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
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </Onboarding>
    </>
  );
};
