import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";
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
import Form from "popup/components/Form";
import {
  ApiErrorMessage,
  FormError,
  FormRow,
  FormCheckboxField,
  FormCheckboxLabel,
  FormSubmitButton,
  FormTextField,
} from "popup/basics";
import {
  Onboarding,
  HalfScreen,
} from "popup/components/Layout/Fullscreen/Onboarding";

const RecoverAccount = () => {
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

  const handleSubmit = (values: FormValues) => {
    const { password, mnemonicPhrase } = values;
    dispatch(recoverAccount({ password, mnemonicPhrase }));
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
        <Form>
          <Onboarding
            header="Recover wallet from backup phrase"
            icon={icon}
            goBack={() => window.location.replace("/")}
          >
            <>
              <FormRow>
                <FormTextField
                  as="textarea"
                  name="mnemonicPhrase"
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
        </Form>
      )}
    </Formik>
  );
};

export default RecoverAccount;
