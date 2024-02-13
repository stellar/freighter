import React from "react";

import "./styles.scss";
import { CopyText, Icon } from "@stellar/design-system";

interface DataProps {
  xdr: string;
}

export const Data = ({ xdr }: DataProps) => (
  <>
    <div className="BodyWrapper__TitleRow">
      <h5>Raw XDR</h5>
      <CopyText textToCopy={xdr} doneLabel="XDR COPIED" tooltipPlacement="left">
        <Icon.ContentCopy />
      </CopyText>
    </div>
    <div className="BodyWrapper__Xdr">{xdr}</div>
  </>
);
