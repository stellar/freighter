import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { TransactionData } from "types/transactions";
import { getAssetFromCanonical } from "helpers/stellar";

interface TransactionReceipt {
  transactionData: TransactionData;
  isSwap: boolean;
}

export const TransactionReceipt = ({
  transactionData,
  isSwap,
}: TransactionReceipt) => {
  const { t } = useTranslation();
  const { asset } = transactionData;

  const sourceAsset = getAssetFromCanonical(asset);

  const renderPageTitle = (isSwap: boolean) => {
    return isSwap ? t("Swapped") : `${t("Sent")} ${sourceAsset.code}`;
  };

  return (
    <>
      <SubviewHeader
        title={renderPageTitle(isSwap)}
        customBackIcon={<Icon.XClose />}
      />
    </>
  );
};
