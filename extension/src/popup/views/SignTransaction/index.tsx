import React, { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation, Trans } from "react-i18next";
import { Button, Icon } from "@stellar/design-system";
import BigNumber from "bignumber.js";
import {
  MuxedAccount,
  Transaction,
  TransactionBuilder,
  Federation,
  Memo,
  MemoType,
  Operation,
  xdr,
} from "stellar-sdk";

import { isNonSSLEnabledSelector } from "popup/ducks/settings";

import { ShowOverlayStatus } from "popup/ducks/transactionSubmission";

import { OPERATION_TYPES, TRANSACTION_WARNING } from "constants/transaction";

import {
  getPunycodedDomain,
  newTabHref,
  parsedSearchParam,
} from "helpers/urls";
import { emitMetric } from "helpers/metrics";
import {
  getCanonicalFromAsset,
  getTransactionInfo,
  isFederationAddress,
  isMuxedAccount,
  stroopToXlm,
  truncateString,
} from "helpers/stellar";
import { decodeMemo } from "popup/helpers/parseTransaction";
import { useIsDomainListedAllowed } from "popup/helpers/useIsDomainListedAllowed";
import { openTab } from "popup/helpers/navigate";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import {
  WarningMessageVariant,
  WarningMessage,
  SSLWarningMessage,
  BlockaidTxScanLabel,
  BlockAidTxScanExpanded,
} from "popup/components/WarningMessages";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { Loading } from "popup/components/Loading";
import { VerifyAccount } from "popup/views/VerifyAccount";
import { NativeAsset } from "@shared/api/types/account-balance";

import { RequestState } from "constants/request";
import { useGetSignTxData } from "./hooks/useGetSignTxData";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";
import { rejectTransaction, signTransaction } from "popup/ducks/access";
import { reRouteOnboarding } from "popup/helpers/route";
import { getSiteFavicon } from "popup/helpers/getSiteFavicon";
import { AssetIcons, BlockaidAssetDiff } from "@shared/api/types";
import { AssetIcon } from "popup/components/account/AccountAssets";
import {
  CLASSIC_ASSET_DECIMALS,
  formatTokenAmount,
  getInvocationDetails,
} from "popup/helpers/soroban";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import {
  KeyValueInvokeHostFnArgs,
  KeyValueList,
} from "popup/components/signTransaction/Operations/KeyVal";
import { CopyValue } from "popup/components/CopyValue";

import { Summary } from "./Preview/Summary";
import { Details } from "./Preview/Details";

import "./styles.scss";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";

