import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Input } from "@stellar/design-system";
import { Field, FieldProps, Form, Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";

import { MAX_ACCOUNT_NAME_LENGTH } from "@shared/helpers/accountName";
import { SheetHeader, SheetHeaderLayout } from "popup/components/SheetHeader";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";

import "./styles.scss";

interface FormValue {
  accountName: string;
}

// Matches the mobile app's ACCOUNT_NAME_MIN_LENGTH / ACCOUNT_NAME_MAX_LENGTH.
const ACCOUNT_NAME_MIN_LENGTH = 1;

interface AccountNameFormProps {
  title: string;
  initialName: string;
  /** The account's address, for its identicon. Absent before it exists. */
  publicKey?: string;
  submitLabel: string;
  /** Shows Cancel beside the submit button, as rename does. */
  showCancel?: boolean;
  onSubmit: (accountName: string) => void | Promise<void>;
  onClose: () => void;
  testIdPrefix: string;
}

/**
 * The account name sheet body. Rename uses it with Cancel / Set name; the
 * create flows use it with a prefilled default and a single Create or Next.
 */
export const AccountNameForm = ({
  title,
  initialName,
  publicKey,
  submitLabel,
  showCancel = false,
  onSubmit,
  onClose,
  testIdPrefix,
}: AccountNameFormProps) => {
  const { t } = useTranslation();

  return (
    <div className="AccountNameForm">
      <SheetHeader
        layout={SheetHeaderLayout.Centered}
        title={title}
        onClose={onClose}
        closeTestId={`${testIdPrefix}-close`}
      />

      <div className="AccountNameForm__identicon">
        {publicKey ? (
          <IdenticonImg publicKey={publicKey} />
        ) : (
          <div className="AccountNameForm__identicon__placeholder">
            <Icon.Wallet02 />
          </div>
        )}
      </div>

      <Formik
        initialValues={{ accountName: initialName } as FormValue}
        onSubmit={(values) => onSubmit(values.accountName.trim())}
        validationSchema={YupObject().shape({
          accountName: YupString()
            .trim()
            .max(MAX_ACCOUNT_NAME_LENGTH, t("max of 24 characters allowed")),
        })}
      >
        {({ errors, values, isSubmitting }) => {
          // Trim before measuring so a whitespace-only name counts as empty.
          const trimmedName = values.accountName.trim();
          const isNameValid =
            trimmedName.length >= ACCOUNT_NAME_MIN_LENGTH &&
            trimmedName.length <= MAX_ACCOUNT_NAME_LENGTH;

          return (
            <Form className="AccountNameForm__form">
              <Field name="accountName">
                {({ field }: FieldProps) => (
                  <Input
                    data-testid={`${testIdPrefix}-input`}
                    autoFocus
                    fieldSize="md"
                    autoComplete="off"
                    id="accountName"
                    placeholder={initialName}
                    maxLength={MAX_ACCOUNT_NAME_LENGTH}
                    {...field}
                    error={errors.accountName}
                  />
                )}
              </Field>
              <div className="AccountNameForm__actions">
                {showCancel ? (
                  <Button
                    isFullWidth
                    type="button"
                    size="lg"
                    isRounded
                    variant="tertiary"
                    onClick={onClose}
                  >
                    {t("Cancel")}
                  </Button>
                ) : null}
                <Button
                  isFullWidth
                  type="submit"
                  size="lg"
                  isRounded
                  variant="secondary"
                  disabled={!isNameValid}
                  isLoading={isSubmitting}
                  data-testid={`${testIdPrefix}-submit`}
                >
                  {submitLabel}
                </Button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};
