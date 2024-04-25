import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Input, Button } from "@stellar/design-system";
import shuffle from "lodash/shuffle";
import { Redirect } from "react-router-dom";
import { Field, FieldProps, Formik, Form } from "formik";
import { object as YupObject } from "yup";
import { useTranslation } from "react-i18next";

import { showBackupPhrase } from "@shared/api/internal";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

import { password as passwordValidator } from "popup/helpers/validators";
import {
  authErrorSelector,
  applicationStateSelector,
  confirmPassword,
} from "popup/ducks/accountServices";
import { ROUTES } from "popup/constants/routes";
import {
  Onboarding,
  OnboardingButtons,
  OnboardingHeader,
  OnboardingOneCol,
} from "popup/components/Onboarding";
import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";
import { View } from "popup/basics/layout/View";
import { FormRows } from "popup/basics/Forms";

interface FormValues {
  password: string;
}

const initialValues: FormValues = {
  password: "",
};

interface MnemonicPhraseProps {
  mnemonicPhrase: string;
}

export const MnemonicPhrase = ({
  mnemonicPhrase: mnemonicPhraseProp = "",
}: MnemonicPhraseProps) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const authError = useSelector(authErrorSelector);
  const applicationState = useSelector(applicationStateSelector);

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [mnemonicPhrase, setMnemonicPhrase] = useState("");

  React.useEffect(() => {
    setMnemonicPhrase(mnemonicPhraseProp);
  }, [mnemonicPhraseProp]);

  const handleSubmit = async (values: FormValues) => {
    // eslint-disable-next-line
    await dispatch(confirmPassword(values.password));
    const res = await showBackupPhrase(values.password);

    setMnemonicPhrase(res.mnemonicPhrase);
  };

  const AccountCreatorSchema = YupObject().shape({
    password: passwordValidator,
  });

  if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
    return <Redirect to={ROUTES.pinExtension} />;
  }

  if (mnemonicPhrase) {
    return isConfirmed ? (
      <React.Fragment>
        <View.Header />
        <View.Content alignment="center">
          <Onboarding layout="full" customWidth="31rem">
            <ConfirmMnemonicPhrase
              words={shuffle(mnemonicPhrase.split(" "))}
              customBackAction={() => setIsConfirmed(false)}
              hasGoBackBtn
            />
          </Onboarding>
        </View.Content>
      </React.Fragment>
    ) : (
      <React.Fragment>
        <View.Header />
        <View.Content alignment="center">
          <Onboarding layout="full">
            <DisplayMnemonicPhrase
              mnemonicPhrase={mnemonicPhrase}
              setIsConfirmed={setIsConfirmed}
            />
          </Onboarding>
        </View.Content>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <View.Header />
      <View.Content alignment="center">
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={AccountCreatorSchema}
        >
          {({ isValid, dirty, isSubmitting, errors, touched }) => (
            <Onboarding layout="half">
              <OnboardingHeader>
                {t("Log in to your account.")}
              </OnboardingHeader>
              <Form>
                <OnboardingOneCol>
                  <FormRows>
                    <Field name="password">
                      {({ field }: FieldProps) => (
                        <Input
                          fieldSize="md"
                          autoComplete="off"
                          id="password-input"
                          placeholder={t("Enter password")}
                          type="password"
                          error={
                            authError ||
                            (errors.password && touched.password
                              ? errors.password
                              : null)
                          }
                          {...field}
                        />
                      )}
                    </Field>
                  </FormRows>

                  <OnboardingButtons hasGoBackBtn>
                    <Button
                      size="md"
                      variant="tertiary"
                      type="submit"
                      isLoading={isSubmitting}
                      disabled={!(dirty && isValid)}
                    >
                      {t("Log In")}
                    </Button>
                  </OnboardingButtons>
                </OnboardingOneCol>
              </Form>
            </Onboarding>
          )}
        </Formik>
      </View.Content>
    </React.Fragment>
  );
};
