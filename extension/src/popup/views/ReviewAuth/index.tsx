import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { captureException } from "@sentry/browser";
import BigNumber from "bignumber.js";
import {
  MemoType,
  Operation,
  Transaction,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";
import { useSelector } from "react-redux";
import { Button, Icon, Loader } from "@stellar/design-system";

import { decodeString } from "helpers/urls";
import { getIsTokenSpec, getTokenDetails } from "@shared/api/internal";
import { TokenArgsDisplay } from "@shared/api/helpers/soroban";

import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { signTransaction, rejectTransaction } from "popup/ducks/access";
import { ShowOverlayStatus } from "popup/ducks/transactionSubmission";
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
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { OPERATION_TYPES } from "constants/transaction";
import { Summary } from "../SignTransaction/Preview/Summary";
import { Details } from "../SignTransaction/Preview/Details";
import { Data } from "../SignTransaction/Preview/Data";
import { VerifyAccount } from "../VerifyAccount";

import "./styles.scss";

export const ReviewAuth = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const [isLoadingAuth, setLoadingAuth] = useState(true);

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
    hardwareWalletType,
    hwStatus,
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
    setLoadingAuth(true);
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
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && hardwareWalletType && (
        <HardwareSign walletType={hardwareWalletType} />
      )}
      <div className="ReviewAuth">
        <div className="ReviewAuth__Body">
          <div className="ReviewAuth__Title">
            <PunycodedDomain domain={params.domain} />
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
                <AuthDetail
                  authEntry={op.auth[activeAuthEntryIndex]}
                  isLoading={isLoadingAuth}
                  setLoading={setLoadingAuth}
                />
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
    </>
  );
};

interface TokenDetails {
  name: string;
  symbol: string;
  decimals: number | null;
}
type TokenDetailMap = Record<string, TokenDetails>;

const TransferSummary = ({
  transfer,
  tokenDetails = { name: "", symbol: "", decimals: null },
}: {
  transfer: {
    amount: string;
    contractId: string;
    from: string;
    to: string;
  };
  tokenDetails: TokenDetails;
}) => {
  const hasTokenDetails = tokenDetails.symbol && tokenDetails.decimals !== null;
  const isNative = tokenDetails.symbol === "native";
  const symbol = isNative ? "XLM" : tokenDetails.symbol;
  return (
    <div className="AuthDetail__InfoBlock TransferSummary">
      <div className="SummaryBlock">
        <div className="SummaryBlock__Title">
          <Icon.ArrowCircleRight width="18" height="18" />
          <p className="FieldTitle">Receiver</p>
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
          <Icon.ArrowCircleLeft width="18" height="18" />
          <p className="FieldTitle">Sender</p>
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
          <Icon.Toll width="18" height="18" />
          <p className="FieldTitle">Amount</p>
        </div>
        <div className="SummaryBlock__Title">
          {hasTokenDetails ? (
            <>
              <p>
                {formatTokenAmount(
                  new BigNumber(transfer.amount),
                  Number(tokenDetails.decimals),
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
  setLoading,
  isLoading,
}: {
  authEntry: xdr.SorobanAuthorizationEntry;
  setLoading: (isLoading: boolean) => void;
  isLoading: boolean;
}) => {
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [authTransfers, setAuthTransfers] = React.useState(
    [] as TokenArgsDisplay[],
  );
  const [isCheckingTransfers, setCheckingTransfers] = React.useState(true);

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

  const rootJsonDepKey = JSON.stringify(
    rootJson,
    (_, val) => (typeof val === "bigint" ? val.toString() : val),
    2,
  );
  React.useEffect(() => {
    async function getIsToken() {
      try {
        const transfers = [];
        const isToken = await getIsTokenSpec({
          contractId: rootJson.args.source,
          networkDetails,
        });
        if (isToken && rootJson.args.function === "transfer") {
          transfers.push({
            contractId: rootJson.args.source as string,
            amount: rootJson.args.args[2].toString() as string,
            to: rootJson.args.args[1] as string,
            from: rootJson.args.args[0] as string,
          });
        }
        // check for sub transfers
        // eslint-disable-next-line no-restricted-syntax
        for (const subInvocation of rootJson.invocations) {
          const isSubInvokeToken = await getIsTokenSpec({
            contractId: subInvocation.args.source,
            networkDetails,
          });
          if (isSubInvokeToken && subInvocation.args.function === "transfer") {
            transfers.push({
              contractId: subInvocation.args.source as string,
              amount: subInvocation.args.args[2].toString() as string,
              to: subInvocation.args.args[1] as string,
              from: subInvocation.args.args[0] as string,
            });
          }
        }
        setAuthTransfers(transfers);
        setCheckingTransfers(false);
      } catch (error) {
        console.error(error);
        setCheckingTransfers(false);
      }
    }
    if (isInvokeContract) {
      getIsToken();
    } else {
      setCheckingTransfers(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInvokeContract, rootJsonDepKey]);

  const [tokenDetails, setTokenDetails] = React.useState({} as TokenDetailMap);

  const transfersDepKey = JSON.stringify(authTransfers);
  React.useEffect(() => {
    async function _getTokenDetails() {
      setLoading(true);
      const _tokenDetails = {} as TokenDetailMap;

      // eslint-disable-next-line
      for (const transfer of authTransfers) {
        try {
          // eslint-disable-next-line
          const tokenDetailsResponse = await getTokenDetails({
            contractId: transfer.contractId,
            publicKey,
            networkDetails,
          });

          if (!tokenDetailsResponse) {
            // default details
            _tokenDetails[transfer.contractId] = {
              name: "",
              symbol: "",
              decimals: null,
            };
            setTokenDetails(_tokenDetails);
            throw new Error("failed to fetch token details");
          }
          _tokenDetails[transfer.contractId] = tokenDetailsResponse;
        } catch (error) {
          captureException(
            `Failed to fetch token details - ${JSON.stringify(error)} - ${
              transfer.contractId
            } - ${networkDetails.network}`,
          );
          console.error(error);
        }
      }
      setTokenDetails(_tokenDetails);
      setLoading(false);
    }
    _getTokenDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfersDepKey]);

  return (
    <div className="AuthDetail" data-testid="AuthDetail">
      {isLoading || isCheckingTransfers ? (
        <div className="AuthDetail__loader">
          <Loader size="3rem" />
        </div>
      ) : (
        <div data-testid="AuthDetail__transfers">
          <TransferWarning transfers={authTransfers} />
          <UnverifiedTokenTransferWarning transfers={authTransfers} />
          {authEntry.credentials().switch() ===
            xdr.SorobanCredentialsType.sorobanCredentialsSourceAccount() && (
            <InvokerAuthWarning />
          )}
          {authTransfers.map((transfer) => (
            <TransferSummary
              key={JSON.stringify(transfer)}
              transfer={transfer}
              tokenDetails={tokenDetails[transfer.contractId]}
            />
          ))}
          {invocations.map((detail) => (
            <React.Fragment key={detail.fnName}>
              <div
                className="AuthDetail__TitleRow"
                data-testid="AuthDetail__invocation"
              >
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
                <KeyValueInvokeHostFnArgs
                  args={detail.args}
                  contractId={detail.contractId}
                  fnName={detail.fnName}
                />
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
        </div>
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
