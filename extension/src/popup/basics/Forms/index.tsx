import React from "react";

import "./styles.scss";

interface FormRowsProps {
  children: React.ReactNode;
}
export const FormRows = ({ children }: FormRowsProps) => (
  <div className="FormRows">{children}</div>
);

interface SubmitButtonWrapperProps {
  children: React.ReactNode;
}
export const SubmitButtonWrapper = ({ children }: SubmitButtonWrapperProps) => (
  <div className="SubmitButtonWrapper">{children}</div>
);

interface ErrorMessageProps {
  children: React.ReactNode;
}
export const FormError = ({ children }: ErrorMessageProps) => (
  <div className="FormError">{children}</div>
);
