import React from "react";
import { Button } from "@stellar/design-system";

import "./styles.scss";

interface PillButtonProps {
  children: React.ReactNode;
}

export const PillButton = ({ children }: PillButtonProps) => (
  <div className="PillButton">
    <Button variant={Button.variant.tertiary}>{children}</Button>
  </div>
);
