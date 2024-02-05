import React from "react";
import { useTranslation } from "react-i18next";

import { FlaggedKeys } from "types/transactions";

import { TransactionHeading } from "popup/basics/TransactionHeading";

import { Operations } from "popup/components/signTransaction/Operations";

import "./styles.scss";

interface TransactionProps {
  flaggedKeys: FlaggedKeys;
  isMemoRequired: boolean;
  transaction: any;
}

export const Transaction = ({
  flaggedKeys,
  isMemoRequired,
  transaction,
}: TransactionProps) => {
  const { t } = useTranslation();
  const { operations } = transaction;

  const operationText =
    operations && operations.length > 1 ? t("Operations") : t("Operation");

  return (
    <div className="Transaction">
      {operations ? (
        <>
          <TransactionHeading>{operationText}</TransactionHeading>
          <Operations
            flaggedKeys={flaggedKeys}
            isMemoRequired={isMemoRequired}
            operations={operations}
          />
        </>
      ) : null}
    </div>
  );
};
