import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card, Icon } from "@stellar/design-system";
import StellarSdk, { FederationServer, MuxedAccount } from "stellar-sdk";
import * as SorobanSdk from "soroban-client";
import { useTranslation, Trans } from "react-i18next";

import { TRANSACTION_WARNING } from "constants/transaction";

import { emitMetric } from "helpers/metrics";
import {
  getTransactionInfo,
  isFederationAddress,
  isMuxedAccount,
  truncatedPublicKey,
} from "helpers/stellar";
import { decodeMemo } from "popup/helpers/parseTransaction";
import { Button } from "popup/basics/buttons/Button";
import { InfoBlock } from "popup/basics/InfoBlock";
import { TransactionHeading } from "popup/basics/TransactionHeading";
import { rejectTransaction, signBlob, signTransaction } from "popup/ducks/access";
import {
  allAccountsSelector,
  confirmPassword,
  hasPrivateKeySelector,
  makeAccountActive,
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import {
  settingsNetworkDetailsSelector,
  settingsExperimentalModeSelector,
} from "popup/ducks/settings";

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
import {
  ShowOverlayStatus,
  startHwSign,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";

import { Account } from "@shared/api/types";
import { FlaggedKeys } from "types/transactions";
import { AppDispatch } from "popup/App";

import "./styles.scss";
import { TransactionInfo } from "popup/components/signTransaction/TransactionInfo";
import { BlobToSign } from "helpers/urls";

export const SignTransaction = () => {
  const location = useLocation();
  const blobOrTx = getTransactionInfo(location.search);

  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const { networkName, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );
  const isExperimentalModeEnabled = useSelector(
    settingsExperimentalModeSelector,
  );

  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!hardwareWalletType;
  const {
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);

  const [startedHwSign, setStartedHwSign] = useState(false);
  const [currentAccount, setCurrentAccount] = useState({} as Account);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [accountNotFound, setAccountNotFound] = useState(false);

  const allAccounts = useSelector(allAccountsSelector);
  const publicKey = useSelector(publicKeySelector);
  const hasPrivateKey = useSelector(hasPrivateKeySelector);

  // the public key the user had selected before starting this flow
  const defaultPublicKey = useRef(publicKey);
  const allAccountsMap = useRef({} as { [key: string]: Account });
  const accountToSign = blobOrTx.accountToSign // both types have this key

  const rejectAndClose = () => {
    dispatch(rejectTransaction());
    window.close();
  };

  const handleApprove = (signAndClose: () => Promise<void>) => async () => {
    setIsConfirming(true);

    if (hasPrivateKey) {
      await signAndClose();
    } else {
      setIsPasswordRequired(true);
    }

    setIsConfirming(false);
  };

  useEffect(() => {
    // handle any changes to the current acct - whether by auto select or manual select
    setCurrentAccount(allAccountsMap.current[publicKey] || ({} as Account));
  }, [allAccounts, publicKey]);

  useEffect(() => {
    if (startedHwSign && hwStatus === ShowOverlayStatus.IDLE) {
      window.close();
    }
  }, [startedHwSign, hwStatus]);

  useEffect(() => {
    // handle auto selecting the right account based on `accountToSign`
    let autoSelectedAccountDetails;

    allAccounts.forEach((account) => {
      if (accountToSign) {
        // does the user have the `accountToSign` somewhere in the accounts list?
        if (account.publicKey === accountToSign) {
          // if the `accountToSign` is found, but it isn't active, make it active
          if (defaultPublicKey.current !== account.publicKey) {
            dispatch(makeAccountActive(account.publicKey));
          }

          // save the details of the `accountToSign`
          autoSelectedAccountDetails = account;
        }
      }

      // create an object so we don't need to keep iterating over allAccounts when we switch accounts
      allAccountsMap.current[account.publicKey] = account;
    });

    if (!autoSelectedAccountDetails) {
      setAccountNotFound(true);
    }
  }, [accountToSign, allAccounts, dispatch]);

  if ("blob" in blobOrTx) {
    return (
      <SignBlobBody setIsDropdownOpen={setIsDropdownOpen} setIsPasswordRequired={setIsPasswordRequired} accountNotFound={accountNotFound} isConfirming={isConfirming} isDropdownOpen={isDropdownOpen} allAccounts={allAccounts} currentAccount={currentAccount} publicKey={publicKey} isPasswordRequired={isPasswordRequired} rejectAndClose={rejectAndClose} handleApprove={handleApprove} setStartedHwSign={setStartedHwSign} isHardwareWallet={isHardwareWallet} hwStatus={hwStatus} isExperimentalModeEnabled={isExperimentalModeEnabled} blob={blobOrTx} t={t} dispatch={dispatch} />
    )
  }

  return (
    <SignTxBody
      setCurrentAccount={setCurrentAccount}
      setAccountNotFound={setAccountNotFound}
      startedHwSign={startedHwSign}
      setIsDropdownOpen={setIsDropdownOpen} setIsPasswordRequired={setIsPasswordRequired} accountNotFound={accountNotFound} isConfirming={isConfirming} isDropdownOpen={isDropdownOpen} allAccounts={allAccounts} currentAccount={currentAccount} publicKey={publicKey} isPasswordRequired={isPasswordRequired} rejectAndClose={rejectAndClose} handleApprove={handleApprove} setStartedHwSign={setStartedHwSign} isHardwareWallet={isHardwareWallet} hwStatus={hwStatus}
      isExperimentalModeEnabled={isExperimentalModeEnabled}
      tx={blobOrTx}
      t={t}
      dispatch={dispatch}
      networkName={networkName}
      networkPassphrase={networkPassphrase}
     />
  )
};

interface SignBlobBodyProps {
  publicKey: string
  currentAccount: Account
  allAccounts: Account[]
  isPasswordRequired: boolean
  isDropdownOpen: boolean
  isHardwareWallet: boolean
  isConfirming: boolean
  accountNotFound: boolean
  hwStatus: ShowOverlayStatus
  isExperimentalModeEnabled: boolean
  blob: BlobToSign
  t: any
  dispatch: AppDispatch
  setStartedHwSign: (hasStarted: boolean) => void
  setIsPasswordRequired: (isRequired: boolean) => void
  setIsDropdownOpen: (isRequired: boolean) => void
  rejectAndClose: () => void
  handleApprove: (signAndClose: () => Promise<void>) => () => Promise<void>
}

const SignBlobBody = ({ publicKey, allAccounts, isDropdownOpen, handleApprove, isConfirming, accountNotFound, rejectAndClose, currentAccount, setIsDropdownOpen, setIsPasswordRequired, isPasswordRequired, blob, isExperimentalModeEnabled, t, dispatch, hwStatus, isHardwareWallet, setStartedHwSign }: SignBlobBodyProps) => {
  const { accountToSign, domain, isDomainListedAllowed } = blob

  const signAndClose = async () => {
    if (isHardwareWallet) {
      await dispatch(
        startHwSign({ transactionXDR: blob.blob, shouldSubmit: false }),
      );
      setStartedHwSign(true);
    } else {

      await dispatch(signBlob());
      window.close();
    }
  };

  const _handleApprove = handleApprove(signAndClose)

  const verifyPasswordThenSign = async (password: string) => {
    const confirmPasswordResp = await dispatch(confirmPassword(password));

    if (confirmPassword.fulfilled.match(confirmPasswordResp)) {
      await signAndClose();
    }
  };

  if (!domain.startsWith("https") && !isExperimentalModeEnabled) {
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
            <strong>{t("Confirm Data")}</strong>
          </ModalHeader>
          {isExperimentalModeEnabled ? (
            <WarningMessage
              header="Experimental Mode"
              variant={WarningMessageVariant.default}
            >
              <p>
                {t(
                  "You are interacting with data that may be using untested and changing schemas. Proceed at your own risk.",
                )}
              </p>
            </WarningMessage>
          ) : null}
          {!isDomainListedAllowed ? (
          <FirstTimeWarningMessage />
        ) : null}
          <div className="SignTransaction__info">
            <Card variant={Card.variant.highlight}>
              <PunycodedDomain domain={domain} isRow />
              <div className="SignTransaction__subject">
                {t("is requesting approval to sign a blob of data")}
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
                <InfoBlock variant={InfoBlock.variant.warning}>
                  {t("The application is requesting a specific account")} (
                  {truncatedPublicKey(accountToSign)}),{" "}
                  {t(
                    "which is not available on Freighter. If you own this account, you can import it into Freighter to complete this transaction.",
                  )}
                </InfoBlock>
              </div>
            ) : null}
          </div>
        </ModalWrapper>
        <ButtonsContainer>
          <Button
            fullWidth
            variant={Button.variant.tertiary}
            onClick={() => rejectAndClose()}
          >
            {t("Reject")}
          </Button>
          <Button
            fullWidth
            isLoading={isConfirming}
            onClick={() => _handleApprove()}
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
}

interface SignTxBodyProps {
  publicKey: string
  currentAccount: Account
  allAccounts: Account[]
  isPasswordRequired: boolean
  isDropdownOpen: boolean
  isConfirming: boolean
  accountNotFound: boolean
  isHardwareWallet: boolean
  startedHwSign: boolean
  hwStatus: ShowOverlayStatus
  isExperimentalModeEnabled: boolean
  networkName: string
  networkPassphrase: string
  dispatch: AppDispatch
  setStartedHwSign: (hasStarted: boolean) => void
  setIsPasswordRequired: (isRequired: boolean) => void
  setIsDropdownOpen: (isRequired: boolean) => void
  rejectAndClose: () => void
  handleApprove: (signAndClose: () => Promise<void>) => () => Promise<void>
  setAccountNotFound: (isNotFound: boolean) => void
  setCurrentAccount: (account: Account) => void
  t: any
  tx: {
    accountToSign: string | undefined
    transactionXdr: string;
    domain: string;
    domainTitle: any;
    isHttpsDomain: boolean;
    operations: any;
    operationTypes: any;
    isDomainListedAllowed: boolean;
    flaggedKeys: FlaggedKeys;
  }
}

const SignTxBody = ({ setCurrentAccount, setAccountNotFound, startedHwSign, setStartedHwSign, publicKey, allAccounts, isDropdownOpen, handleApprove, isConfirming, accountNotFound, rejectAndClose, currentAccount, setIsDropdownOpen, setIsPasswordRequired, isPasswordRequired, tx, isExperimentalModeEnabled, t, dispatch, networkName, networkPassphrase, hwStatus, isHardwareWallet }: SignTxBodyProps) => {

  const {
    accountToSign: _accountToSign,
    transactionXdr,
    domain,
    isDomainListedAllowed,
    isHttpsDomain,
    flaggedKeys,
  } = tx

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

  useEffect(() => {
    if (startedHwSign && hwStatus === ShowOverlayStatus.IDLE) {
      window.close();
    }
  }, [startedHwSign, hwStatus]);

  const signAndClose = async () => {
    if (isHardwareWallet) {
      await dispatch(
        startHwSign({ transactionXDR: transactionXdr, shouldSubmit: false }),
      );
      setStartedHwSign(true);
    } else {

      await dispatch(signTransaction());
      window.close();
    }
  };

  const _handleApprove = handleApprove(signAndClose)

  const verifyPasswordThenSign = async (password: string) => {
    const confirmPasswordResp = await dispatch(confirmPassword(password));

    if (confirmPassword.fulfilled.match(confirmPasswordResp)) {
      await signAndClose();
    }
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

  // the public key the user had selected before starting this flow
  const defaultPublicKey = useRef(publicKey);
  const allAccountsMap = useRef({} as { [key: string]: Account });

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
        accountToSign = await resolveFederatedAddress(accountToSign) as string;
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

  useEffect(() => {
    // handle auto selecting the right account based on `accountToSign`
    let autoSelectedAccountDetails;

    allAccounts.forEach((account) => {
      if (accountToSign) {
        // does the user have the `accountToSign` somewhere in the accounts list?
        if (account.publicKey === accountToSign) {
          // if the `accountToSign` is found, but it isn't active, make it active
          if (defaultPublicKey.current !== account.publicKey) {
            dispatch(makeAccountActive(account.publicKey));
          }

          // save the details of the `accountToSign`
          autoSelectedAccountDetails = account;
        }
      }

      // create an object so we don't need to keep iterating over allAccounts when we switch accounts
      allAccountsMap.current[account.publicKey] = account;
    });

    if (!autoSelectedAccountDetails) {
      setAccountNotFound(true);
    }
  }, [accountToSign, allAccounts, dispatch, setAccountNotFound]);

  useEffect(() => {
    // handle any changes to the current acct - whether by auto select or manual select
    setCurrentAccount(allAccountsMap.current[publicKey] || ({} as Account));
  }, [allAccounts, publicKey, setCurrentAccount]);

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
            <Card variant={Card.variant.highlight}>
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
                <InfoBlock variant={InfoBlock.variant.warning}>
                  {t("The application is requesting a specific account")} (
                  {truncatedPublicKey(accountToSign)}),{" "}
                  {t(
                    "which is not available on Freighter. If you own this account, you can import it into Freighter to complete this transaction.",
                  )}
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
            fullWidth
            variant={Button.variant.tertiary}
            onClick={() => rejectAndClose()}
          >
            {t("Reject")}
          </Button>
          <Button
            disabled={isSubmitDisabled}
            fullWidth
            isLoading={isConfirming}
            onClick={() => _handleApprove()}
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
}
