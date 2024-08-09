import React from "react";
import { CopyText, Icon } from "@stellar/design-system";

import "./styles.scss";

export const CopyValue = ({
  value,
  displayValue,
}: {
  value: string;
  displayValue: string;
}) => (
  <CopyText textToCopy={value}>
    <div className="CopyValue">
      <Icon.Copy01 />
      <span className="Value">{displayValue}</span>
    </div>
  </CopyText>
);
