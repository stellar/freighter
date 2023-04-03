import React from "react";
import { SimpleBarWrapper } from "popup/basics/SimpleBarWrapper";

import "./styles.scss";

interface HistoryListProps {
  children: React.ReactElement;
  assetDetail?: boolean;
}

export const HistoryList = ({ children, assetDetail }: HistoryListProps) => (
  <SimpleBarWrapper
    className={`HistoryList ${assetDetail ? "HistoryList--assetDetail" : ""}`}
  >
    <div className="HistoryList__items">{children}</div>
  </SimpleBarWrapper>
);
