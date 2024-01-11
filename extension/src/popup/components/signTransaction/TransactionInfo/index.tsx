import React from "react";
import { MemoType } from "stellar-sdk";
import { Icon, IconButton } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { stroopToXlm } from "helpers/stellar";

import "./styles.scss";

const MemoDisplay = ({
  memo,
  isMemoRequired,
}: {
  memo: { value: string; type: MemoType };
  isMemoRequired: boolean;
}) => {
  const { t } = useTranslation();

  const mapMemoLabel: any = {
    id: "MEMO_ID",
    hash: "MEMO_HASH",
    text: "MEMO_TEXT",
    return: "MEMO_RETURN",
    none: "MEMO_NONE",
  };

  if (isMemoRequired) {
    return (
      <IconButton
        label={t("Not defined")}
        altText="Error"
        icon={<Icon.Info />}
        variant="error"
      />
    );
  }

  if (memo) {
    return (
      <span data-testid="SignTransactionMemo">{`${memo.value} (${
        mapMemoLabel[memo.type]
      })`}</span>
    );
  }

  return null;
};

interface TransactionInfoProps {
  _fee: string;
  _sequence?: string;
  isFeeBump?: boolean;
  isMemoRequired: boolean;
  memo?: { value: string; type: MemoType };
}

export const TransactionInfo = ({
  _fee,
  _sequence,
  isFeeBump,
  isMemoRequired,
  memo,
}: TransactionInfoProps) => {
  const { t } = useTranslation();

  return (
    <div className="TransactionInfo" data-testid="TransactionInfoWrapper">
      {_fee ? (
        <div>
          <div>
            <strong>{t("Base fee")}</strong>
          </div>
          <div> {stroopToXlm(_fee).toString()} XLM</div>
        </div>
      ) : null}
      {memo ? (
        <div>
          <div>
            <strong>{t("Memo")}</strong>
          </div>
          <div>
            <MemoDisplay memo={memo} isMemoRequired={isMemoRequired} />
          </div>
        </div>
      ) : null}

      {_sequence ? (
        <div>
          <div>
            <strong>{t("Transaction sequence number")}</strong>
          </div>
          <div> {_sequence}</div>
        </div>
      ) : null}
      {isFeeBump ? (
        <div>
          <div>
            <strong>{t("Inner Transaction")}</strong>
          </div>
        </div>
      ) : null}
    </div>
  );
};
