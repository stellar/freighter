import React from "react";
import { CopyText, Icon } from "@stellar/design-system";

import "./styles.scss";

interface DataProps {
  xdr: string;
}

export const Data = ({ xdr }: DataProps) => (
  <>
    <div className="BodyWrapper__TitleRow">
      <h5>Raw XDR</h5>
      <CopyText textToCopy={xdr} doneLabel="XDR COPIED" tooltipPlacement="left">
        <Icon.Copy01 />
      </CopyText>
    </div>
    <div className="BodyWrapper__Xdr">{xdr}</div>
  </>
);
