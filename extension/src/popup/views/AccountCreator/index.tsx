import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Input, Checkbox, TextLink, Button } from "@stellar/design-system";
import { Field, FieldProps, Formik, Form } from "formik";
import { object as YupObject } from "yup";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
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
import { FormError, FormRows, SubmitButtonWrapper } from "popup/basics/Forms";

import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { Onboarding } from "popup/components/Onboarding";
import { Header } from "popup/components/Header";
import { PasswordRequirements } from "popup/components/PasswordRequirements";

import "./styles.scss";

export const AccountCreator = () => {
  const publicKey = useSelector(publicKeySelector);
  const dispatch = useDispatch();
  const authError = useSelector(authErrorSelector);

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
      <FullscreenStyle />
      <Header />
      <Onboarding goBack={() => navigateTo(ROUTES.welcome)}>
        <section className="AccountCreator__screen">
          <div className="AccountCreator__header">Create a password</div>
          <Formik
            initialValues={initialValues}
            onSubmit={handleSubmit}
            validationSchema={AccountCreatorSchema}
          >
            {({ isValid, dirty, isSubmitting, errors, touched }) => (
              <Form>
                <section className="AccountCreator__half-screen">
                  <FormRows>
                    <Field name="password">
                      {({ field }: FieldProps) => (
                        <Input
                          autoComplete="off"
                          id="new-password-input"
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
                  </FormRows>
                  <PasswordRequirements />
                  <div>
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
                  </div>
                  {/* TODO - add error to Checkbox in SDS */}
                  {touched.termsOfUse ? (
                    <FormError>{errors.termsOfUse}</FormError>
                  ) : null}
                  <SubmitButtonWrapper>
                    <Button
                      fullWidth
                      type="submit"
                      isLoading={isSubmitting}
                      disabled={!(dirty && isValid)}
                    >
                      CONFIRM
                    </Button>
                  </SubmitButtonWrapper>
                </section>
              </Form>
            )}
          </Formik>
        </section>
      </Onboarding>
    </>
  );
};
