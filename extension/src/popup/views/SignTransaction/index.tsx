import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation, Trans } from "react-i18next";
import { Button, Card, Icon, Notification } from "@stellar/design-system";
import * as SorobanSdk from "soroban-client";
import StellarSdk, { FederationServer, MuxedAccount } from "stellar-sdk";

import { signTransaction, rejectTransaction } from "popup/ducks/access";
import {
  settingsNetworkDetailsSelector,
  settingsExperimentalModeSelector,
} from "popup/ducks/settings";

import { ShowOverlayStatus } from "popup/ducks/transactionSubmission";

import { TRANSACTION_WARNING } from "constants/transaction";

import { emitMetric } from "helpers/metrics";
import {
  getTransactionInfo,
  isFederationAddress,
  isMuxedAccount,
  truncatedPublicKey,
} from "helpers/stellar";
import { decodeMemo } from "popup/helpers/parseTransaction";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";
import { TransactionHeading } from "popup/basics/TransactionHeading";

import {
  ButtonsContainer,
  ModalHeader,
  ModalWrapper,
} from "popup/basics/Modal";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { AccountList, OptionTag } from "popup/components/account/AccountList";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import {
  WarningMessageVariant,
  WarningMessage,
  FirstTimeWarningMessage,
  FlaggedWarningMessage,
} from "popup/components/WarningMessages";
import { Transaction } from "popup/components/signTransaction/Transaction";
import { LedgerSign } from "popup/components/hardwareConnect/LedgerSign";
import { SlideupModal } from "popup/components/SlideupModal";

import { VerifyAccount } from "popup/views/VerifyAccount";

import "./styles.scss";

import { FlaggedKeys } from "types/transactions";
import { TransactionInfo } from "popup/components/signTransaction/TransactionInfo";

