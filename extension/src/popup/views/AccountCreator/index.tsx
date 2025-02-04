import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

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

import "./styles.scss";

export const AccountCreator = () => {
  const publicKey = useSelector(publicKeySelector);
  const dispatch = useDispatch<AppDispatch>();

  const [mnemonicPhrase, setMnemonicPhrase] = useState("");

  const handleSubmit = async (values: FormValues) => {
    // eslint-disable-next-line
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
            />
          )}
        </Formik>
      </View.Content>
    </React.Fragment>
  );
};
