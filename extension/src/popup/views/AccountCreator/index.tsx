import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Input,
  Checkbox,
  Link,
  Button,
  Card,
  Heading,
  Icon,
} from "@stellar/design-system";
import { Field, FieldProps, Formik, Form } from "formik";
import { object as YupObject } from "yup";
import { useTranslation } from "react-i18next";

import { showBackupPhrase } from "@shared/api/internal";
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
import { View } from "popup/basics/layout/View";

import {
  Onboarding,
  OnboardingButtons,
  OnboardingOneCol,
} from "popup/components/Onboarding";
import { MnemonicPhrase } from "popup/views/MnemonicPhrase";

import "./styles.scss";

export const AccountCreator = () => {
  const publicKey = useSelector(publicKeySelector);
  const dispatch = useDispatch();
  const authError = useSelector(authErrorSelector);
  const { t } = useTranslation();
  const [mnemonicPhrase, setMnemonicPhrase] = useState("");

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
      >
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={AccountCreatorSchema}
        >
          {({ isValid, dirty, isSubmitting, errors, touched }) => (
            <div className="AccountCreator">
              <Onboarding layout="half">
                <Card variant="secondary">
                  <Heading as="h2" size="xs" weight="semi-bold">
                    {t("Create a Password")}
                  </Heading>
                  <div className="AccountCreator__subheading">
                    {t("This will be used to unlock your wallet")}
                  </div>
                  <Form>
                    <OnboardingOneCol>
                      <div className="AccountCreator__form-rows">
                        <Field name="password">
                          {({ field }: FieldProps) => (
                            <Input
                              data-testid="account-creator-password-input"
                              fieldSize="md"
                              autoComplete="off"
                              id="new-password-input"
                              placeholder={t("New password")}
                              type="password"
                              error={
                                authError ||
                                (errors.password && touched.password
                                  ? errors.password
                                  : "")
                              }
                              {...field}
                            />
                          )}
                        </Field>
                        <Field name="confirmPassword">
                          {({ field }: FieldProps) => (
                            <Input
                              data-testid="account-creator-confirm-password-input"
                              fieldSize="md"
                              autoComplete="off"
                              id="confirm-password-input"
                              placeholder={t("Confirm password")}
                              type="password"
                              error={
                                authError ||
                                (errors.confirmPassword &&
                                touched.confirmPassword
                                  ? errors.confirmPassword
                                  : null)
                              }
                              {...field}
                            />
                          )}
                        </Field>
                      </div>

                      <Field name="termsOfUse">
                        {({ field, form }: FieldProps) => (
                          <div className="AccountCreator__tos">
                            <Checkbox
                              data-testid="account-creator-termsOfUse-input"
                              fieldSize="md"
                              autoComplete="off"
                              error={
                                touched.termsOfUse ? errors.termsOfUse : null
                              }
                              id="termsOfUse-input"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  form.setFieldValue(
                                    "termsOfUse",
                                    !field.value,
                                  );
                                  e.currentTarget.checked = !field.value;
                                }
                              }}
                              label={
                                <div className="AccountCreator__tos__label">
                                  <span>
                                    {t("I have read and agree to")}{" "}
                                    <Link
                                      variant="secondary"
                                      href="https://stellar.org/terms-of-service"
                                    >
                                      {t("Terms of Use")}
                                    </Link>
                                  </span>
                                  <Icon.LinkExternal01 />
                                </div>
                              }
                              {...field}
                            />
                          </div>
                        )}
                      </Field>

                      <OnboardingButtons hasGoBackBtn>
                        <Button
                          data-testid="account-creator-submit"
                          size="lg"
                          variant="secondary"
                          type="submit"
                          isLoading={isSubmitting}
                          disabled={!(dirty && isValid)}
                        >
                          {t("Confirm")}
                        </Button>
                      </OnboardingButtons>
                    </OnboardingOneCol>
                  </Form>
                </Card>
              </Onboarding>
            </div>
          )}
        </Formik>
      </View.Content>
    </React.Fragment>
  );
};
