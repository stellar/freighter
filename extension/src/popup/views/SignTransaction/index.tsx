import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card, Icon } from "@stellar/design-system";

import { TRANSACTION_WARNING } from "constants/transaction";

import { emitMetric } from "helpers/metrics";
import { getTransactionInfo, truncatedPublicKey } from "helpers/stellar";
import { decodeMemo } from "popup/helpers/parseTransaction";
import { Button } from "popup/basics/buttons/Button";
import { InfoBlock } from "popup/basics/InfoBlock";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { TransactionHeading } from "popup/basics/Transaction";
import { rejectTransaction, signTransaction } from "popup/ducks/access";
import {
  allAccountsSelector,
  hasPrivateKeySelector,
  makeAccountActive,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import {
  ButtonsContainer,
  ModalHeader,
  ModalWrapper,
} from "popup/basics/Modal";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { AccountList, ImportedTag } from "popup/components/account/AccountList";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import {
  WarningMessage,
  FirstTimeWarningMessage,
  FlaggedWarningMessage,
} from "popup/components/WarningMessages";
import { Transaction } from "popup/components/signTransaction/Transaction";
import { TransactionInfo } from "popup/components/signTransaction/TransactionInfo";

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

  const isFeeBump = !!_innerTransaction;
  const memo = decodeMemo(_memo);

  const [isConfirming, setIsConfirming] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState({} as Account);
  const [accountNotFound, setAccountNotFound] = useState(false);

  const accountSelectorRef = useRef<HTMLDivElement>(null);

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
  const hasPrivateKey = useSelector(hasPrivateKeySelector);

  // the public key the user had selected before starting this flow
  const defaultPublicKey = useRef(publicKey);

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
    // handle auto selecting the right account based on `accountToSign`
    let currentAccountDetails;
    let defaultAccountDetails;

    allAccounts.forEach((account) => {
      if (accountToSign) {
        // does the user have the `accountToSign` somewhere in the accounts list?
        if (account.publicKey === accountToSign) {
          // if the `accountToSign` is found, but it isn't active, make it active
          if (defaultPublicKey.current !== account.publicKey) {
            dispatch(makeAccountActive(account.publicKey));
          }

          currentAccountDetails = account;
        }
      }

      // In case we don't find `accountToSign` above, or `accountToSign` is null, save the account the user had already selected
      if (account.publicKey === defaultPublicKey.current) {
        defaultAccountDetails = account;
      }
    });

    if (currentAccountDetails) {
      setCurrentAccount(currentAccountDetails);
    } else {
      setCurrentAccount(defaultAccountDetails || ({} as Account));
      setAccountNotFound(true);
    }
  }, [accountToSign, allAccounts, dispatch]);

  useEffect(() => {
    // handle the user manually changing their account using the selector
    if (publicKey !== defaultPublicKey.current) {
      setCurrentAccount(
        allAccounts.find(
          ({ publicKey: accountPublicKey }) => accountPublicKey === publicKey,
        ) || ({} as Account),
      );
    }
  }, [allAccounts, publicKey]);

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
              <div
                className="SignTransaction__current-account"
                onClick={() => setIsDropdownOpen(true)}
              >
                <AccountListIdenticon
                  displayKey
                  accountName={currentAccount.name}
                  active
                  publicKey={currentAccount.publicKey}
                  setIsDropdownOpen={setIsDropdownOpen}
                >
                  {currentAccount.imported ? <ImportedTag /> : null}
                </AccountListIdenticon>
                <div className="SignTransaction__current-account__chevron">
                  <Icon.ChevronDown />
                </div>
              </div>
              {!hasPrivateKey ? <div>Enter Password</div> : null}
            </div>
          </Card>
          {accountNotFound && accountToSign ? (
            <div className="SignTransaction__account-not-found">
              <InfoBlock variant={InfoBlock.variant.warning}>
                The application is requesting a specific account (
                {truncatedPublicKey(accountToSign)}), which is not available on
                Freighter. If you own this account, you can import it into
                Freighter to complete this transaction.
              </InfoBlock>
            </div>
          ) : null}
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
        <TransactionHeading>Transaction Info</TransactionHeading>
        <TransactionInfo
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
