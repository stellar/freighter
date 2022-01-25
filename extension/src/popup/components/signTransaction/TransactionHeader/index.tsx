import React from "react";

import { IconWithLabel } from "popup/basics/TransactionList";

import { stroopToXlm } from "helpers/stellar";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";

import IconExcalamtion from "popup/assets/icon-exclamation.svg";

import "./styles.scss";

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
  <div className="TransactionHeader">
    <div>
      <div>
        <strong>Source account:</strong>
      </div>
      <div>
        <KeyIdenticon publicKey={source} />
      </div>
    </div>

    {_fee ? (
      <div>
        <div>
          <strong>Base fee:</strong>
        </div>
        <div> {stroopToXlm(_fee)} XLM</div>
      </div>
    ) : null}
    {memo ? (
      <div>
        <div>
          <strong>Memo:</strong>
        </div>
        <div> {getMemoDisplay({ memo, isMemoRequired })} </div>
      </div>
    ) : null}

    {_sequence ? (
      <div>
        <div>
          <strong>Transaction sequence number:</strong>
        </div>
        <div> {_sequence}</div>
      </div>
    ) : null}
    {isFeeBump ? (
      <div>
        <div>
          <strong>Inner Transaction:</strong>
        </div>
      </div>
    ) : null}
  </div>
);
