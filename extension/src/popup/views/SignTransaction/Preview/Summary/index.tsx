import React from "react";

import { Icon } from "@stellar/design-system";
import { stroopToXlm } from "helpers/stellar";
import { MemoType } from "stellar-sdk";

import "./styles.scss";

const mapMemoLabel: any = {
  id: "MEMO_ID",
  hash: "MEMO_HASH",
  text: "MEMO_TEXT",
  return: "MEMO_RETURN",
  none: "MEMO_NONE",
};

interface SummaryProps {
  operationNames: string[];
  fee: string;
  sequenceNumber: string;
  memo?: { value: string; type: MemoType };
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
      {props.memo && props.memo.value && (
        <div className="TxInfoBlock">
          <div className="TxInfoBlock__title">
            <Icon.Chat />
            <p>Memo</p>
          </div>
          <p className="TxInfoBlock__value">{`${props.memo.value} (${
            mapMemoLabel[props.memo.type]
          })`}</p>
        </div>
      )}
    </div>
  </>
);
