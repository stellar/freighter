import React from "react";

import { IconWithLabel, TransactionList } from "popup/basics/TransactionList";

import { stroopToXlm } from "helpers/stellar";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";

import IconExcalamtion from "popup/assets/icon-exclamation.svg";

const getMemoDisplay = ({
  memo,
  isMemoRequired,
}: {
  memo: string;
  isMemoRequired: boolean;
}) => {
  if (isMemoRequired) {
    return (
      <IconWithLabel isHighAlert alt="exclamation icon" icon={IconExcalamtion}>
        Not defined
      </IconWithLabel>
    );
  }
  if (memo) {
    return <span>{`${memo} (MEMO_TEXT)`}</span>;
  }

  return null;
};

interface TransactionListProps {
  _fee: number;
  _sequence: string;
  source: string;
  isFeeBump?: boolean;
  isMemoRequired: boolean;
  memo?: string;
}

export const TransactionHeader = ({
  _fee,
  _sequence,
  source,
  isFeeBump,
  isMemoRequired,
  memo,
}: TransactionListProps) => (
  <TransactionList>
    <li>
      <div>
        <strong>Source account:</strong>
      </div>
      <KeyIdenticon publicKey={source} />
    </li>
    {_fee ? (
      <li>
        <div>
          <strong>Base fee:</strong>
        </div>
        <div> {stroopToXlm(_fee)} XLM</div>
      </li>
    ) : null}
    {memo ? (
      <li>
        <div>
          <strong>Memo:</strong>
        </div>
        <div> {getMemoDisplay({ memo, isMemoRequired })} </div>
      </li>
    ) : null}

    {_sequence ? (
      <li>
        <div>
          <strong>Transaction sequence number:</strong>
        </div>
        <div> {_sequence}</div>
      </li>
    ) : null}
    {isFeeBump ? (
      <li>
        <div>
          <strong>Inner Transaction:</strong>
        </div>
      </li>
    ) : null}
  </TransactionList>
);
