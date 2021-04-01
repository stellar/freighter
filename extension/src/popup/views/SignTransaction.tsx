import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { TRANSACTION_WARNING } from "constants/transaction";

import { emitMetric } from "helpers/metrics";
import { getTransactionInfo, stroopToXlm } from "helpers/stellar";
import { decodeMemo } from "popup/helpers/decodeMemo";

import { rejectTransaction, signTransaction } from "popup/ducks/access";

import { Button } from "popup/basics/Buttons";
import { SubmitButton } from "popup/basics/Forms";
import { IconWithLabel, TransactionList } from "popup/basics/TransactionList";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { FirstTimeWarningMessage } from "popup/components/warningMessages/FirstTimeWarningMessage";
import { Header } from "popup/components/Header";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { FlaggedWarningMessage } from "popup/components/warningMessages/FlaggedWarningMessage";
import { Operations } from "popup/components/signTransaction/Operations";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { WarningMessage } from "popup/components/WarningMessage";

import IconExcalamtion from "popup/assets/icon-exclamation.svg";

const El = styled.div`
  padding: 1.5rem 1.875rem;
  box-sizing: border-box;
`;
const HeaderEl = styled.h1`
  color: ${COLOR_PALETTE.primary};
  font-weight: ${FONT_WEIGHT.light};
  margin: 0;
`;
const OperationsHeader = styled.h2`
  color: ${COLOR_PALETTE.primary};
  font-size: 1.375rem;
  margin: 0;
  padding: 0;
  padding-top: 2.25rem;
`;
const SubheaderEl = styled.h3`
  font-weight: ${FONT_WEIGHT.bold};
  font-size: 0.95rem;
  letter-spacing: 0.1px;
  color: ${COLOR_PALETTE.primary};
`;

const ButtonContainerEl = styled.div`
  display: flex;
  justify-content: space-around;
  padding-top: 3rem;
  padding-bottom: 1.5rem;
`;
const RejectButtonEl = styled(Button)`
  background: ${COLOR_PALETTE.text};
  width: 9.68rem;
`;
const SubmitButtonEl = styled(SubmitButton)`
  width: 12.43rem;
`;

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

export const SignTransaction = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const {
    transaction,
    domain,
    isDomainListedAllowed,
    flaggedKeys,
  } = getTransactionInfo(location.search);
  const {
    _fee,
    _operations,
    _memo,
    _networkPassphrase,
    _sequence,
    _source,
  } = transaction;
  const operationText = _operations.length > 1 ? "Operations:" : "Operation:";
  const memo = decodeMemo(_memo);

  const [isConfirming, setIsConfirming] = useState(false);

  const rejectAndClose = () => {
    dispatch(rejectTransaction());
    window.close();
  };

  const signAndClose = async () => {
    setIsConfirming(true);
    await dispatch(signTransaction({ transaction }));
    window.close();
  };

  const flaggedKeyValues = Object.values(flaggedKeys);
  const isUnsafe = flaggedKeyValues.some(({ tags }) =>
    tags.includes(TRANSACTION_WARNING.unsafe),
  );
  const isMalicious = flaggedKeyValues.some(({ tags }) =>
    tags.includes(TRANSACTION_WARNING.malicious),
  );
  const isMemoRequired = flaggedKeyValues.some(
    ({ tags }) => tags.includes(TRANSACTION_WARNING.memoRequired) && !memo,
  );

  useEffect(() => {
    if (isMemoRequired) {
      emitMetric(METRIC_NAMES.signTransactionMemoRequired);
    }
    if (isUnsafe) {
      emitMetric(METRIC_NAMES.signTransactionUnsafe);
    }
    if (isMalicious) {
      emitMetric(METRIC_NAMES.signTransactionMalicious);
    }
  }, [isMemoRequired, isMalicious, isUnsafe]);

  const isSubmitDisabled = isMemoRequired || isMalicious;

  const { networkName, otherNetworkName, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );

  const NetworkMismatchWarning = () => (
    <>
      <WarningMessage subheader={`Freighter is currently on ${networkName}`}>
        <p>The transaction you’re trying to sign is on {otherNetworkName}.</p>
        <p>Signing this transaction is not possible at the moment.</p>
      </WarningMessage>
      <ButtonContainerEl>
        <SubmitButtonEl size="small" onClick={() => window.close()}>
          Close
        </SubmitButtonEl>
      </ButtonContainerEl>
    </>
  );

  if (_networkPassphrase !== networkPassphrase) {
    return <NetworkMismatchWarning />;
  }

  return (
    <>
      <Header />
      <El>
        <HeaderEl>Confirm Transaction</HeaderEl>
        {flaggedKeyValues.length ? (
          <FlaggedWarningMessage
            isUnsafe={isUnsafe}
            isMalicious={isMalicious}
            isMemoRequired={isMemoRequired}
          />
        ) : null}
        {!isDomainListedAllowed && !isSubmitDisabled ? (
          <FirstTimeWarningMessage />
        ) : null}
        <PunycodedDomain domain={domain} />
        <SubheaderEl>
          This website is requesting a signature on the following transaction:
        </SubheaderEl>
        <TransactionList>
          <li>
            <div>
              <strong>Source account:</strong>
            </div>
            <KeyIdenticon publicKey={_source} />
          </li>
          {_fee ? (
            <li>
              <div>
                <strong>Base fee:</strong>
              </div>
              <div> {stroopToXlm(_fee)} XLM</div>
            </li>
          ) : null}
          <li>
            <div>
              <strong>Memo:</strong>
            </div>
            <div> {getMemoDisplay({ memo, isMemoRequired })} </div>
          </li>
          {_sequence ? (
            <li>
              <div>
                <strong>Transaction sequence number:</strong>
              </div>
              <div> {_sequence}</div>
            </li>
          ) : null}
        </TransactionList>
        <OperationsHeader>
          {_operations.length} {operationText}
        </OperationsHeader>
        <Operations
          flaggedKeys={flaggedKeys}
          isMemoRequired={isMemoRequired}
          operations={_operations}
        />
        <ButtonContainerEl>
          <RejectButtonEl size="small" onClick={() => rejectAndClose()}>
            Reject
          </RejectButtonEl>
          <SubmitButtonEl
            isValid={!isSubmitDisabled}
            isSubmitting={isConfirming}
            size="small"
            onClick={() => signAndClose()}
          >
            Confirm Transaction
          </SubmitButtonEl>
        </ButtonContainerEl>
      </El>
    </>
  );
};
