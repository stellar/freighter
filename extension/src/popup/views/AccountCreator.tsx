import React, { useEffect } from "react";
import styled from "styled-components";
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

import { Form, FormRow, SubmitButton } from "popup/basics/Forms";

import { FullscreenStyle } from "popup/components/FullscreenStyle";

import { HEADER_HEIGHT } from "constants/dimensions";

import { Header } from "popup/components/Header";
import { HalfScreen } from "popup/components/Onboarding";
import { PasswordRequirements } from "popup/components/PasswordRequirements";

import { Input, Checkbox, TextLink } from "@stellar/design-system";

const HeaderEl = styled.div`
  font-size: 2.125rem;
  line-height: 1.2rem;
  font-weight: normal;
  color: var(--pal-text-primary);
  text-align: center;
`;

const ButtonRowEl = styled.div`
  padding: 1.5rem;
`;

const Screen = styled.section`
  display: flex;
  flex-flow: column wrap;
  align-content: center;
  justify-content: center;
  height: calc(100vh - ${HEADER_HEIGHT}px);
  max-height: 40rem;
  max-width: 57rem;
  width: 100%;
  margin: auto;
`;

const ModifiedHalfScreenEl = styled(HalfScreen)`
  padding-left: 1.55rem;
`;

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
      <Screen>
        <HeaderEl>Create a password</HeaderEl>
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={AccountCreatorSchema}
        >
          {({ isValid, dirty, isSubmitting, errors, touched }) => (
            <Form>
              <ModifiedHalfScreenEl>
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
                <ButtonRowEl>
                  <SubmitButton
                    dirty={dirty}
                    isSubmitting={isSubmitting}
                    isValid={isValid}
                  >
                    CONFIRM
                  </SubmitButton>
                </ButtonRowEl>
              </ModifiedHalfScreenEl>
            </Form>
          )}
        </Formik>
      </Screen>
    </>
  );
};
