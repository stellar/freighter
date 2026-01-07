import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import { Formik } from "formik";
import { object as YupObject } from "yup";

import { showBackupPhrase } from "@shared/api/internal";
import {
  password as passwordValidator,
  confirmPassword as confirmPasswordValidator,
  termsOfUse as termsofUseValidator,
} from "popup/helpers/validators";
import { createAccount, publicKeySelector } from "popup/ducks/accountServices";
import { View } from "popup/basics/layout/View";

import {
  PasswordForm,
  initialValues,
  FormValues,
} from "popup/components/accountCreator/PasswordForm";
import { MnemonicPhrase } from "popup/views/MnemonicPhrase";
import { AppDispatch } from "popup/App";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { useGetAccountCreatorData } from "./hooks/useAccountCreatorData";

import "./styles.scss";

export const AccountCreator = () => {
  const publicKey = useSelector(publicKeySelector);
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isRestartingOnboardingParam = params.get("isRestartingOnboarding");
  const isRestartingOnboarding = isRestartingOnboardingParam === "true";
  const { state, fetchData } = useGetAccountCreatorData();
  const isOverWritingAccount =
    state.state === RequestState.SUCCESS &&
    (state.data.applicationState ===
      APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED ||
      state.data.applicationState === APPLICATION_STATE.PASSWORD_CREATED);

  const [mnemonicPhrase, setMnemonicPhrase] = useState("");

  const handleSubmit = async (values: FormValues) => {
    await dispatch(
      createAccount({
        password: values.password,
        isOverwritingAccount: isOverWritingAccount || isRestartingOnboarding,
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

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    state.state === RequestState.IDLE ||
    state.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

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
              isShowingOverwriteWarning={isOverWritingAccount}
              isShowingOnboardingWarning={isRestartingOnboarding}
            />
          )}
        </Formik>
      </View.Content>
    </React.Fragment>
  );
};
