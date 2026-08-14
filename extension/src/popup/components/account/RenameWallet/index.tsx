import React from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Button, Icon, Input } from "@stellar/design-system";
import { Field, FieldProps, Form, Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";

import { AppDispatch } from "popup/App";
import { Account } from "@shared/api/types";
import { updateAccountName } from "popup/ducks/accountServices";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";

import "./styles.scss";

interface FormValue {
  accountName: string;
}

// Matches the mobile app's ACCOUNT_NAME_MIN_LENGTH / ACCOUNT_NAME_MAX_LENGTH.
const ACCOUNT_NAME_MIN_LENGTH = 1;
const ACCOUNT_NAME_MAX_LENGTH = 24;

interface RenameWalletProps {
  allAccounts: Account[];
  publicKey: string;
  onClose: () => void;
  onSubmit: () => void;
}

export const RenameWallet = ({
  allAccounts,
  publicKey,
  onClose,
  onSubmit,
}: RenameWalletProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const account = allAccounts.find(
    (account) => account.publicKey === publicKey,
  )!;
  const accountName = account.name;
  const initialValues: FormValue = {
    accountName,
  };
  const handleSubmit = async (values: FormValue) => {
    const newAccountName = values.accountName.trim();
    // Submitting an unchanged name is a no-op save, not a broken button, so
    // always close. Only touch storage when the name actually differs.
    if (newAccountName !== accountName) {
      await dispatch(
        updateAccountName({ accountName: newAccountName, publicKey }),
      );
      emitMetric(METRIC_NAMES.accountRenamed, { source: "wallets" });
      onSubmit();
    }
    onClose();
  };

  return (
    <div className="RenameWallet">
      <div className="RenameWallet__header">
        <div className="RenameWallet__header__actions">
          <button
            className="RenameWallet__close"
            onClick={onClose}
            data-testid="rename-wallet-close"
            aria-label={t("Close")}
          >
            <Icon.X />
          </button>
        </div>

        <div className="RenameWallet__identicon">
          <IdenticonImg publicKey={publicKey} />
        </div>
      </div>

      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={YupObject().shape({
          accountName: YupString()
            .trim()
            .max(ACCOUNT_NAME_MAX_LENGTH, t("max of 24 characters allowed")),
        })}
      >
        {({ errors, values }) => {
          // Trim before measuring so a whitespace-only name counts as empty.
          const trimmedName = values.accountName.trim();
          const isNameValid =
            trimmedName.length >= ACCOUNT_NAME_MIN_LENGTH &&
            trimmedName.length <= ACCOUNT_NAME_MAX_LENGTH;

          return (
            <Form className="RenameWallet__form">
              <Field name="accountName">
                {({ field }: FieldProps) => (
                  <Input
                    data-testid="rename-wallet-input"
                    autoFocus
                    fieldSize="md"
                    autoComplete="off"
                    id="accountName"
                    placeholder={accountName}
                    maxLength={ACCOUNT_NAME_MAX_LENGTH}
                    {...field}
                    error={errors.accountName}
                  />
                )}
              </Field>
              <div className="RenameWallet__actions">
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
                <Button
                  isFullWidth
                  type="submit"
                  size="lg"
                  isRounded
                  variant="secondary"
                  disabled={!isNameValid}
                >
                  {t("Set name")}
                </Button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};
