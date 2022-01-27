import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@stellar/design-system";
import styled from "styled-components";

import { COLOR_PALETTE, ROUNDED_CORNERS } from "popup/constants/styles";
import { TRANSACTION_WARNING } from "constants/transaction";

import { emitMetric } from "helpers/metrics";
import { getTransactionInfo } from "helpers/stellar";
import { decodeMemo } from "popup/helpers/decodeMemo";

import { rejectTransaction, signTransaction } from "popup/ducks/access";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import {
  ButtonsContainer,
  ModalHeader,
  ModalWrapper,
  SingleButtonContainer,
} from "popup/basics/Modal";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { ModalInfo } from "popup/components/ModalInfo";
import {
  WarningMessage,
  FirstTimeWarningMessage,
  FlaggedWarningMessage,
} from "popup/components/WarningMessages";
import { Transaction } from "popup/components/signTransaction/Transaction";
import { TransactionHeader } from "popup/components/signTransaction/TransactionHeader";

const InnerTransactionWrapper = styled.div`
  border: 1px solid ${COLOR_PALETTE.primary};
  border-radius: ${ROUNDED_CORNERS};
  height: 10rem;
  opacity: 0.7;
  overflow: scroll;
  padding: 1rem 2rem;
  zoom: 0.7;
`;

export const SignTransaction = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const {
    transaction,
    domain,
    domainTitle,
    isDomainListedAllowed,
    flaggedKeys,
  } = getTransactionInfo(location.search);
  const {
    _fee,
    _innerTransaction,
    _memo,
    _networkPassphrase,
    _sequence,
  } = transaction;
  const isFeeBump = !!_innerTransaction;
  const source = isFeeBump ? _innerTransaction._source : transaction._source;
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

  if (_networkPassphrase !== networkPassphrase) {
    return (
      <ModalWrapper>
        <WarningMessage header={`Freighter is currently on ${networkName}`}>
          <p>The transaction you’re trying to sign is on {otherNetworkName}.</p>
          <p>Signing this transaction is not possible at the moment.</p>
        </WarningMessage>
        <SingleButtonContainer>
          <Button
            fullWidth
            variant={Button.variant.tertiary}
            onClick={() => window.close()}
          >
            Close
          </Button>
        </SingleButtonContainer>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper>
      <ModalHeader>
        <strong>Confirm Transaction</strong>
      </ModalHeader>
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
      <ModalInfo
        domain={domain}
        domainTitle={domainTitle}
        subject={`This website is requesting a signature to the following${" "}
            ${isFeeBump ? "fee bump " : ""}transaction:`}
      >
        <TransactionHeader
          _fee={_fee}
          _sequence={_sequence}
          source={source}
          isFeeBump={isFeeBump}
          isMemoRequired={isMemoRequired}
        />
      </ModalInfo>

      {isFeeBump ? (
        <InnerTransactionWrapper>
          <Transaction
            flaggedKeys={flaggedKeys}
            isMemoRequired={isMemoRequired}
            transaction={_innerTransaction}
          />
        </InnerTransactionWrapper>
      ) : (
        <Transaction
          flaggedKeys={flaggedKeys}
          isMemoRequired={isMemoRequired}
          transaction={transaction}
        />
      )}

      <ButtonsContainer>
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={() => rejectAndClose()}
        >
          Reject
        </Button>
        <Button
          disabled={isSubmitDisabled}
          fullWidth
          isLoading={isConfirming}
          onClick={() => signAndClose()}
        >
          Sign Transaction
        </Button>
      </ButtonsContainer>
    </ModalWrapper>
  );
};
