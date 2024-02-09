import React from "react";

import "./styles.scss";
import { Icon } from "@stellar/design-system";

interface DataProps {
  xdr: string;
}

export const Data = ({ xdr }: DataProps) => (
  <div className="DataBody">
    <div className="DataBody__TitleRow">
      <h5>Raw XDR</h5>
      <Icon.ContentCopy />
    </div>
    <div className="DataBody__Xdr">{xdr}</div>
  </div>
);
