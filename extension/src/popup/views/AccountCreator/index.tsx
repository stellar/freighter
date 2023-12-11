import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Input, Checkbox, Link, Button } from "@stellar/design-system";
import { Field, FieldProps, Formik, Form } from "formik";
import { object as YupObject } from "yup";
import { useTranslation } from "react-i18next";

import { showBackupPhrase } from "@shared/api/internal";
import {
  password as passwordValidator,
  confirmPassword as confirmPasswordValidator,
  termsOfUse as termsofUseValidator,
} from "popup/helpers/validators";
import {
  createAccount,
  publicKeySelector,
  authErrorSelector,
} from "popup/ducks/accountServices";
import { FormRows, SubmitButtonWrapper } from "popup/basics/Forms";

import { FullscreenStyle } from "popup/components/FullscreenStyle";
import {
  Onboarding,
  OnboardingScreen,
  OnboardingHalfScreen,
  OnboardingHeader,
} from "popup/components/Onboarding";
import { Header } from "popup/components/Header";
import { PasswordRequirements } from "popup/components/PasswordRequirements";

import { MnemonicPhrase } from "popup/views/MnemonicPhrase";

import "./styles.scss";

export const AccountCreator = () => {
  const publicKey = useSelector(publicKeySelector);
  const dispatch = useDispatch();
  const authError = useSelector(authErrorSelector);
  const { t } = useTranslation();
  const [mnemonicPhrase, setMnemonicPhrase] = useState("");

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
    const res = await showBackupPhrase(values.password);

    setMnemonicPhrase(res.mnemonicPhrase);
  };

  const AccountCreatorSchema = YupObject().shape({
    password: passwordValidator,
    confirmPassword: confirmPasswordValidator,
    termsOfUse: termsofUseValidator,
  });

  return mnemonicPhrase && publicKey ? (
    <MnemonicPhrase mnemonicPhrase={mnemonicPhrase} />
  ) : (
    <>
      <FullscreenStyle />
      <Header />
      <Onboarding hasGoBackBtn>
        <OnboardingScreen className="AccountCreator__screen">
          <OnboardingHeader className="AccountCreator__header">
            {t("Create a password")}
          </OnboardingHeader>
          <Formik
            initialValues={initialValues}
            onSubmit={handleSubmit}
            validationSchema={AccountCreatorSchema}
          >
            {({ isValid, dirty, isSubmitting, errors, touched }) => (
              <Form>
                <OnboardingHalfScreen className="AccountCreator__half-screen">
                  <FormRows>
                    <Field name="password">
                      {({ field }: FieldProps) => (
                        <Input
                          fieldSize="md"
                          autoComplete="off"
                          id="new-password-input"
                          placeholder={t("New password")}
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
                    <Field name="confirmPassword">
                      {({ field }: FieldProps) => (
                        <Input
                          fieldSize="md"
                          autoComplete="off"
                          id="confirm-password-input"
                          placeholder={t("Confirm password")}
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
                  </FormRows>
                  <PasswordRequirements />
                  <div>
                    <Field name="termsOfUse">
                      {({ field }: FieldProps) => (
                        <Checkbox
                          fieldSize="md"
                          autoComplete="off"
                          error={touched.termsOfUse ? errors.termsOfUse : null}
                          id="termsOfUse-input"
                          label={
                            <>
                              {t("I have read and agree to")}{" "}
                              <Link
                                variant="secondary"
                                href="https://stellar.org/terms-of-service"
                              >
                                {t("Terms of Use")}
                              </Link>
                            </>
                          }
                          {...field}
                        />
                      )}
                    </Field>
                  </div>
                  <SubmitButtonWrapper>
                    <Button
                      size="md"
                      isFullWidth
                      variant="primary"
                      type="submit"
                      isLoading={isSubmitting}
                      disabled={!(dirty && isValid)}
                    >
                      {t("Confirm")}
                    </Button>
                  </SubmitButtonWrapper>
                </OnboardingHalfScreen>
              </Form>
            )}
          </Formik>
        </OnboardingScreen>
      </Onboarding>
    </>
  );
};
