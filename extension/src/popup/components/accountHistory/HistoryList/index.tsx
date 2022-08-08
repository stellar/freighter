import React from "react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

import "./styles.scss";

interface HistoryListProps {
  children: React.ReactElement;
  assetDetail?: boolean;
}

export const HistoryList = ({ children, assetDetail }: HistoryListProps) => (
  <SimpleBar
    className={`HistoryList ${assetDetail ? "HistoryList--assetDetail" : ""}`}
  >
    <div className="HistoryList__items">{children}</div>
  </SimpleBar>
);
