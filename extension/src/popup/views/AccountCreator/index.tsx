import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

import { Formik } from "formik";
import { object as YupObject } from "yup";

import { showBackupPhrase } from "@shared/api/internal";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  password as passwordValidator,
  confirmPassword as confirmPasswordValidator,
  termsOfUse as termsofUseValidator,
} from "popup/helpers/validators";
import { createAccount } from "popup/ducks/accountServices";
import { View } from "popup/basics/layout/View";

import {
  PasswordForm,
  initialValues,
  FormValues,
} from "popup/components/accountCreator/PasswordForm";
import { MnemonicPhrase } from "popup/views/MnemonicPhrase";
import { AppDispatch } from "popup/App";
import { useGetAccountCreatorData } from "./hooks/useGetAccountCreatorData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { ROUTES } from "popup/constants/routes";

import "./styles.scss";

export const AccountCreator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isRestartingOnboardingParam = params.get("isRestartingOnboarding");
  const isRestartingOnboarding = isRestartingOnboardingParam === "true";

  const { state: accountData, fetchData } = useGetAccountCreatorData();

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    accountData.state === RequestState.IDLE ||
    accountData.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  const hasError = accountData.state === RequestState.ERROR;
  if (accountData.data?.type === "re-route") {
    if (accountData.data.shouldOpenTab) {
      openTab(newTabHref(accountData.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${accountData.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (
    !hasError &&
    accountData.data.type === "resolved" &&
    (accountData.data.applicationState === APPLICATION_STATE.PASSWORD_CREATED ||
      accountData.data.applicationState ===
        APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    window.close();
  }

  const publicKey = accountData.data?.publicKey!;

  const isShowingOverwriteWarning =
    accountData.data!.applicationState ===
    APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED;

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
