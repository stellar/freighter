import React from "react";
import styled from "styled-components";

import { COLOR_PALETTE } from "popup/constants/styles";
import { FlaggedKeys } from "types/transactions";

import { decodeMemo } from "popup/helpers/decodeMemo";

import { Operations } from "popup/components/signTransaction/Operations";

import { TransactionHeader } from "./TransactionHeader";

const OperationsHeader = styled.h2`
  color: ${COLOR_PALETTE.primary};
  font-size: 1.375rem;
  margin: 0;
  padding: 0;
  padding-top: 2.25rem;
`;

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
  const { _fee, _operations, _memo, _sequence, _source } = transaction;

  const operationText =
    _operations && _operations.length > 1 ? "Operations:" : "Operation:";
  const memo = decodeMemo(_memo);

  return (
    <>
      <TransactionHeader
        _fee={_fee}
        _sequence={_sequence}
        source={_source}
        memo={memo}
        isMemoRequired={isMemoRequired}
      />
      {_operations ? (
        <>
          <OperationsHeader>
            {_operations.length} {operationText}
          </OperationsHeader>
          <Operations
            flaggedKeys={flaggedKeys}
            isMemoRequired={isMemoRequired}
            operations={_operations}
          />
        </>
      ) : null}
    </>
  );
};
