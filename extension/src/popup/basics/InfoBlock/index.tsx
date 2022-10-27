import React from "react";
import { InfoBlock as SDSInfoBlock } from "@stellar/design-system";
import IconWarning from "popup/assets/icon-warning-red.svg";

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

// TODO - reconcile with SDS, for now using local triangle icon for error info blocks
const ErrorInfoBlock = ({
  children,
}: {
  children: string | React.ReactNode;
}) => (
  <div className="InfoBlock InfoBlock--error">
    <div className="InfoBlock__icon">
      <img src={IconWarning} alt="warning" />
    </div>
    {children}
  </div>
);

export const InfoBlock = ({ children, className, variant }: InfoBlockProps) => (
  <div className={`BasicInfoBlock ${className}`}>
    {variant === InfoBlockVariant.error ? (
      <ErrorInfoBlock>{children}</ErrorInfoBlock>
    ) : (
      <SDSInfoBlock variant={variant}>{children}</SDSInfoBlock>
    )}
  </div>
);

InfoBlock.variant = InfoBlockVariant;
