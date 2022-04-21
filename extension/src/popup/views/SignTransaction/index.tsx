import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { TRANSACTION_WARNING } from "constants/transaction";

import { emitMetric } from "helpers/metrics";
import { getTransactionInfo } from "helpers/stellar";
import { decodeMemo } from "popup/helpers/parseTransaction";
import { Button } from "popup/basics/buttons/Button";
import { rejectTransaction, signTransaction } from "popup/ducks/access";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import {
  ButtonsContainer,
  ModalHeader,
  ModalWrapper,
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

import "./styles.scss";

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
        <WarningMessage
          handleCloseClick={() => window.close()}
          isActive
          header={`Freighter is set to ${networkName}`}
        >
          <p>The transaction you’re trying to sign is on {otherNetworkName}.</p>
          <p>Signing this transaction is not possible at the moment.</p>
        </WarningMessage>
      </ModalWrapper>
    );
  }

  return (
    <>
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
          <div className="SignTransaction__inner-transaction">
            <Transaction
              flaggedKeys={flaggedKeys}
              isMemoRequired={isMemoRequired}
              transaction={_innerTransaction}
            />
          </div>
        ) : (
          <Transaction
            flaggedKeys={flaggedKeys}
            isMemoRequired={isMemoRequired}
            transaction={transaction}
          />
        )}
      </ModalWrapper>
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
    </>
  );
};