export const SignTransaction = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const tx = getTransactionInfo(location.search);
  const { url } = parsedSearchParam(location.search);

  const {
    accountToSign: _accountToSign,
    transaction: { _fee, _networkPassphrase },
    transactionXdr,
    domain,
    isHttpsDomain,
    flaggedKeys,
  } = tx;

  const [hasAcceptedInsufficientFee, setHasAcceptedInsufficientFee] =
    useState(false);
  const [activePaneIndex, setActivePaneIndex] = useState(0);
  const isNonSSLEnabled = useSelector(isNonSSLEnabledSelector);
  const { isDomainListedAllowed } = useIsDomainListedAllowed({
    domain,
  });

  let accountToSign = _accountToSign;

  const { state: scanTxState, fetchData } = useGetSignTxData(
    {
      xdr: transactionXdr,
      url,
    },
    {
      showHidden: false,
      includeIcons: true,
    },
    accountToSign,
  );

  const {
    isConfirming,
    isPasswordRequired,
    handleApprove,
    hwStatus,
    rejectAndClose,
    setIsPasswordRequired,
    verifyPasswordThenSign,
    hardwareWalletType,
  } = useSetupSigningFlow(rejectTransaction, signTransaction, transactionXdr);

  // rebuild transaction to get Transaction prototypes
  const transaction = TransactionBuilder.fromXDR(
    transactionXdr,
    _networkPassphrase as string,
  );

  let _memo = {};
  let _sequence = "";

  if (!("innerTransaction" in transaction)) {
    _sequence = transaction.sequence;
    _memo = transaction.memo;
  }

  const decodedMemo = decodeMemo(_memo);

  const memo = decodedMemo?.value;

  const flaggedKeyValues = Object.values(flaggedKeys);
  const isMemoRequired = flaggedKeyValues.some(
    ({ tags }) => tags.includes(TRANSACTION_WARNING.memoRequired) && !memo,
  );

  const resolveFederatedAddress = useCallback(async (inputDest: string) => {
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
          accountToSign!,
        )) as string;
      }
    }
  };
  decodeAccountToSign();

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isMemoRequired) {
      emitMetric(METRIC_NAMES.signTransactionMemoRequired);
    }
  }, [isMemoRequired]);

  const isSubmitDisabled = isMemoRequired;

  if (
    scanTxState.state === RequestState.IDLE ||
    scanTxState.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  const hasError = scanTxState.state === RequestState.ERROR;
  if (scanTxState.data?.type === AppDataType.REROUTE) {
    if (scanTxState.data.shouldOpenTab) {
      openTab(newTabHref(scanTxState.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${scanTxState.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError) {
    reRouteOnboarding({
      type: scanTxState.data.type,
      applicationState: scanTxState.data.applicationState,
      state: scanTxState.state,
    });
  }

  const { networkName, networkPassphrase } = scanTxState.data?.networkDetails!;

  const scanResult = scanTxState.data?.scanResult;
  const hasNonBenignValidation = !!(
    scanResult?.validation &&
    "result_type" in scanResult.validation &&
    (scanResult.validation.result_type === "Malicious" ||
      scanResult.validation.result_type === "Warning")
  );
  const hasSimulationError =
    scanResult && scanResult.simulation && "error" in scanResult.simulation;
  const showBlockAidDetails = hasSimulationError || hasNonBenignValidation;
  const btnIsDestructive =
    (scanResult?.validation &&
      "result_type" in scanResult.validation &&
      scanResult.validation.result_type === "Malicious") ||
    hasSimulationError;

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

  if (!isHttpsDomain && !isNonSSLEnabled) {
    return <SSLWarningMessage url={domain} />;
  }

  const publicKey = scanTxState.data?.publicKey!;
  const { currentAccount } = scanTxState.data?.signFlowState!;

  const hasEnoughXlm = scanTxState.data?.balances.balances.some(
    (balance) =>
      "token" in balance &&
      balance.token.code === "XLM" &&
      (balance as NativeAsset).available.gt(stroopToXlm(_fee as string)),
  );

  if (
    currentAccount.publicKey &&
    !hasEnoughXlm &&
    !hasAcceptedInsufficientFee
  ) {
    return (
      <WarningMessage
        handleCloseClick={() => setHasAcceptedInsufficientFee(true)}
        isActive
        variant={WarningMessageVariant.warning}
        header={t("INSUFFICIENT FUNDS FOR FEE")}
      >
        <p data-testid="InsufficientBalanceWarning">
          <Trans domain={domain}>
            Your available XLM balance is not enough to pay for the transaction
            fee.
          </Trans>
        </p>
      </WarningMessage>
    );
  }

  const punycodedDomain = getPunycodedDomain(domain);
  const isDomainValid = punycodedDomain === domain;

  const favicon = getSiteFavicon(domain);
  const validDomain = isDomainValid ? punycodedDomain : `xn-${punycodedDomain}`;
  const _tx = transaction as Transaction<Memo<MemoType>, Operation[]>;
  const hasAuthEntries = _tx.operations.some(
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
        <MultiPaneSlider
          activeIndex={activePaneIndex}
          panes={[
            <div className="SignTransaction__Body">
              <div className="SignTransaction__TitleRow">
                <img
                  className="PunycodedDomain__favicon"
                  src={favicon}
                  alt="Site favicon"
                />
                <div className="SignTransaction__TitleRow__Detail">
                  <span className="SignTransaction__TitleRow__Title">
                    Confirm Transaction
                  </span>
                  <span className="SignTransaction__TitleRow__Domain">
                    {validDomain}
                  </span>
                </div>
              </div>
              <BlockaidTxScanLabel
                scanResult={scanResult!}
                onClick={() => setActivePaneIndex(1)}
              />
              {scanResult &&
                "simulation" in scanResult &&
                scanResult.simulation &&
                scanResult.simulation.status === "Success" &&
                "assets_diffs" in scanResult.simulation &&
                scanResult.simulation.assets_diffs !== undefined && (
                  <AssetDiffs
                    icons={scanTxState.data?.icons || {}}
                    assetDiffs={scanResult.simulation.assets_diffs![publicKey]}
                  />
                )}
              <div className="SignTransaction__Metadata">
                <div className="SignTransaction__Metadata__Row">
                  <div className="SignTransaction__Metadata__Label">
                    <Icon.Wallet01 />
                    <span>Wallet</span>
                  </div>
                  <div className="SignTransaction__Metadata__Value">
                    <KeyIdenticon publicKey={publicKey} />
                  </div>
                </div>
                <div className="SignTransaction__Metadata__Row">
                  <div className="SignTransaction__Metadata__Label">
                    <Icon.Route />
                    <span>Fee</span>
                  </div>
                  <div className="SignTransaction__Metadata__Value">
                    <span>
                      {formatTokenAmount(
                        new BigNumber(_fee),
                        CLASSIC_ASSET_DECIMALS,
                      )}{" "}
                      XLM
                    </span>
                  </div>
                </div>
              </div>
              <div className="SignTransaction__TransactionDetails">
                <div className="SignTransaction__TransactionDetails__Title">
                  <Icon.List />
                  <span>Transaction Details</span>
                </div>
                <Summary
                  sequenceNumber={_sequence}
                  fee={_fee}
                  memo={decodedMemo}
                  operationNames={_tx.operations.map(
                    (op) => OPERATION_TYPES[op.type] || op.type,
                  )}
                />
                <Details
                  operations={_tx.operations}
                  flaggedKeys={flaggedKeys}
                  isMemoRequired={isMemoRequired}
                />
                {hasAuthEntries && (
                  <AuthEntries
                    operation={
                      _tx.operations[0] as Operation.InvokeHostFunction
                    }
                  />
                )}
              </div>
            </div>,
            <BlockAidTxScanExpanded
              scanResult={scanResult!}
              onClose={() => setActivePaneIndex(0)}
            />,
          ]}
        />
        <div className="SignTransaction__Actions">
          <div className="SignTransaction__Actions__BtnRow">
            {showBlockAidDetails ? (
              <div className="SignTransaction__Actions__BtnRowReject">
                <Button
                  isFullWidth
                  isRounded
                  size="md"
                  variant={btnIsDestructive ? "destructive" : "secondary"}
                  onClick={() => rejectAndClose()}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  disabled={isSubmitDisabled}
                  variant="error"
                  isFullWidth
                  isRounded
                  size="md"
                  isLoading={isConfirming}
                  onClick={() => handleApprove()}
                  className={`SignTransaction__Action__ConfirmAnyway ${btnIsDestructive ? "" : "Warning"}`}
                >
                  {t("Confirm anyway")}
                </Button>
              </div>
            ) : (
              <>
                <Button
                  isFullWidth
                  isRounded
                  size="md"
                  variant="tertiary"
                  onClick={() => rejectAndClose()}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  data-testid="sign-transaction-sign"
                  disabled={isSubmitDisabled || !isDomainListedAllowed}
                  variant="secondary"
                  isFullWidth
                  isRounded
                  size="md"
                  isLoading={isConfirming}
                  onClick={() => handleApprove()}
                >
                  {t("Confirm")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

interface AssetDiffsProps {
  assetDiffs: Array<BlockaidAssetDiff>;
  icons: AssetIcons;
}

const AssetDiffs = ({ assetDiffs, icons }: AssetDiffsProps) => {
  const renderAssetDiffs = (diff: BlockaidAssetDiff) => {
    switch (diff.asset_type) {
      // TODO: handle custom token decimals case
      case "ASSET":
      default: {
        const code = "code" in diff.asset ? diff.asset.code! : "";
        const issuer = "issuer" in diff.asset ? diff.asset.issuer! : "";
        const canonical = getCanonicalFromAsset(code, issuer);
        const icon = icons[canonical];
        return (
          <div className="SignTransaction__AssetDiffRow">
            <div className="SignTransaction__AssetDiffRow__Asset">
              <AssetIcon
                assetIcons={code !== "XLM" ? { [canonical]: icon } : {}}
                code={code}
                issuerKey={issuer}
              />
              {code}
            </div>
            {diff.in && (
              <div className="SignTransaction__AssetDiffRow__Amount Credit">
                {`+${formatTokenAmount(new BigNumber(diff.in.raw_value), CLASSIC_ASSET_DECIMALS)}`}
              </div>
            )}
            {diff.out && (
              <div className="SignTransaction__AssetDiffRow__Amount Debit">
                {`-${formatTokenAmount(new BigNumber(diff.out.raw_value), CLASSIC_ASSET_DECIMALS)}`}
              </div>
            )}
          </div>
        );
      }
    }
  };
  return (
    <div className="SignTransaction__AssetDiffs">
      {assetDiffs.map(renderAssetDiffs)}
    </div>
  );
};

interface AuthEntriesProps {
  operation: Operation.InvokeHostFunction;
}

const AuthEntries = ({ operation }: AuthEntriesProps) => {
  const { t } = useTranslation();
  const authEntries = operation.auth || [];

  const renderAuthEntry = (authEntry: xdr.SorobanAuthorizationEntry) => {
    const rootInvocation = authEntry.rootInvocation();
    const details = getInvocationDetails(rootInvocation);
    const invocations = details.filter((detail) => detail.type === "invoke");
    const createWasms = details.filter((detail) => detail.type === "wasm");
    const createSacs = details.filter((detail) => detail.type === "sac");

    return (
      <div className="SignTransaction__AuthEntry">
        {invocations.map((detail) => (
          <React.Fragment key={detail.fnName}>
            <div
              className="SignTransaction__AuthEntry__TitleRow"
              data-testid="AuthDetail__invocation"
            >
              <Icon.CodeSnippet01 />
              <span>Invocation</span>
            </div>
            <div className="SignTransaction__AuthEntry__InfoBlock">
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
            <div
              className="SignTransaction__AuthEntry__TitleRow"
              data-testid="SignTransaction__AuthEntry__CreateWasmInvocation"
            >
              <Icon.CodeSnippet01 />
              <span>Contract Creation</span>
            </div>
            <div className="SignTransaction__AuthEntry__InfoBlock">
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
              {detail.args && <KeyValueInvokeHostFnArgs args={detail.args} />}
            </div>
          </React.Fragment>
        ))}
        {createSacs.map((detail) => (
          <React.Fragment key={detail.asset}>
            <div className="SignTransaction__AuthEntry__TitleRow">
              <Icon.CodeSnippet01 />
              <span>Contract Creation</span>
            </div>
            <div className="SignTransaction__AuthEntry__InfoBlock">
              <KeyValueList
                operationKey={t("Asset")}
                operationValue={truncateString(detail.asset)}
              />
              {detail.args && <KeyValueInvokeHostFnArgs args={detail.args} />}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="SignTransaction__AuthEntries">
      <div className="SignTransaction__AuthEntries__TitleRow">
        <Icon.Key01 />
        <span>Authorizations</span>
      </div>
      {authEntries.map(renderAuthEntry)}
    </div>
  );
};
