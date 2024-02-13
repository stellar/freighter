import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation, Trans } from "react-i18next";
import { Button, Icon, Notification } from "@stellar/design-system";
import {
  FeeBumpTransaction,
  MuxedAccount,
  Transaction,
  TransactionBuilder,
  Federation,
  Memo,
  MemoType,
  Operation,
} from "stellar-sdk";

import { signTransaction, rejectTransaction } from "popup/ducks/access";
import {
  settingsNetworkDetailsSelector,
  settingsExperimentalModeSelector,
} from "popup/ducks/settings";

import { ShowOverlayStatus } from "popup/ducks/transactionSubmission";

import { OPERATION_TYPES, TRANSACTION_WARNING } from "constants/transaction";

import { encodeObject } from "helpers/urls";
import { emitMetric } from "helpers/metrics";
import {
  getTransactionInfo,
  isFederationAddress,
  isMuxedAccount,
  truncatedPublicKey,
} from "helpers/stellar";
import { decodeMemo } from "popup/helpers/parseTransaction";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { AccountList } from "popup/components/account/AccountList";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import {
  WarningMessageVariant,
  WarningMessage,
  FirstTimeWarningMessage,
  FlaggedWarningMessage,
} from "popup/components/WarningMessages";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { SlideupModal } from "popup/components/SlideupModal";
import { FlaggedKeys } from "types/transactions";

import { VerifyAccount } from "popup/views/VerifyAccount";
import { Tabs } from "popup/components/Tabs";
import { Summary } from "./Preview/Summary";
import { Details } from "./Preview/Details";
import { Data } from "./Preview/Data";

import "./styles.scss";

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

  const transaction = TransactionBuilder.fromXDR(
    transactionXdr,
    networkPassphrase,
  ) as Transaction | FeeBumpTransaction;

  const { fee: _fee, networkPassphrase: _networkPassphrase } = transaction;

  let isFeeBump = false;
  let _memo = {};
  let _sequence = "";

  if ("innerTransaction" in transaction) {
    isFeeBump = true;
  } else {
    _sequence = transaction.sequence;
    _memo = transaction.memo;
  }

  const decodedMemo = decodeMemo(_memo);

  const memo = decodedMemo?.value;
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
    hardwareWalletType,
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
      const fedResp = await Federation.Server.resolve(inputDest);
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
    );
  }

  if (!isHttpsDomain && !isExperimentalModeEnabled) {
    return (
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
    );
  }

  function renderTab(tab: string) {
    function renderTabBody() {
      const _tx = transaction as Transaction<Memo<MemoType>, Operation[]>;
      switch (tab) {
        case "Summary": {
          return (
            <Summary
              sequenceNumber={_sequence}
              fee={_fee}
              memo={decodedMemo}
              operationNames={_tx.operations.map(
                (op) => OPERATION_TYPES[op.type] || op.type,
              )}
            />
          );
        }

        case "Details": {
          return (
            <Details
              operations={_tx.operations}
              flaggedKeys={flaggedKeys}
              isMemoRequired={isMemoRequired}
            />
          );
        }

        case "Data": {
          return <Data xdr={_tx.toXDR()} />;
        }

        default:
          return <></>;
      }
    }

    return (
      <div className="BodyWrapper">
        {accountNotFound && accountToSign ? (
          <div className="SignTransaction__account-not-found">
            <Notification
              variant="warning"
              icon={<Icon.Warning />}
              title={t("Account not available")}
            >
              {t("The application is requesting a specific account")} (
              {truncatedPublicKey(accountToSign!)}),{" "}
              {t(
                "which is not available on Freighter. If you own this account, you can import it into Freighter to complete this request.",
              )}
            </Notification>
          </div>
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
        {renderTabBody()}
      </div>
    );
  }

  const needsReviewAuth =
    !isFeeBump &&
    (transaction as Transaction<Memo<MemoType>, Operation[]>).operations.some(
      (op) => op.type === "invokeHostFunction" && op.auth && op.auth.length,
    );

  return isPasswordRequired ? (
    <VerifyAccount
      isApproval
      customBackAction={() => setIsPasswordRequired(false)}
      customSubmit={verifyPasswordThenSign}
    />
  ) : (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && hardwareWalletType && (
        <HardwareSign walletType={hardwareWalletType} />
      )}
      <div data-testid="SignTransaction" className="SignTransaction">
        <div className="SignTransaction__Body">
          <div className="SignTransaction__Title">
            <PunycodedDomain domain={domain} domainTitle="" />
            <div className="SignTransaction--connection-request">
              <div className="SignTransaction--connection-request-pill">
                <Icon.Link />
                <p>Transaction Request</p>
              </div>
            </div>
          </div>
          <Tabs tabs={["Summary", "Details", "Data"]} renderTab={renderTab} />
          <div className="SignTransaction__Actions">
            <div className="SignTransaction__Actions__SigningWith">
              <h5>Signing with</h5>
              <button
                className="SignTransaction__Actions__PublicKey"
                onClick={() => setIsDropdownOpen(true)}
              >
                <KeyIdenticon publicKey={currentAccount.publicKey} />
                <Icon.ChevronDown />
              </button>
            </div>
            <div className="SignTransaction__Actions__BtnRow">
              <Button
                isFullWidth
                size="md"
                variant="secondary"
                onClick={() => rejectAndClose()}
              >
                {t("Cancel")}
              </Button>
              {needsReviewAuth ? (
                <Button
                  disabled={isSubmitDisabled}
                  variant="tertiary"
                  isFullWidth
                  size="md"
                  isLoading={isConfirming}
                  onClick={() =>
                    navigateTo(
                      ROUTES.reviewAuthorization,
                      `?${encodeObject({
                        accountToSign,
                        transactionXdr,
                        domain,
                        flaggedKeys,
                        isMemoRequired,
                        memo: decodedMemo,
                      })}`,
                    )
                  }
                >
                  {t("Review")}
                </Button>
              ) : (
                <Button
                  disabled={isSubmitDisabled}
                  variant="tertiary"
                  isFullWidth
                  size="md"
                  isLoading={isConfirming}
                  onClick={() => handleApprove()}
                >
                  {t("Sign")}
                </Button>
              )}
            </div>
          </div>
        </div>
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
