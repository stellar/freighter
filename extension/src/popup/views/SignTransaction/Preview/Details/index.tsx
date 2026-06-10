import React from "react";
import { OperationRecord } from "stellar-sdk";

import { Operations } from "popup/components/signTransaction/Operations";
import { FlaggedKeys } from "types/transactions";

import "./styles.scss";

interface DetailsProps {
  operations: OperationRecord[];
  flaggedKeys: FlaggedKeys;
  isMemoRequired: boolean;
}

export const Details = ({
  operations,
  flaggedKeys,
  isMemoRequired,
}: DetailsProps) => (
  <div className="DetailsBody" data-testid="DetailsBody">
    <Operations
      operations={operations}
      flaggedKeys={flaggedKeys}
      isMemoRequired={isMemoRequired}
    />
  </div>
);
