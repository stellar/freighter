import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";

import {
  COLOR_PALETTE,
  FONT_WEIGHT,
  ROUNDED_CORNERS,
} from "popup/constants/styles";
import { TRANSACTION_WARNING } from "constants/transaction";

import { emitMetric } from "helpers/metrics";
import { getTransactionInfo } from "helpers/stellar";
import { decodeMemo } from "popup/helpers/decodeMemo";

import { rejectTransaction, signTransaction } from "popup/ducks/access";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { Button } from "popup/basics/Buttons";
import { ButtonContainer, SubmitButton } from "popup/basics/Modal";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { FirstTimeWarningMessage } from "popup/components/warningMessages/FirstTimeWarningMessage";
import { Header } from "popup/components/Header";
import { FlaggedWarningMessage } from "popup/components/warningMessages/FlaggedWarningMessage";
import { WarningMessage } from "popup/components/WarningMessage";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { Transaction } from "popup/components/signTransaction/Transaction";
import { TransactionHeader } from "popup/components/signTransaction/TransactionHeader";

const El = styled.div`
  padding: 1.5rem 1.875rem;
  box-sizing: border-box;
`;
const HeaderEl = styled.h1`
  color: ${COLOR_PALETTE.primary};
  font-weight: ${FONT_WEIGHT.light};
  margin: 0;
`;

const SubheaderEl = styled.h3`
  font-weight: ${FONT_WEIGHT.bold};
  font-size: 0.95rem;
  letter-spacing: 0.1px;
  color: ${COLOR_PALETTE.primary};
`;

const InnerTransactionWrapper = styled.div`
  border: 1px solid ${COLOR_PALETTE.primary};
  border-radius: ${ROUNDED_CORNERS};
  height: 10rem;
  opacity: 0.7;
  overflow: scroll;
  padding: 1rem 2rem;
  zoom: 0.7;
`;

const RejectButtonEl = styled(Button)`
  background: ${COLOR_PALETTE.text};
  width: 9.68rem;
`;

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
    _feeSource,
    _innerTransaction,
    _memo,
    _networkPassphrase,
    _sequence,
  } = transaction;

  const isFeeBump = !!_innerTransaction;

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
      <ButtonContainer>
        <SubmitButton size="small" onClick={() => window.close()}>
          Close
        </SubmitButton>
      </ButtonContainer>
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
          This website is requesting a signature on the following{" "}
          {isFeeBump ? "fee bump " : ""}transaction:
        </SubheaderEl>
        {isFeeBump ? (
          <>
            <TransactionHeader
              _fee={_fee}
              _sequence={_sequence}
              source={_feeSource}
              isFeeBump
              isMemoRequired={isMemoRequired}
            />
            <InnerTransactionWrapper>
              <Transaction
                flaggedKeys={flaggedKeys}
                isMemoRequired={isMemoRequired}
                transaction={_innerTransaction}
              />
            </InnerTransactionWrapper>
          </>
        ) : (
          <Transaction
            flaggedKeys={flaggedKeys}
            isMemoRequired={isMemoRequired}
            transaction={transaction}
          />
        )}

        <ButtonContainer>
          <RejectButtonEl size="small" onClick={() => rejectAndClose()}>
            Reject
          </RejectButtonEl>
          <SubmitButton
            isValid={!isSubmitDisabled}
            isSubmitting={isConfirming}
            size="small"
            onClick={() => signAndClose()}
          >
            Confirm Transaction
          </SubmitButton>
        </ButtonContainer>
      </El>
    </>
  );
};
