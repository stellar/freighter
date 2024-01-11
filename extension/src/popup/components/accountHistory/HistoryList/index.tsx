import React from "react";

import "./styles.scss";

interface HistoryListProps {
  children: React.ReactElement;
  assetDetail?: boolean;
}

export const HistoryList = ({ children, assetDetail }: HistoryListProps) => (
  <div
    className={`HistoryList ${assetDetail ? "HistoryList--assetDetail" : ""}`}
  >
    <div className="HistoryList__items">{children}</div>
  </div>
);
