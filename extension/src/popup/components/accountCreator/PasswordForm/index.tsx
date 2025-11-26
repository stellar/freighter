import React from "react";
import { useSelector } from "react-redux";
import {
  Input,
  Checkbox,
  Link,
  Button,
  Card,
  Heading,
  Icon,
  Notification,
} from "@stellar/design-system";
import { Field, FieldProps, Form, FormikErrors, FormikTouched } from "formik";
import { useTranslation } from "react-i18next";

import {
  Onboarding,
  OnboardingButtons,
  OnboardingOneCol,
} from "popup/components/Onboarding";
import { authErrorSelector } from "popup/ducks/accountServices";

import "./styles.scss";

export interface FormValues {
  password: string;
  confirmPassword: string;
  termsOfUse: boolean;
}

interface PasswordFormProps {
  isValid: boolean;
  dirty: boolean;
  isSubmitting: boolean;
  errors: FormikErrors<FormValues>;
  touched: FormikTouched<FormValues>;
  values: FormValues;
  handleSubmit?: (values: FormValues) => void;
  isShowingOverwriteWarning: boolean;
  isShowingOnboardingWarning?: boolean;
}

export const initialValues: FormValues = {
  password: "",
  confirmPassword: "",
  termsOfUse: false,
};

export const PasswordForm = ({
  isValid,
  dirty,
  isSubmitting,
  errors,
  touched,
  values,
  handleSubmit,
  isShowingOverwriteWarning,
  isShowingOnboardingWarning = false,
}: PasswordFormProps) => {
  const authError = useSelector(authErrorSelector);
  const { t } = useTranslation();

  return (
    <div className="PasswordForm">
      <Onboarding layout="half">
        <Card variant="secondary">
          <Heading as="h2" size="xs" weight="semi-bold">
            {t("Create a Password")}
          </Heading>
          <div className="PasswordForm__subheading">
            {t("This will be used to unlock your wallet")}
          </div>
          {isShowingOverwriteWarning && (
            <div className="PasswordForm__notification">
              <Notification
                variant="error"
                title={`${t("You are overwriting an existing account.")} ${t(
                  "You will permanently lose access to the account currently stored in Freighter.",
                )}`}
              />
            </div>
          )}
          {isShowingOnboardingWarning && (
            <div className="PasswordForm__notification">
              <Notification
                variant="error"
                title={`${t("You previously did not complete onboarding.")} ${t(
                  "You will permanently lose access to the account you started to create in Freighter.",
                )}`}
              />
            </div>
          )}
          <Form>
            <OnboardingOneCol>
              <div className="PasswordForm__form-rows">
                <Field name="password">
                  {({ field }: FieldProps) => (
                    <Input
                      autoFocus
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
                        (errors.confirmPassword && touched.confirmPassword
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
                  <div className="PasswordForm__tos">
                    <Checkbox
                      data-testid="account-creator-termsOfUse-input"
                      fieldSize="md"
                      autoComplete="off"
                      error={touched.termsOfUse ? errors.termsOfUse : null}
                      id="termsOfUse-input"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          form.setFieldValue("termsOfUse", !field.value);
                          e.currentTarget.checked = !field.value;
                        }
                      }}
                      label={
                        <div className="PasswordForm__tos__label">
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
                  isLoading={isSubmitting}
                  disabled={!(dirty && isValid)}
                  {...(handleSubmit
                    ? { onClick: () => handleSubmit(values), type: "button" }
                    : { type: "submit" })}
                >
                  {t("Confirm")}
                </Button>
              </OnboardingButtons>
            </OnboardingOneCol>
          </Form>
        </Card>
      </Onboarding>
    </div>
  );
};
