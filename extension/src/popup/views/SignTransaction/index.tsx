import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card } from "@stellar/design-system";

import { TRANSACTION_WARNING } from "constants/transaction";

import { emitMetric } from "helpers/metrics";
import { getTransactionInfo } from "helpers/stellar";
import { decodeMemo } from "popup/helpers/parseTransaction";
import { Button } from "popup/basics/buttons/Button";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { rejectTransaction, signTransaction } from "popup/ducks/access";
import {
  allAccountsSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import {
  ButtonsContainer,
  ModalHeader,
  ModalWrapper,
} from "popup/basics/Modal";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import {
  AccountList,
  AccountListItem,
} from "popup/components/account/AccountList";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import {
  WarningMessage,
  FirstTimeWarningMessage,
  FlaggedWarningMessage,
} from "popup/components/WarningMessages";
import { Transaction } from "popup/components/signTransaction/Transaction";
import { TransactionHeader } from "popup/components/signTransaction/TransactionHeader";

import { Account } from "@shared/api/types";

import "./styles.scss";

export const SignTransaction = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const {
    accountToSign,
    transaction,
    domain,
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

  console.log(accountToSign);
  const isFeeBump = !!_innerTransaction;
  const memo = decodeMemo(_memo);

  const [isConfirming, setIsConfirming] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState({} as Account);

  const accountSelectorRef = useRef<HTMLDivElement>(null);

  console.log(isDropdownOpen);

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

  const { networkName, otherNetworkName, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );
  const allAccounts = useSelector(allAccountsSelector);
  const publicKey = useSelector(publicKeySelector);

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

  useEffect(() => {
    const currentAccountDetails = allAccounts.find(
      ({ publicKey: currentPublicKey }) => currentPublicKey === publicKey,
    );

    if (currentAccountDetails) {
      setCurrentAccount(currentAccountDetails);
    }
  }, [allAccounts, publicKey]);

  useEffect(() => {
    console.log(accountSelectorRef?.current?.clientHeight);
  }, [accountSelectorRef]);

  const isSubmitDisabled = isMemoRequired || isMalicious;

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
    <div className="SignTransaction">
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
        <div className="SignTransaction__info">
          <Card variant={Card.variant.highlight}>
            <PunycodedDomain domain={domain} isRow />
            <div className="SignTransaction__subject">
              is requesting approval to a {isFeeBump ? "fee bump " : ""}
              transaction:
            </div>
            <div className="SignTransaction__approval">
              <div className="SignTransaction__approval__title">
                Approve using:
              </div>
              <div onClick={() => setIsDropdownOpen(true)}>
                <AccountListItem
                  accountName={currentAccount.name}
                  isSelected
                  accountPublicKey={currentAccount.publicKey}
                  setIsDropdownOpen={setIsDropdownOpen}
                  imported={currentAccount.imported}
                />
              </div>
            </div>
          </Card>
        </div>

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
        <TransactionHeader
          _fee={_fee}
          _sequence={_sequence}
          isFeeBump={isFeeBump}
          isMemoRequired={isMemoRequired}
        />
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
      <div
        className="SignTransaction__account-selector"
        ref={accountSelectorRef}
        style={{
          bottom: isDropdownOpen
            ? "0px"
            : `-${accountSelectorRef?.current?.clientHeight}px`,
        }}
      >
        <AccountList
          allAccounts={allAccounts}
          publicKey={publicKey}
          setIsDropdownOpen={setIsDropdownOpen}
        />
      </div>
      <LoadingBackground
        onClick={() => setIsDropdownOpen(false)}
        isActive={isDropdownOpen}
      />
    </div>
  );
};
