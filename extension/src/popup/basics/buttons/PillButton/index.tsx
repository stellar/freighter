import React from "react";
import { Button } from "@stellar/design-system";

import "./styles.scss";

interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const PillButton = ({
  children,
  disabled,
  isLoading,
  ...props
}: PillButtonProps) => (
  <div className="PillButton">
    <Button
      disabled={disabled}
      isLoading={isLoading}
      variant={Button.variant.tertiary}
      {...props}
    >
      {children}
    </Button>
  </div>
);
