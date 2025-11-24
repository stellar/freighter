import React from "react";
import { MemoType } from "stellar-sdk";
import { useTranslation } from "react-i18next";

import { stroopToXlm } from "helpers/stellar";
import { CopyValue } from "popup/components/CopyValue";

import "./styles.scss";

const getMemoLabel = (type: MemoType): string => {
  const map: Record<string, string> = {
    id: "MEMO_ID",
    hash: "MEMO_HASH",
    text: "MEMO_TEXT",
    return: "MEMO_RETURN",
    none: "MEMO_NONE",
  };
  return map[type] || "MEMO_NONE";
};

interface SummaryProps {
  operationNames: string[];
  fee: string;
  sequenceNumber: string;
  memo?: { value: string; type: MemoType };
  xdr: string;
}

export const Summary = (props: SummaryProps) => {
  const { t } = useTranslation();
  return (
    <div className="TxInfo">
      <div className="TxInfoBlock">
        <div className="TxInfoBlock__title">
          <p>{t("Operations")}</p>
        </div>
        <p className="TxInfoBlock__value">{props.operationNames.length}</p>
      </div>
      <div className="TxInfoBlock">
        <div className="TxInfoBlock__title">
          <p>{t("Fees")}</p>
        </div>
        <p className="TxInfoBlock__value">
          {stroopToXlm(props.fee).toString()} XLM
        </p>
      </div>
      <div className="TxInfoBlock">
        <div className="TxInfoBlock__title">
          <p>{t("Sequence #")}</p>
        </div>
        <p className="TxInfoBlock__value">{props.sequenceNumber}</p>
      </div>
      {props.memo && props.memo.value && (
        <div className="TxInfoBlock" data-testid="MemoBlock">
          <div className="TxInfoBlock__title">
            <p>{t("Memo")}</p>
          </div>
          <p className="TxInfoBlock__value">{`${props.memo.value} (${getMemoLabel(
            props.memo.type,
          )})`}</p>
        </div>
      )}
      <div className="TxInfoBlock">
        <div className="TxInfoBlock__title">
          <p>{t("XDR")}</p>
        </div>
        <span className="TxInfoBlock__value">
          <CopyValue value={props.xdr} displayValue={props.xdr} />
        </span>
      </div>
    </div>
  );
};
