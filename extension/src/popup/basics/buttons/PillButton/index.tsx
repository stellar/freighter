import React from "react";
import { Button } from "@stellar/design-system";

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
      size="md"
      disabled={disabled}
      isLoading={isLoading}
      variant="secondary"
      {...props}
    >
      {children}
    </Button>
  </div>
);
