import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, FieldProps, Formik } from "formik";
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

import { Form, FormRow } from "popup/basics/Forms";

import { FullscreenStyle } from "popup/components/FullscreenStyle";

import { Header } from "popup/components/Header";
import { PasswordRequirements } from "popup/components/PasswordRequirements";

import { Input, Checkbox, TextLink, Button } from "@stellar/design-system";

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
      <Header />
      <FullscreenStyle />
      <section className="AccountCreator--screen">
        <div className="AccountCreator--header">Create a password</div>
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={AccountCreatorSchema}
        >
          {({ isValid, dirty, isSubmitting, errors, touched }) => (
            <Form>
              <section className="AccountCreator--half-screen">
                <FormRow>
                  <Field name="password">
                    {({ field }: FieldProps) => (
                      <Input
                        autoComplete="off"
                        id="new-password-input"
                        placeholder="New password"
                        type="password"
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
                        type="password"
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
                <div className="AccountCreator--button-row">
                  <Button
                    fullWidth
                    isLoading={isSubmitting}
                    disabled={!(dirty && isValid)}
                  >
                    CONFIRM
                  </Button>
                </div>
              </section>
            </Form>
          )}
        </Formik>
      </section>
    </>
  );
};
