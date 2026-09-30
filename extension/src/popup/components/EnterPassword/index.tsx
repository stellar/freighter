import { Button, Text, Input } from "@stellar/design-system";
import { Field, Form, Formik, FieldProps } from "formik";
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { View } from "popup/basics/layout/View";
import { authErrorSelector } from "popup/ducks/accountServices";

import "./styles.scss";

interface FormValues {
  password: string;
}

// Fixed username so password managers save and match one login for the
// unlock screen, whatever account is selected.
const AUTOFILL_USERNAME = "Freighter";

interface EnterPasswordProps {
  accountAddress?: string;
  title?: string;
  description?: string;
  onConfirm: (password: string) => Promise<void>;
  onCancel?: () => void;
  confirmButtonTitle?: string;
  cancelButtonTitle?: string;
  // Lets password managers save and fill the password. Only use it on the
  // unlock screen: re-checks before sensitive actions must be typed.
  allowAutofill?: boolean;
}

export const EnterPassword = ({
  accountAddress,
  title,
  description,
  onConfirm,
  onCancel,
  confirmButtonTitle,
  cancelButtonTitle,
  allowAutofill = false,
}: EnterPasswordProps) => {
  const { t } = useTranslation();
  const titleLabel = title || t("Enter your password");
  const descriptionLabel = `${
    description || t("Enter your account password to verify your account.")
  }`;
  const confirmLabel = confirmButtonTitle || t("Continue");
  const cancelLabel = cancelButtonTitle || t("Cancel");

  const initialValues: FormValues = {
    password: "",
  };

  const authError = useSelector(authErrorSelector);
  const formikWrapperRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (values: FormValues) => {
    let { password } = values;

    // Browsers can fill the field without sending a change event to the
    // page, so read the field directly when the form value is empty.
    if (allowAutofill && !password) {
      const input =
        formikWrapperRef.current?.querySelector<HTMLInputElement>(
          "#password-input",
        );
      password = input?.value || "";
    }

    if (!password) {
      return;
    }

    await onConfirm(password);
  };

  const handleReset = () => {
    onCancel?.();
  };

  return (
    <View.Content alignment="center">
      <div className="EnterPassword" data-testid="enter-password">
        <div className="EnterPassword__wrapper">
          {accountAddress && (
            <div className="EnterPassword__wrapper__identicon">
              <IdenticonImg publicKey={accountAddress} />
            </div>
          )}

          <Text as="div" size="md" weight="semi-bold">
            {titleLabel}
          </Text>

          <Text
            as="div"
            size="sm"
            addlClassName="EnterPassword__gray11 EnterPassword__text-centered"
          >
            {descriptionLabel}
          </Text>

          <div
            className="EnterPassword__wrapper__formik"
            ref={formikWrapperRef}
          >
            <Formik
              initialValues={initialValues}
              onSubmit={handleSubmit}
              onReset={handleReset}
            >
              {({
                dirty,
                isSubmitting,
                isValid,
                errors,
                touched,
                setFieldValue,
              }) => (
                <Form>
                  {allowAutofill && (
                    <input
                      className="EnterPassword__autofill-username"
                      type="text"
                      name="username"
                      autoComplete="username"
                      value={AUTOFILL_USERNAME}
                      readOnly
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                  )}
                  <Field name="password">
                    {({ field }: FieldProps) => (
                      <Input
                        {...field}
                        id="password-input"
                        data-testid="enter-password-input"
                        isPassword
                        fieldSize="md"
                        autoComplete={
                          allowAutofill ? "current-password" : "off"
                        }
                        autoFocus
                        placeholder={t("Enter password")}
                        onChange={(e) => {
                          e.stopPropagation();
                          const target = e.target as HTMLInputElement;
                          setFieldValue("password", target.value);
                        }}
                        error={
                          authError ||
                          (errors.password && touched.password
                            ? errors.password
                            : "")
                        }
                      />
                    )}
                  </Field>

                  <div className="EnterPassword__spacer-small" />

                  <div className="EnterPassword__wrapper__formik__buttons">
                    {onCancel && (
                      <Button
                        size="lg"
                        isFullWidth
                        isRounded
                        variant="tertiary"
                        type="reset"
                      >
                        {cancelLabel}
                      </Button>
                    )}

                    <Button
                      data-testid="enter-password-submit"
                      size="lg"
                      isFullWidth
                      isRounded
                      variant="secondary"
                      type="submit"
                      isLoading={isSubmitting}
                      disabled={!allowAutofill && !(dirty && isValid)}
                    >
                      {confirmLabel}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </View.Content>
  );
};
