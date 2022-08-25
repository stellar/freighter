import React from "react";
import { InfoBlock as SDSInfoBlock } from "@stellar/design-system";

import "./styles.scss";

enum InfoBlockVariant {
  info = "info",
  success = "success",
  error = "error",
  warning = "warning",
}

interface InfoBlockProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  variant?: InfoBlockVariant;
  children: string | React.ReactNode;
}

export const InfoBlock = ({ children, className, variant }: InfoBlockProps) => (
  <div className={`BasicInfoBlock ${className}`}>
    <SDSInfoBlock variant={variant}>{children}</SDSInfoBlock>
  </div>
);

InfoBlock.variant = InfoBlockVariant;
