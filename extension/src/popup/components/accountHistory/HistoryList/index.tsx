import React from "react";

import "./styles.scss";

interface HistoryListProps {
  children: React.ReactElement;
}

export const HistoryList = ({ children }: HistoryListProps) => (
  <div className="HistoryList">{children}</div>
);
