import React from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";

import { AppDispatch } from "popup/App";
import { Account } from "@shared/api/types";
import { updateAccountName } from "popup/ducks/accountServices";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AccountNameForm } from "popup/components/account/AccountNameForm";
import { emitMetric } from "helpers/metrics";

interface RenameWalletProps {
  allAccounts: Account[];
  /** `Account.id`: two accounts can share a public key. */
  accountId: string;
  onClose: () => void;
  onSubmit: () => void;
}

export const RenameWallet = ({
  allAccounts,
  accountId,
  onClose,
  onSubmit,
}: RenameWalletProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const account = allAccounts.find((account) => account.id === accountId)!;
  const { name: accountName, publicKey } = account;

  const handleSubmit = async (newAccountName: string) => {
    // Submitting an unchanged name is a no-op save, not a broken button, so
    // always close. Only touch storage when the name actually differs.
    if (newAccountName !== accountName) {
      await dispatch(
        updateAccountName({ accountName: newAccountName, id: accountId }),
      );
      emitMetric(METRIC_NAMES.accountRenamed, { source: "wallets" });
      onSubmit();
    }
    onClose();
  };

  return (
    <AccountNameForm
      title={t("Rename wallet")}
      initialName={accountName}
      publicKey={publicKey}
      submitLabel={t("Set name")}
      showCancel
      onSubmit={handleSubmit}
      onClose={onClose}
      testIdPrefix="rename-wallet"
    />
  );
};
