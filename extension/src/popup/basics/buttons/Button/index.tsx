import React from "react";
import { Button as SDSButton } from "@stellar/design-system";

import "./styles.scss";

// override SDS Button css with freighter design

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
}: ButtonProps) => {
  const sdsVariant =
    variant === ButtonVariant.primary
      ? SDSButton.variant.primary
      : SDSButton.variant.tertiary;
  const sds = SDSButton({
    variant: sdsVariant,
    fullWidth,
    children,
  });

  return (
    <SDSButton
      className={`BasicButton BasicButton--${variant} ${sds?.props?.className}`}
      isLoading={isLoading}
      fullWidth={fullWidth}
      variant={sdsVariant}
      {...props}
    >
      {children}
    </SDSButton>
  );
};

Button.variant = ButtonVariant;
