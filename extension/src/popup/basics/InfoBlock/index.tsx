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
  variant?: InfoBlockVariant;
  children: string | React.ReactNode;
}

export const InfoBlock = ({ children, variant }: InfoBlockProps) => (
  <div className="BasicInfoBlock">
    <SDSInfoBlock variant={variant}>{children}</SDSInfoBlock>
  </div>
);

InfoBlock.variant = InfoBlockVariant;
