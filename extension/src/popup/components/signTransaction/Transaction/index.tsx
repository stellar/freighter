import React from "react";

import { FlaggedKeys } from "types/transactions";

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
  const { _operations } = transaction;

  const operationText =
    _operations && _operations.length > 1 ? "Operations:" : "Operation:";

  return (
    <div className="Transaction">
      {_operations ? (
        <>
          <div className="Transaction--title">{operationText}</div>
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
