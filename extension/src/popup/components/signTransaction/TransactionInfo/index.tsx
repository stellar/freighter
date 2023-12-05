import React from "react";
import { Icon, IconButton } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { stroopToXlm } from "helpers/stellar";
import { MEMO_TYPES } from "popup/constants/memoTypes";

import "./styles.scss";

const MemoDisplay = ({
  memo,
  isMemoRequired,
}: {
  memo: { value: string; type: MEMO_TYPES };
  isMemoRequired: boolean;
}) => {
  const { t } = useTranslation();

  const mapMemoLabel = {
    memoId: "MEMO_ID",
    memoHash: "MEMO_HASH",
    memoText: "MEMO_TEXT",
    memoReturn: "MEMO_RETURN",
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
  memo?: { value: string; type: MEMO_TYPES };
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
