import React from "react";

import { CopyValue } from "popup/components/CopyValue";
import { truncateString } from "helpers/stellar";

import "./styles.scss";

/**
 * A truncate-and-copy chip for identifiers (contract IDs, hashes, sequence
 * numbers). Copies the full value while displaying a shortened form.
 */
export const CopyChip = ({
  value,
  displayValue,
  truncateAmount,
}: {
  value: string;
  /** overrides the default truncated display */
  displayValue?: string;
  truncateAmount?: number;
}) => (
  <div className="CopyChip" data-testid="copy-chip">
    <CopyValue
      value={value}
      displayValue={displayValue ?? truncateString(value, truncateAmount)}
    />
  </div>
);