export const SignTransaction = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isExperimentalModeEnabled = useSelector(
    settingsExperimentalModeSelector,
  );
  const { networkName, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );

  const tx = getTransactionInfo(location.search);

  const {
    accountToSign: _accountToSign,
    transactionXdr,
    domain,
    isDomainListedAllowed,
    isHttpsDomain,
    flaggedKeys,
  } = tx;

  /* 
  Reconstruct the tx from xdr as passing a tx through extension contexts 
  loses custom prototypes associated with some values. This is fine for most cases 
  where we just need a high level overview of the tx, like just a list of operations.  
  But in this case, we will need the hostFn prototype associated with Soroban tx operations.
  */

  const SDK = isExperimentalModeEnabled ? SorobanSdk : StellarSdk;
  const transaction = SDK.TransactionBuilder.fromXDR(
    transactionXdr,
    networkPassphrase,
  );

  const {
    _fee,
    _innerTransaction,
    _memo,
    _networkPassphrase,
    _sequence,
  } = transaction;

  const isFeeBump = !!_innerTransaction;
  const memo = decodeMemo(_memo);
  let accountToSign = _accountToSign;

  const {
    allAccounts,
    accountNotFound,
    currentAccount,
    isConfirming,
    isPasswordRequired,
    publicKey,
    handleApprove,
    hwStatus,
    rejectAndClose,
    setIsPasswordRequired,
    verifyPasswordThenSign,
  } = useSetupSigningFlow(
    rejectTransaction,
    signTransaction,
    transactionXdr,
    accountToSign,
  );

  const flaggedKeyValues = Object.values(flaggedKeys as FlaggedKeys);
  const isUnsafe = flaggedKeyValues.some(({ tags }) =>
    tags.includes(TRANSACTION_WARNING.unsafe),
  );
  const isMalicious = flaggedKeyValues.some(({ tags }) =>
    tags.includes(TRANSACTION_WARNING.malicious),
  );
  const isMemoRequired = flaggedKeyValues.some(
    ({ tags }) => tags.includes(TRANSACTION_WARNING.memoRequired) && !memo,
  );

  const resolveFederatedAddress = useCallback(async (inputDest) => {
    let resolvedPublicKey;
    try {
      const fedResp = await FederationServer.resolve(inputDest);
      resolvedPublicKey = fedResp.account_id;
    } catch (e) {
      console.error(e);
    }

    return resolvedPublicKey;
  }, []);

  const decodeAccountToSign = async () => {
    if (_accountToSign) {
      if (isMuxedAccount(_accountToSign)) {
        const mAccount = MuxedAccount.fromAddress(_accountToSign, "0");
        accountToSign = mAccount.baseAccount().accountId();
      }
      if (isFederationAddress(_accountToSign)) {
        accountToSign = (await resolveFederatedAddress(
          accountToSign,
        )) as string;
      }
    }
  };
  decodeAccountToSign();

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

  if (_networkPassphrase !== networkPassphrase) {
    return (
      <ModalWrapper>
        <WarningMessage
          variant={WarningMessageVariant.warning}
          handleCloseClick={() => window.close()}
          isActive
          header={`${t("Freighter is set to")} ${networkName}`}
        >
          <p>
            {t("The transaction you’re trying to sign is on")}{" "}
            {_networkPassphrase}.
          </p>
          <p>{t("Signing this transaction is not possible at the moment.")}</p>
        </WarningMessage>
      </ModalWrapper>
    );
  }

  if (!isHttpsDomain && !isExperimentalModeEnabled) {
    return (
      <ModalWrapper>
        <WarningMessage
          handleCloseClick={() => window.close()}
          isActive
          variant={WarningMessageVariant.warning}
          header={t("WEBSITE CONNECTION IS NOT SECURE")}
        >
          <p>
            <Trans domain={domain}>
              The website <strong>{{ domain }}</strong> does not use an SSL
              certificate. For additional safety Freighter only works with
              websites that provide an SSL certificate.
            </Trans>
          </p>
        </WarningMessage>
      </ModalWrapper>
    );
  }

  return isPasswordRequired ? (
    <VerifyAccount
      isApproval
      customBackAction={() => setIsPasswordRequired(false)}
      customSubmit={verifyPasswordThenSign}
    />
  ) : (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && <LedgerSign />}
      <div className="SignTransaction" data-testid="SignTransaction">
        <ModalWrapper>
          <ModalHeader>
            <strong>{t("Confirm Transaction")}</strong>
          </ModalHeader>
          {isExperimentalModeEnabled ? (
            <WarningMessage
              header="Experimental Mode"
              variant={WarningMessageVariant.default}
            >
              <p>
                {t(
                  "You are interacting with a transaction that may be using untested and changing schemas. Proceed at your own risk.",
                )}
              </p>
            </WarningMessage>
          ) : null}
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
            <Card variant="secondary">
              <PunycodedDomain domain={domain} isRow />
              <div className="SignTransaction__subject">
                {t("is requesting approval to a")}{" "}
                {isFeeBump ? "fee bump " : ""}
                {t("transaction")}:
              </div>
              <div className="SignTransaction__approval">
                <div className="SignTransaction__approval__title">
                  {t("Approve using")}:
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
                    <OptionTag
                      hardwareWalletType={currentAccount.hardwareWalletType}
                      imported={currentAccount.imported}
                    />
                  </AccountListIdenticon>
                  <div className="SignTransaction__current-account__chevron">
                    <Icon.ChevronDown />
                  </div>
                </div>
              </div>
            </Card>
            {accountNotFound && accountToSign ? (
              <div className="SignTransaction__account-not-found">
                <Notification
                  variant="warning"
                  icon={<Icon.Warning />}
                  title={t("Account not available")}
                >
                  {t("The application is requesting a specific account")} (
                  {truncatedPublicKey(accountToSign)}),{" "}
                  {t(
                    "which is not available on Freighter. If you own this account, you can import it into Freighter to complete this request.",
                  )}
                </Notification>
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
          <TransactionHeading>{t("Transaction Info")}</TransactionHeading>
          <TransactionInfo
            _fee={_fee}
            _sequence={_sequence}
            isFeeBump={isFeeBump}
            isMemoRequired={isMemoRequired}
          />
        </ModalWrapper>
        <ButtonsContainer>
          <Button
            isFullWidth
            size="md"
            variant="tertiary"
            onClick={() => rejectAndClose()}
          >
            {t("Reject")}
          </Button>
          <Button
            disabled={isSubmitDisabled}
            variant="primary"
            isFullWidth
            size="md"
            isLoading={isConfirming}
            onClick={() => handleApprove()}
          >
            {t("Approve")}
          </Button>
        </ButtonsContainer>
        <SlideupModal
          isModalOpen={isDropdownOpen}
          setIsModalOpen={setIsDropdownOpen}
        >
          <div className="SignTransaction__modal">
            <AccountList
              allAccounts={allAccounts}
              publicKey={publicKey}
              setIsDropdownOpen={setIsDropdownOpen}
            />
          </div>
        </SlideupModal>
      </div>
    </>
  );
};
