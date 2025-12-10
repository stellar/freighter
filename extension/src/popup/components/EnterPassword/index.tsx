import { Button, Text, Input } from "@stellar/design-system";
import { Field, Form, Formik, FieldProps } from "formik";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { View } from "popup/basics/layout/View";
import { authErrorSelector } from "popup/ducks/accountServices";

import "./styles.scss";

interface FormValues {
  password: string;
}

interface EnterPasswordProps {
  accountAddress?: string;
  title?: string;
  description?: string;
  onConfirm: (password: string) => Promise<void>;
  onCancel?: () => void;
  confirmButtonTitle?: string;
  cancelButtonTitle?: string;
}

export const EnterPassword = ({
  accountAddress,
  title,
  description,
  onConfirm,
  onCancel,
  confirmButtonTitle,
  cancelButtonTitle,
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

  const handleSubmit = async (values: FormValues) => {
    await onConfirm(values.password);
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

          <div className="EnterPassword__wrapper__formik">
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
                  <Field name="password">
                    {({ field }: FieldProps) => (
                      <Input
                        {...field}
                        id="password-input"
                        data-testid="enter-password-input"
                        isPassword
                        fieldSize="md"
                        autoComplete="off"
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
                      disabled={!(dirty && isValid)}
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
