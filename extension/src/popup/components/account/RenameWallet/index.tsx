import React from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Button, Icon, Input } from "@stellar/design-system";
import { Field, FieldProps, Form, Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";

import { AppDispatch } from "popup/App";
import { Account } from "@shared/api/types";
import { View } from "popup/basics/layout/View";
import { updateAccountName } from "popup/ducks/accountServices";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";

import "./styles.scss";

interface FormValue {
  accountName: string;
}

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
    const { accountName: newAccountName } = values;
    if (accountName !== newAccountName) {
      await dispatch(
        updateAccountName({ accountName: newAccountName, publicKey }),
      );
      emitMetric(METRIC_NAMES.accountRenamed, { source: "wallets" });
      onSubmit();
      onClose();
    }
  };

  return (
    <View.Content hasNoTopPadding>
      <div className="RenameWallet">
        <button
          className="RenameWallet__close"
          onClick={onClose}
          data-testid="rename-wallet-close"
          aria-label={t("Close")}
        >
          <Icon.X />
        </button>

        <div className="RenameWallet__identicon">
          <IdenticonImg publicKey={publicKey} />
        </div>

        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={YupObject().shape({
            accountName: YupString().max(24, t("max of 24 characters allowed")),
          })}
        >
          {({ errors }) => (
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
                    maxLength={24}
                    {...field}
                    error={errors.accountName}
                  />
                )}
              </Field>
              <div className="RenameWallet__actions">
                <Button
                  type="button"
                  size="md"
                  isRounded
                  variant="tertiary"
                  onClick={onClose}
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" size="md" isRounded variant="secondary">
                  {t("Set name")}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </View.Content>
  );
};
