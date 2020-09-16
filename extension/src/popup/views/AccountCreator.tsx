import React, { useEffect } from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import { object as YupObject } from "yup";

import { navigateTo } from "popup/helpers/navigateTo";
import { createAccount, publicKeySelector } from "popup/ducks/authServices";

import { Onboarding, HalfScreen } from "popup/components/Onboarding";
import {
  Form,
  SubmitButton,
  Error,
  FormRow,
  CheckboxField,
  TextField,
} from "popup/basics/Forms";
import {
  password as passwordValidator,
  confirmPassword as confirmPasswordValidator,
  termsOfUse as termsofUseValidator,
} from "popup/helpers/validators";
import { EMOJI } from "popup/constants/emoji";

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
      navigateTo("/mnemonic-phrase");
    }
  }, [publicKey]);

  return (
    <Onboarding
      header="Create a password"
      subheader="Min 10 characters"
      icon={EMOJI.see_no_evil}
      goBack={() => navigateTo("/")}
    >
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={AccountCreatorSchema}
      >
        {({ isSubmitting, isValid }) => (
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
                <SubmitButton isSubmitting={isSubmitting} isValid={isValid}>
                  Log In
                </SubmitButton>
              </FormRow>
            </ModifiedHalfScreenEl>
          </Form>
        )}
      </Formik>
    </Onboarding>
  );
};
