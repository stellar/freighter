import React from "react";
import { Operation } from "stellar-sdk";

import "./styles.scss";
import { Operations } from "popup/components/signTransaction/Operations";
import { FlaggedKeys } from "types/transactions";

interface DetailsProps {
  operations: Operation[];
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
