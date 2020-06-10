import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import {
  bool as YupBool,
  object as YupObject,
  string as YupString,
  ref as YupRef,
} from "yup";
import { createAccount, publicKeySelector } from "popup/ducks/authServices";
import Onboarding from "popup/components/Layout/Fullscreen/Onboarding";
import Form from "popup/components/Form";
import {
  FormError,
  FormRow,
  FormCheckboxField,
  FormCheckboxLabel,
  FormTextField,
} from "popup/basics";
import { history } from "popup/App";

const CreatePassword = () => {
  const publicKey = useSelector(publicKeySelector);
  const dispatch = useDispatch();

  interface InitialValues {
    password: string;
    confirmPassword: string;
    termsOfUse: boolean;
  }

  const initialValues: InitialValues = {
    password: "",
    confirmPassword: "",
    termsOfUse: false,
  };

  const handleSubmit = async (values: InitialValues) => {
    await dispatch(createAccount(values.password));
  };

  const CreatePasswordSchema = YupObject().shape({
    password: YupString()
      .min(10, "Password must be at least 10 characters long")
      .required("Password is required")
      .matches(/.*\d/, "Must contain a number")
      .matches(/.*[A-Z]/, "Must contain an uppercase letter")
      .matches(/.*[a-z]/, "Must contain a lowercase letter"),
    confirmPassword: YupString()
      .oneOf([YupRef("password")], "Passwords must match")
      .required("Password confirmation is required"),
    termsOfUse: YupBool().oneOf([true], "Terms of Use are required"),
  });

  useEffect(() => {
    if (publicKey) {
      history.push("/mnemonic-phrase");
    }
  }, [publicKey]);

  const icon = {
    emoji: "🙈",
    alt: "See No Evil",
  };

  return (
    <>
      <Onboarding
        header="Create a password"
        subheader="Min 10 characters"
        icon={icon}
        goBack={() => window.location.replace("/")}
      >
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={CreatePasswordSchema}
        >
          {({ isSubmitting, isValid }) => (
            <Form
              formCTA="Log in"
              isSubmitting={isSubmitting}
              isValid={isValid}
            >
              <>
                <FormRow>
                  <FormTextField
                    autoComplete="off"
                    name="password"
                    placeholder="New password"
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
              </>
            </Form>
          )}
        </Formik>
      </Onboarding>
    </>
  );
};

export default CreatePassword;
