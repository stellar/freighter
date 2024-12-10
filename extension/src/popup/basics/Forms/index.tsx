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
  isCenterAligned?: boolean;
}
export const SubmitButtonWrapper = ({
  children,
  isCenterAligned,
}: SubmitButtonWrapperProps) => (
  <div
    className={`SubmitButtonWrapper ${
      isCenterAligned ? "SubmitButtonWrapper--center" : ""
    }`}
  >
    {children}
  </div>
);
