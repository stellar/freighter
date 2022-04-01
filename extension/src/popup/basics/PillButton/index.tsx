import React from "react";
import { Button } from "@stellar/design-system";

import "./styles.scss";

interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
}

export const PillButton = ({
  children,
  isLoading,
  ...props
}: PillButtonProps) => (
  <div className="PillButton">
    <Button isLoading={isLoading} variant={Button.variant.tertiary} {...props}>
      {children}
    </Button>
  </div>
);
