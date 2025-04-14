import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import { Formik } from "formik";
import { object as YupObject } from "yup";

import { showBackupPhrase } from "@shared/api/internal";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  password as passwordValidator,
  confirmPassword as confirmPasswordValidator,
  termsOfUse as termsofUseValidator,
} from "popup/helpers/validators";
import {
  createAccount,
  publicKeySelector,
  applicationStateSelector,
} from "popup/ducks/accountServices";
import { View } from "popup/basics/layout/View";

import {
  PasswordForm,
  initialValues,
  FormValues,
} from "popup/components/accountCreator/PasswordForm";
import { MnemonicPhrase } from "popup/views/MnemonicPhrase";
import { AppDispatch } from "popup/App";

import "./styles.scss";

export const AccountCreator = () => {
  const publicKey = useSelector(publicKeySelector);
  const applicationState = useSelector(applicationStateSelector);
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isRestartingOnboardingParam = params.get("isRestartingOnboarding");
  const isRestartingOnboarding = isRestartingOnboardingParam === "true";

  const isShowingOverwriteWarning =
    applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED;

  const [mnemonicPhrase, setMnemonicPhrase] = useState("");

  const handleSubmit = async (values: FormValues) => {
    await dispatch(
      createAccount({
        password: values.password,
        isOverwritingAccount:
          isShowingOverwriteWarning || isRestartingOnboarding,
      }),
    );
    const res = await showBackupPhrase({
      activePublicKey: null,
      password: values.password,
    });

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
    <React.Fragment>
      <View.Content
        alignment="center"
        data-testid="account-creator-view"
        hasNoTopPadding
        hasNoBottomPadding
      >
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={AccountCreatorSchema}
        >
          {({ isValid, dirty, isSubmitting, errors, touched, values }) => (
            <PasswordForm
              isValid={isValid}
              dirty={dirty}
              isSubmitting={isSubmitting}
              errors={errors}
              touched={touched}
              values={values}
              isShowingOverwriteWarning={isShowingOverwriteWarning}
              isShowingOnboardingWarning={isRestartingOnboarding}
            />
          )}
        </Formik>
      </View.Content>
    </React.Fragment>
  );
};
