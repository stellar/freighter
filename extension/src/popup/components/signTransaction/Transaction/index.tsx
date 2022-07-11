import React from "react";
import { useTranslation } from "react-i18next";

import { FlaggedKeys } from "types/transactions";

import { TransactionHeading } from "popup/basics/TransactionHeading";

import { Operations } from "popup/components/signTransaction/Operations";

import "./styles.scss";

interface TransactionProps {
  flaggedKeys: FlaggedKeys;
  isMemoRequired: boolean;
  transaction: { [key: string]: any };
}

export const Transaction = ({
  flaggedKeys,
  isMemoRequired,
  transaction,
}: TransactionProps) => {
  const { t } = useTranslation();
  const { _operations } = transaction;

  const operationText =
    _operations && _operations.length > 1 ? t("Operations") : t("Operation");

  return (
    <div className="Transaction">
      {_operations ? (
        <>
          <TransactionHeading>{operationText}</TransactionHeading>
          <Operations
            flaggedKeys={flaggedKeys}
            isMemoRequired={isMemoRequired}
            operations={_operations}
          />
        </>
      ) : null}
    </div>
  );
};
