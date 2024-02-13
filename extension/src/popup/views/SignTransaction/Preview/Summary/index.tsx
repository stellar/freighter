import React from "react";

import "./styles.scss";
import { Icon } from "@stellar/design-system";
import { stroopToXlm } from "helpers/stellar";

interface SummaryProps {
  operationNames: string[];
  fee: string;
  sequenceNumber: string;
}

export const Summary = (props: SummaryProps) => (
  <>
    <h5>Operations</h5>
    <div className="Operations">
      {props.operationNames.map((opName) => (
        <div key={opName} className="OpName">
          <Icon.DeployedCode />
          <p>{opName}</p>
        </div>
      ))}
    </div>
    <h5>Transaction Info</h5>
    <div className="TxInfo">
      <div className="TxInfoBlock">
        <div className="TxInfoBlock__title">
          <Icon.KeyVisualizer />
          <p>Operations</p>
        </div>
        <p className="TxInfoBlock__value">{props.operationNames.length}</p>
      </div>
      <div className="TxInfoBlock">
        <div className="TxInfoBlock__title">
          <Icon.Payments />
          <p>Fees</p>
        </div>
        <p className="TxInfoBlock__value">
          {stroopToXlm(props.fee).toString()} XLM
        </p>
      </div>
      <div className="TxInfoBlock">
        <div className="TxInfoBlock__title">
          <Icon.Toll />
          <p>Sequence #</p>
        </div>
        <p className="TxInfoBlock__value">{props.sequenceNumber}</p>
      </div>
    </div>
  </>
);