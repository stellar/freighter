import React from "react";
import { OperationRecord } from "stellar-sdk";

import { Operations } from "popup/components/signTransaction/Operations";
import { FlaggedKeys } from "types/transactions";

import "./styles.scss";

interface DetailsProps {
  operations: OperationRecord[];
  flaggedKeys: FlaggedKeys;
  isMemoRequired: boolean;
  // Forwarded to Operations: false skips the per-op Blockaid self-scan when the
  // host flow has already scanned these assets (e.g. internal Send/Swap review).
  scanAssets?: boolean;
}

export const Details = ({
  operations,
  flaggedKeys,
  isMemoRequired,
  scanAssets = true,
}: DetailsProps) => (
  <div className="DetailsBody" data-testid="DetailsBody">
    <Operations
      operations={operations}
      flaggedKeys={flaggedKeys}
      isMemoRequired={isMemoRequired}
      scanAssets={scanAssets}
    />
  </div>
);
