import React from "react";
import { useLocation } from "react-router-dom";
import {
  MemoType,
  Operation,
  Transaction,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";
import { useSelector } from "react-redux";

import { decodeString } from "helpers/urls";
import { Button, Icon } from "@stellar/design-system";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { signTransaction, rejectTransaction } from "popup/ducks/access";

import {
  KeyValueInvokeHostFnArgs,
  KeyValueList,
} from "popup/components/signTransaction/Operations/KeyVal";
import { useTranslation } from "react-i18next";
import { truncateString } from "helpers/stellar";
import { emitMetric } from "helpers/metrics";
import { FlaggedKeys } from "types/transactions";
import {
  FnArgsCreateSac,
  FnArgsCreateWasm,
  FnArgsInvoke,
  getInvocationDetails,
} from "popup/helpers/soroban";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";
import { Tabs } from "popup/components/Tabs";
import { SlideupModal } from "popup/components/SlideupModal";
import { AccountList } from "popup/components/account/AccountList";
import {
  InvokerAuthWarning,
  TransferWarning,
  UnverifiedTokenTransferWarning,
} from "popup/components/WarningMessages";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { OPERATION_TYPES } from "constants/transaction";
import { Summary } from "../SignTransaction/Preview/Summary";
import { Details } from "../SignTransaction/Preview/Details";
import { Data } from "../SignTransaction/Preview/Data";
import { VerifyAccount } from "../VerifyAccount";
import "./styles.scss";

export const ReviewAuth = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const decodedSearchParam = decodeString(location.search.replace("?", ""));
  const params = decodedSearchParam ? JSON.parse(decodedSearchParam) : {};

  const [activeAuthEntryIndex, setActiveAuthEntryIndex] = React.useState(0);
  const [hasConfirmedAuth, setHasConfirmedAuth] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const { networkPassphrase } = useSelector(settingsNetworkDetailsSelector);
  const transaction = TransactionBuilder.fromXDR(
    params.transactionXdr,
    networkPassphrase,
  ) as Transaction;

  const isFeeBump = "innerTransaction" in transaction;
  const op = transaction.operations[0] as Operation.InvokeHostFunction;
  const authCount = op.auth ? op.auth.length : 0;

  const {
    allAccounts,
    currentAccount,
    isConfirming,
    publicKey,
    handleApprove,
    rejectAndClose,
    isPasswordRequired,
    setIsPasswordRequired,
    verifyPasswordThenSign,
  } = useSetupSigningFlow(
    rejectTransaction,
    signTransaction,
    params.transactionXdr,
    params.accountToSign,
  );

  const isLastEntry = activeAuthEntryIndex + 1 === op.auth?.length;
  const reviewAuthEntry = () => {
    emitMetric(METRIC_NAMES.reviewedAuthEntry);
    if (isLastEntry) {
      setHasConfirmedAuth(true);
    } else {
      setActiveAuthEntryIndex(activeAuthEntryIndex + 1);
    }
  };

  return isPasswordRequired ? (
    <VerifyAccount
      isApproval
      customBackAction={() => setIsPasswordRequired(false)}
      customSubmit={verifyPasswordThenSign}
    />
  ) : (
    <div className="ReviewAuth">
      <div className="ReviewAuth__Body">
        <div className="ReviewAuth__Title">
          <PunycodedDomain domain={params.domain} domainTitle="" />
          <div className="ReviewAuth--connection-request">
            <div className="ReviewAuth--connection-request-pill">
              <Icon.Link />
              <p>Transaction Request</p>
            </div>
          </div>
        </div>
        <div className="ReviewAuth__Details">
          {!hasConfirmedAuth && op.auth ? (
            <>
              <h5>
                {activeAuthEntryIndex + 1}/{authCount} Authorizations
              </h5>
              <AuthDetail authEntry={op.auth[activeAuthEntryIndex]} />
            </>
          ) : (
            <SignTransaction
              tx={
                isFeeBump
                  ? ((transaction as any).innerTransaction as Transaction)
                  : transaction
              }
              flaggedKeys={params.flaggedKeys}
              isMemoRequired={params.isMemoRequired}
              memo={params.memo}
            />
          )}
        </div>
        <div className="ReviewAuth__Actions">
          {hasConfirmedAuth && (
            <div className="ReviewAuth__Actions__SigningWith">
              <h5>Signing with</h5>
              <button
                className="ReviewAuth__Actions__PublicKey"
                onClick={() => setIsDropdownOpen(true)}
              >
                <KeyIdenticon publicKey={currentAccount.publicKey} />
                <Icon.ChevronDown />
              </button>
            </div>
          )}
          <div className="ReviewAuth__Actions__BtnRow">
            {hasConfirmedAuth ? (
              <Button
                variant="tertiary"
                isFullWidth
                size="md"
                isLoading={isConfirming}
                onClick={() => handleApprove()}
              >
                {t("Sign Transaction")}
              </Button>
            ) : (
              <Button
                variant="tertiary"
                isFullWidth
                size="md"
                isLoading={isConfirming}
                onClick={reviewAuthEntry}
              >
                {isLastEntry
                  ? t("Approve and continue")
                  : t("Approve and review next")}
              </Button>
            )}

            <Button
              isFullWidth
              size="md"
              variant="secondary"
              onClick={() => rejectAndClose()}
            >
              {t("Reject")}
            </Button>
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
  );
};

