import React from "react";
import { useLocation } from "react-router-dom";
import {
  Operation,
  StrKey,
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
import { FlaggedKeys } from "types/transactions";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";
import { Tabs } from "popup/components/Tabs";
import { SlideupModal } from "popup/components/SlideupModal";
import { AccountList } from "popup/components/account/AccountList";
import { TransferWarning } from "popup/components/WarningMessages";
import { OPERATION_TYPES } from "constants/transaction";
import { Summary } from "../SignTransaction/Preview/Summary";
import { Details } from "../SignTransaction/Preview/Details";
import { Data } from "../SignTransaction/Preview/Data";
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
  const op = transaction.operations[0] as Operation.InvokeHostFunction;
  const authCount = op.auth ? op.auth.length : 0;

  const {
    allAccounts,
    currentAccount,
    isConfirming,
    publicKey,
    handleApprove,
    rejectAndClose,
  } = useSetupSigningFlow(
    rejectTransaction,
    signTransaction,
    params.transactionXdr,
    params.accountToSign,
  );

  return (
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
            <SignTransaction tx={transaction} />
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
                onClick={() =>
                  activeAuthEntryIndex === op.auth?.length
                    ? setActiveAuthEntryIndex(activeAuthEntryIndex + 1)
                    : setHasConfirmedAuth(true)
                }
              >
                {t("Approve and review next")}
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

function getInvocationDetails(invocation: xdr.SorobanAuthorizedInvocation) {
  return [
    getInvocationArgs(invocation),
    ...invocation.subInvocations().map(getInvocationArgs),
  ];
}

function getInvocationArgs(invocation: xdr.SorobanAuthorizedInvocation) {
  const _invocation = invocation.function().contractFn();
  const contractId = StrKey.encodeContract(
    _invocation.contractAddress().contractId(),
  );
  const fnName = _invocation.functionName().toString();
  const args = _invocation.args();
  return { fnName, contractId, args };
}

const AuthDetail = ({
  authEntry,
}: {
  authEntry: xdr.SorobanAuthorizationEntry;
}) => {
  const { t } = useTranslation();
  const details = getInvocationDetails(authEntry.rootInvocation());
  return (
    <div className="AuthDetail">
      <TransferWarning authEntry={authEntry} />
      {details.map((detail) => (
        <React.Fragment key={detail.fnName}>
          <div className="AuthDetail__TitleRow">
            <Icon.Aod />
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
    </div>
  );
};

const SignTransaction = ({ tx }: { tx: Transaction }) => {
  function renderTab(tab: string) {
    function renderTabBody() {
      switch (tab) {
        case "Summary": {
          return (
            <Summary
              sequenceNumber={tx.sequence}
              fee={tx.fee}
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
              flaggedKeys={{} as FlaggedKeys}
              isMemoRequired={false}
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
