import React from "react";
import { Text } from "@stellar/design-system";

import "./styles.scss";

interface StatRowProps {
  label: React.ReactNode;
  /** A node rather than a string: several rows render a before -> after pair. */
  value: React.ReactNode;
  /** Renders the value in green — a projected gain rather than a plain figure. */
  isPositive?: boolean;
  testId?: string;
}

/**
 * A label/value line in one of Earn's stat cards, divided from the line above it.
 *
 * Shared by the review screen and the pool details sheet, which the design draws
 * identically; they had the same markup and the same rules under two BEM
 * prefixes before this.
 */
export const StatRow = ({
  label,
  value,
  isPositive = false,
  testId,
}: StatRowProps) => (
  <div className="EarnStatRow">
    <Text as="div" size="sm">
      {label}
    </Text>
    <div
      className={`EarnStatRow__value ${
        isPositive ? "EarnStatRow__value--positive" : ""
      }`}
      data-testid={testId}
    >
      {value}
    </div>
  </div>
);
