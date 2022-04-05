import React from "react";
import { Button as SDSButton } from "@stellar/design-system";

import "./styles.scss";

// a wrapper of the SDS Button with freighter css

enum ButtonVariant {
  primary = SDSButton.variant.primary,
  tertiary = SDSButton.variant.tertiary,
}

interface ButtonComponent {
  variant: typeof ButtonVariant;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
  variant?: ButtonVariant;
}

export const Button: React.FC<ButtonProps> & ButtonComponent = ({
  children,
  isLoading,
  fullWidth,
  variant = ButtonVariant.primary,
  ...props
}: ButtonProps) => (
  <div className={`BasicButton BasicButton--${variant}`}>
    <SDSButton
      fullWidth={fullWidth}
      isLoading={isLoading}
      variant={
        variant === ButtonVariant.primary
          ? SDSButton.variant.primary
          : SDSButton.variant.tertiary
      }
      {...props}
    >
      {children}
    </SDSButton>
  </div>
);

Button.variant = ButtonVariant;
