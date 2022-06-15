import React from "react";

import "./styles.scss";

interface TransactionHeadingProps {
  children: React.ReactNode;
}

export const TransactionHeading = ({ children }: TransactionHeadingProps) => (
  <div className="TransactionHeading">{children}</div>
);
