import React, { useContext, useState } from "react";
import { useLocation } from "react-router-dom";
import { captureException } from "@sentry/browser";
import BigNumber from "bignumber.js";
import {
  MemoType,
  Address,
  Operation,
  Transaction,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";
import { useSelector } from "react-redux";
import { Button, Icon, Loader } from "@stellar/design-system";

import { decodeString } from "helpers/urls";
import { INDEXER_URL } from "@shared/constants/mercury";
import { getSorobanTokenBalance } from "@shared/api/internal";
import { isCustomNetwork } from "@shared/helpers/stellar";

import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { signTransaction, rejectTransaction } from "popup/ducks/access";
import { publicKeySelector } from "popup/ducks/accountServices";
import StellarLogo from "popup/assets/stellar-logo.png";

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
  buildInvocationTree,
  formatTokenAmount,
  getInvocationDetails,
  pickTransfers,
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
import { SorobanTokenIcon } from "popup/components/account/AccountAssets";
import { CopyValue } from "popup/components/CopyValue";
import { OPERATION_TYPES } from "constants/transaction";
import { SorobanContext } from "popup/SorobanContext";
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
    params.transactionXdr as string,
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
    params.transactionXdr as string,
    params.accountToSign as string,
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
                <KeyIdenticon
                  publicKey={currentAccount.publicKey}
                  keyTruncationAmount={10}
                />
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

interface TokenDetails {
  name: string;
  symbol: string;
  decimals: number;
}
type TokenDetailMap = Record<string, TokenDetails>;

const TransferSummary = ({
  transfer,
  tokenDetails = { name: "", symbol: "", decimals: 0 },
}: {
  transfer: {
    amount: string;
    contractId: string;
    from: string;
    to: string;
  };
  tokenDetails: TokenDetails;
}) => {
  const hasTokenDetails = tokenDetails.symbol && tokenDetails.decimals;
  const isNative = tokenDetails.symbol === "native";
  const symbol = isNative ? "XLM" : tokenDetails.symbol;
  return (
    <div className="AuthDetail__InfoBlock TransferSummary">
      <div className="SummaryBlock">
        <div className="SummaryBlock__Title">
          <Icon.ArrowCircleRight />
          <p>Receiver</p>
        </div>
        <KeyIdenticon
          isCopyAllowed
          iconSide="right"
          publicKey={transfer.to}
          isSmall
        />
      </div>
      <div className="SummaryBlock">
        <div className="SummaryBlock__Title">
          <Icon.ArrowCircleLeft />
          <p>Sender</p>
        </div>
        <KeyIdenticon
          isCopyAllowed
          iconSide="right"
          publicKey={transfer.from}
          isSmall
        />
      </div>
      <div className="SummaryBlock">
        <div className="SummaryBlock__Title">
          <Icon.Toll />
          <p>Amount</p>
        </div>
        <div className="SummaryBlock__Title">
          {hasTokenDetails ? (
            <>
              <p>
                {formatTokenAmount(
                  new BigNumber(transfer.amount),
                  tokenDetails.decimals,
                )}{" "}
                {symbol}
              </p>
              {isNative ? (
                <div className="AccountAssets__asset--logo AccountAssets__asset--soroban-token">
                  <img src={StellarLogo} alt="Stellar icon" />
                </div>
              ) : (
                <SorobanTokenIcon />
              )}
            </>
          ) : (
            <>
              <p>{transfer.amount}</p>
            </>
          )}
        </div>
      </div>
      {!hasTokenDetails && (
        <div className="SummaryBlock">
          <p className="MissingDetailWarning">
            Failed to fetch token details, showing raw amount.
          </p>
        </div>
      )}
    </div>
  );
};

const AuthDetail = ({
  authEntry,
}: {
  authEntry: xdr.SorobanAuthorizationEntry;
}) => {
  // start off in loading state, we always need to fetch token details
  const [isLoading, setLoading] = useState(true);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const sorobanClient = useContext(SorobanContext);

  const { t } = useTranslation();
  const rootInvocation = authEntry.rootInvocation();
  const details = getInvocationDetails(rootInvocation);
  const invocations = details.filter(
    (detail) => detail.type === "invoke",
  ) as FnArgsInvoke[];
  const createWasms = details.filter(
    (detail) => detail.type === "wasm",
  ) as FnArgsCreateWasm[];
  const createSacs = details.filter(
    (detail) => detail.type === "sac",
  ) as FnArgsCreateSac[];

  const rootJson = buildInvocationTree(rootInvocation);
  const isInvokeContract = rootInvocation.function().switch().value === 0;
  const transfers = isInvokeContract ? pickTransfers(rootJson) : [];

  const [tokenDetails, setTokenDetails] = React.useState({} as TokenDetailMap);

  const tokenDetailsUrl = React.useCallback(
    (contractId: string) =>
      `${INDEXER_URL}/token-details/${contractId}?pub_key=${publicKey}&network=${networkDetails.network}`,
    [publicKey, networkDetails.network],
  );

  const transfersDepKey = JSON.stringify(transfers);
  React.useEffect(() => {
    async function getTokenDetails() {
      setLoading(true);
      const _tokenDetails = {} as TokenDetailMap;

      // eslint-disable-next-line
      for (const transfer of transfers) {
        try {
          if (isCustomNetwork(networkDetails)) {
            // eslint-disable-next-line
            const tokenBal = await getSorobanTokenBalance(
              sorobanClient.server,
              transfer.contractId,
              {
                // eslint-disable-next-line
                balance: await sorobanClient.newTxBuilder(),
                // eslint-disable-next-line
                name: await sorobanClient.newTxBuilder(),
                // eslint-disable-next-line
                decimals: await sorobanClient.newTxBuilder(),
                // eslint-disable-next-line
                symbol: await sorobanClient.newTxBuilder(),
              },
              [new Address(publicKey).toScVal()],
            );

            if (!tokenBal) {
              throw new Error("failed to fetch token details");
            }

            _tokenDetails[transfer.contractId] = {
              name: tokenBal.name,
              symbol: tokenBal.symbol,
              decimals: tokenBal.decimals,
            };

            setTokenDetails(_tokenDetails);
          } else {
            // eslint-disable-next-line
            const response = await fetch(tokenDetailsUrl(transfer.contractId));

            if (!response.ok) {
              // default details
              _tokenDetails[transfer.contractId] = {
                name: "",
                symbol: "",
                decimals: 0,
              };
              setTokenDetails(_tokenDetails);
              throw new Error("failed to fetch token details");
            }
            // eslint-disable-next-line
            const _details = await response.json();
            _tokenDetails[transfer.contractId] = _details;
          }
        } catch (error) {
          captureException(
            `Failed to fetch token details - ${JSON.stringify(error)}`,
          );
          console.error(error);
        }
      }
      setTokenDetails(_tokenDetails);
      setLoading(false);
    }
    getTokenDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfersDepKey, tokenDetailsUrl]);

  return (
    <div className="AuthDetail">
      {isLoading ? (
        <div className="AuthDetail__loader">
          <Loader size="3rem" />
        </div>
      ) : (
        <>
          <TransferWarning authEntry={authEntry} />
          <UnverifiedTokenTransferWarning details={invocations} />
          {authEntry.credentials().switch() ===
            xdr.SorobanCredentialsType.sorobanCredentialsSourceAccount() && (
            <InvokerAuthWarning />
          )}
          {transfers.map((transfer) => (
            <TransferSummary
              key={JSON.stringify(transfer)}
              transfer={transfer}
              tokenDetails={tokenDetails[transfer.contractId]}
            />
          ))}
          {invocations.map((detail) => (
            <React.Fragment key={detail.fnName}>
              <div className="AuthDetail__TitleRow">
                <Icon.Code />
                <h5>Invocation</h5>
              </div>
              <div className="AuthDetail__InfoBlock">
                <KeyValueList
                  operationKey={t("Contract ID")}
                  operationValue={
                    <CopyValue
                      value={detail.contractId}
                      displayValue={truncateString(detail.contractId)}
                    />
                  }
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
                  operationValue={
                    <CopyValue
                      value={detail.address}
                      displayValue={truncateString(detail.address)}
                    />
                  }
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
        </>
      )}
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
