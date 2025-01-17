import React from "react";
import { Button, ButtonProps } from "@stellar/design-system";

interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
  isLoading?: boolean;
  variant?: ButtonProps["variant"];
  children: React.ReactNode;
}

export const PillButton = ({
  children,
  disabled,
  isLoading,
  variant = "secondary",
  ...props
}: PillButtonProps) => (
  <div className="PillButton">
    <Button
      size="md"
      disabled={disabled}
      isLoading={isLoading}
      variant={variant}
      {...props}
    >
      {children}
    </Button>
  </div>
);