const AuthDetail = ({
  authEntry,
}: {
  authEntry: xdr.SorobanAuthorizationEntry;
}) => {
  const { t } = useTranslation();
  const details = getInvocationDetails(authEntry.rootInvocation());
  const invocations = details.filter(
    (detail) => detail.type === "invoke",
  ) as FnArgsInvoke[];
  const createWasms = details.filter(
    (detail) => detail.type === "wasm",
  ) as FnArgsCreateWasm[];
  const createSacs = details.filter(
    (detail) => detail.type === "sac",
  ) as FnArgsCreateSac[];

  return (
    <div className="AuthDetail">
      <TransferWarning authEntry={authEntry} />
      <UnverifiedTokenTransferWarning details={invocations} />
      {authEntry.credentials().switch() ===
        xdr.SorobanCredentialsType.sorobanCredentialsSourceAccount() && (
        <InvokerAuthWarning />
      )}
      {invocations.map((detail) => (
        <React.Fragment key={detail.fnName}>
          <div className="AuthDetail__TitleRow">
            <Icon.Code />
            <h5>Invocation</h5>
          </div>
          <div className="AuthDetail__InfoBlock">
            <KeyValueList
              operationKey={t("Contract ID")}
              operationValue={truncateString(detail.contractId)}
            />
            <KeyValueList
              operationKey={t("Function Name")}
              operationValue={detail.fnName}
            />
            <KeyValueInvokeHostFnArgs args={detail.args} />
          </div>
        </React.Fragment>
      ))}
      {createWasms.map((detail) => (
        <React.Fragment key={detail.hash}>
          <div className="AuthDetail__TitleRow">
            <Icon.Code />
            <h5>Contract Creation</h5>
          </div>
          <div className="AuthDetail__InfoBlock">
            <KeyValueList
              operationKey={t("Contract Address")}
              operationValue={truncateString(detail.address)}
            />
            <KeyValueList
              operationKey={t("Hash")}
              operationValue={truncateString(detail.hash)}
            />
            <KeyValueList
              operationKey={t("Salt")}
              operationValue={truncateString(detail.salt)}
            />
          </div>
        </React.Fragment>
      ))}
      {createSacs.map((detail) => (
        <React.Fragment key={detail.asset}>
          <div className="AuthDetail__TitleRow">
            <Icon.Code />
            <h5>Contract Creation</h5>
          </div>
          <div className="AuthDetail__InfoBlock">
            <KeyValueList
              operationKey={t("Asset")}
              operationValue={truncateString(detail.asset)}
            />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

const SignTransaction = ({
  tx,
  flaggedKeys,
  isMemoRequired,
  memo,
}: {
  tx: Transaction;
  flaggedKeys: FlaggedKeys;
  isMemoRequired: boolean;
  memo?: { value: string; type: MemoType };
}) => {
  function renderTab(tab: string) {
    function renderTabBody() {
      switch (tab) {
        case "Summary": {
          return (
            <Summary
              sequenceNumber={tx.sequence}
              fee={tx.fee}
              memo={memo}
              operationNames={tx.operations.map(
                (op) => OPERATION_TYPES[op.type] || op.type,
              )}
            />
          );
        }

        case "Details": {
          return (
            <Details
              operations={tx.operations}
              flaggedKeys={flaggedKeys}
              isMemoRequired={isMemoRequired}
            />
          );
        }

        case "Data": {
          return <Data xdr={tx.toXDR()} />;
        }

        default:
          return <></>;
      }
    }

    return <div className="BodyWrapper">{renderTabBody()}</div>;
  }
  return <Tabs tabs={["Summary", "Details", "Data"]} renderTab={renderTab} />;
};
