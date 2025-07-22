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
  <div className="TxInfo">
    <div className="TxInfoBlock">
      <div className="TxInfoBlock__title">
        <Icon.ParagraphSpacing />
        <p>Operations</p>
      </div>
      <p className="TxInfoBlock__value">{props.operationNames.length}</p>
    </div>
    <div className="TxInfoBlock">
      <div className="TxInfoBlock__title">
        <Icon.Percent03 />
        <p>Fees</p>
      </div>
      <p className="TxInfoBlock__value">
        {stroopToXlm(props.fee).toString()} XLM
      </p>
    </div>
    <div className="TxInfoBlock">
      <div className="TxInfoBlock__title">
        <Icon.ArrowSquareRight />
        <p>Sequence #</p>
      </div>
      <p className="TxInfoBlock__value">{props.sequenceNumber}</p>
    </div>
    {props.memo && props.memo.value && (
      <div className="TxInfoBlock" data-testid="MemoBlock">
        <div className="TxInfoBlock__title">
          <Icon.CoinsHand />
          <p>Memo</p>
        </div>
        <p className="TxInfoBlock__value">{`${props.memo.value} (${
          mapMemoLabel[props.memo.type]
        })`}</p>
      </div>
    )}
  </div>
);
