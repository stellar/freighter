import React from "react";

import "./styles.scss";

enum CardVariant {
  default = "default",
  highlight = "highlight",
}

interface CardComponent {
  variant: typeof CardVariant;
}

interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  noPadding?: boolean;
  noShadow?: boolean;
}

export const Card: React.FC<CardProps> & CardComponent = ({
  variant = CardVariant.default,
  children,
  noPadding,
  noShadow,
}: CardProps) => {
  const customStyle = {
    ...(noPadding ? { "--Card-padding": 0 } : {}),
    ...(noShadow ? { "--Card-shadow": "none" } : {}),
  } as React.CSSProperties;

  return (
    <div className={`Card Card--${variant}`} style={customStyle}>
      {children}
    </div>
  );
};

Card.displayName = "Card";
Card.variant = CardVariant;
