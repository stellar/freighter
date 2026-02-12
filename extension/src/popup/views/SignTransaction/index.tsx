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
  Asset,
  LiquidityPoolAsset,
  getLiquidityPoolId,
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
  getTransactionInfo,
  isFederationAddress,
  isMuxedAccount,
  stroopToXlm,
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
  DomainNotAllowedWarningMessage,
  MemoRequiredLabel,
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
import { publicKeySelector } from "popup/ducks/accountServices";
import { reRouteOnboarding } from "popup/helpers/route";
import { getSiteFavicon } from "popup/helpers/getSiteFavicon";
import { AssetIcons, BlockaidAssetDiff } from "@shared/api/types";
import { AssetIcon } from "popup/components/account/AccountAssets";
import {
  CLASSIC_ASSET_DECIMALS,
  formatTokenAmount,
} from "popup/helpers/soroban";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";

import { AuthEntries } from "popup/components/AuthEntry";
import { Summary } from "./Preview/Summary";
import { Details } from "./Preview/Details";

import "./styles.scss";

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
    uuid,
  } = tx;

  const [hasAcceptedInsufficientFee, setHasAcceptedInsufficientFee] =
    useState(false);
  const [activePaneIndex, setActivePaneIndex] = useState(0);
  const isNonSSLEnabled = useSelector(isNonSSLEnabledSelector);
  const publicKey = useSelector(publicKeySelector);
  const { isDomainListedAllowed } = useIsDomainListedAllowed({
    domain,
  });

  let accountToSign = _accountToSign;

  const { state: signTxState, fetchData } = useGetSignTxData(
    {
      xdr: transactionXdr,
      url,
    },
    {
      showHidden: false,
      includeIcons: false,
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
  } = useSetupSigningFlow(
    rejectTransaction,
    signTransaction,
    transactionXdr,
    undefined,
    uuid,
  );

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

  // Check if memo is required based on flaggedKeys (populated by background script)
  // flaggedKeys is already validated when the transaction is received, so no need to re-validate
  const isMemoRequired = Object.values(flaggedKeys).some(
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

  // Disable submit when memo is missing or domain not allowed
  const isSubmitDisabled = isMemoRequired || !isDomainListedAllowed;

  if (
    signTxState.state === RequestState.IDLE ||
    signTxState.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  const hasError = signTxState.state === RequestState.ERROR;
  if (signTxState.data?.type === AppDataType.REROUTE) {
    if (signTxState.data.shouldOpenTab) {
      openTab(newTabHref(signTxState.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${signTxState.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError) {
    reRouteOnboarding({
      type: signTxState.data.type,
      applicationState: signTxState.data.applicationState,
      state: signTxState.state,
    });
  }

  const { networkName, networkPassphrase } = signTxState.data?.networkDetails!;

  const scanResult = signTxState.data?.scanResult;
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
          {`${t("The transaction you’re trying to sign is on")} `}
          {_networkPassphrase}.
        </p>
        <p>{t("Signing this transaction is not possible at the moment.")}</p>
      </WarningMessage>
    );
  }

  if (!isHttpsDomain && !isNonSSLEnabled) {
    return <SSLWarningMessage url={domain} />;
  }

  const { currentAccount } = signTxState.data?.signFlowState!;

  const hasEnoughXlm = signTxState.data?.balances.balances.some(
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
  const trustlineChanges = _tx.operations.filter(
    (op) => op.type === "changeTrust",
  );

  const assetDiffs =
    scanResult?.simulation?.status === "Success"
      ? scanResult.simulation.assets_diffs?.[publicKey]
      : undefined;

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
              <div className="SignTransaction__Body__Wrapper">
                <div className="SignTransaction__TitleRow">
                  <img
                    className="PunycodedDomain__favicon"
                    src={favicon}
                    alt={t("Site favicon")}
                  />
                  <div className="SignTransaction__TitleRow__Detail">
                    <span className="SignTransaction__TitleRow__Title">
                      {t("Confirm Transaction")}
                    </span>
                    <span className="SignTransaction__TitleRow__Domain">
                      {validDomain}
                    </span>
                  </div>
                </div>
                {scanResult && (
                  <BlockaidTxScanLabel
                    scanResult={scanResult}
                    onClick={() => setActivePaneIndex(1)}
                  />
                )}
                {!isDomainListedAllowed && (
                  <DomainNotAllowedWarningMessage domain={domain} />
                )}
                {isMemoRequired && (
                  <MemoRequiredLabel onClick={() => setActivePaneIndex(3)} />
                )}
                {assetDiffs && (
                  <AssetDiffs
                    icons={signTxState.data?.icons || {}}
                    assetDiffs={assetDiffs}
                  />
                )}
                {trustlineChanges.length > 0 && (
                  <Trustline
                    operations={trustlineChanges}
                    icons={signTxState.data?.icons || {}}
                  />
                )}
                <div className="SignTransaction__Metadata">
                  <div className="SignTransaction__Metadata__Row">
                    <div className="SignTransaction__Metadata__Label">
                      <Icon.Wallet01 />
                      <span>{t("Wallet")}</span>
                    </div>
                    <div className="SignTransaction__Metadata__Value">
                      <KeyIdenticon publicKey={publicKey} />
                    </div>
                  </div>
                  <div className="SignTransaction__Metadata__Row">
                    <div className="SignTransaction__Metadata__Label">
                      <Icon.Route />
                      <span>{t("Fee")}</span>
                    </div>
                    <div className="SignTransaction__Metadata__Value">
                      <span>
                        {`${formatTokenAmount(new BigNumber(_fee), CLASSIC_ASSET_DECIMALS)} XLM `}
                      </span>
                    </div>
                  </div>
                  <div className="SignTransaction__Metadata__Row">
                    <div className="SignTransaction__Metadata__Label">
                      <Icon.File02 />
                      <span>{t("Memo")}</span>
                    </div>
                    <div className="SignTransaction__Metadata__Value">
                      <span>
                        {decodedMemo && decodedMemo.value
                          ? decodedMemo.value
                          : t("None")}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className="SignTransaction__TransactionDetailsBtn"
                  onClick={() => setActivePaneIndex(2)}
                >
                  <Icon.List />
                  <span>{t("Transaction details")}</span>
                </div>
              </div>
            </div>,
            <BlockAidTxScanExpanded
              scanResult={scanResult!}
              onClose={() => setActivePaneIndex(0)}
            />,
            <div className="SignTransaction__Body">
              <div className="SignTransaction__Body__Wrapper">
                <div className="SignTransaction__TransactionDetails">
                  <div className="SignTransaction__TransactionDetails__Header">
                    <div className="DetailsMark">
                      <Icon.List />
                    </div>
                    <div
                      className="Close"
                      onClick={() => setActivePaneIndex(0)}
                    >
                      <Icon.X />
                    </div>
                  </div>
                  <div className="SignTransaction__TransactionDetails__Title">
                    <span>{t("Transaction Details")}</span>
                  </div>
                  <div className="SignTransaction__TransactionDetails__Summary">
                    <Summary
                      sequenceNumber={_sequence}
                      fee={_fee}
                      memo={decodedMemo}
                      xdr={transactionXdr}
                      operationNames={_tx.operations.map(
                        (op) => OPERATION_TYPES[op.type] || op.type,
                      )}
                    />
                  </div>
                  {hasAuthEntries && (
                    <AuthEntries
                      invocations={
                        (
                          _tx.operations[0] as Operation.InvokeHostFunction
                        ).auth?.map((authEntry) =>
                          authEntry.rootInvocation(),
                        ) || []
                      }
                    />
                  )}
                  <Details
                    operations={_tx.operations}
                    flaggedKeys={flaggedKeys}
                    isMemoRequired={isMemoRequired}
                  />
                </div>
              </div>
            </div>,
            <div className="SignTransaction__Body">
              <div className="SignTransaction__Body__Wrapper">
                <div className="SignTransaction__TransactionDetails">
                  <div className="SignTransaction__TransactionDetails__Header">
                    <div className="DetailsMark">
                      <Icon.File02 />
                    </div>
                    <div
                      className="Close"
                      onClick={() => setActivePaneIndex(0)}
                    >
                      <Icon.X />
                    </div>
                  </div>
                  <div className="SignTransaction__TransactionDetails__Title">
                    <span>{t("Memo is required")}</span>
                  </div>
                  <div className="SignTransaction__TransactionDetails__Summary">
                    <div className="WarningMessage__infoBlock WarningMessage__infoBlock--warning">
                      <div className="WarningMessage__header">
                        <Icon.InfoOctagon className="WarningMessage__icon" />
                        <div>{t("Memo is required")}</div>
                      </div>
                    </div>
                    <div>
                      {t(
                        "A destination account requires the use of the memo field which is not present in the transaction you’re about to sign.",
                      )}
                    </div>
                    <div>
                      {t(
                        "Freighter automatically disabled the option to sign this transaction.",
                      )}
                    </div>
                    <div>
                      {t(
                        "Check the destination account memo requirements and include it in the transaction.",
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
          ]}
        />
        <div className="SignTransaction__Actions">
          <div className="SignTransaction__Actions__BtnRow">
            {showBlockAidDetails ? (
              <div className="SignTransaction__Actions__BtnRowReject">
                <Button
                  isFullWidth
                  isRounded
                  size="lg"
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
                  size="lg"
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
                  size="lg"
                  variant="tertiary"
                  onClick={() => rejectAndClose()}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  data-testid="sign-transaction-sign"
                  disabled={isSubmitDisabled}
                  variant="secondary"
                  isFullWidth
                  isRounded
                  size="lg"
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
      // NOTE:
      // Blockaid does not populate custom tokens in asset diffs
      // If the begin to do this, we will need to add a lookup for token details
      // When asset diffs include tokens not in the users balance.
      case "NATIVE":
      case "ASSET":
      default: {
        const code = "code" in diff.asset ? diff.asset.code! : "";
        const issuer = "issuer" in diff.asset ? diff.asset.issuer! : "";
        return (
          <div className="SignTransaction__AssetDiffRow">
            <div className="SignTransaction__AssetDiffRow__Asset">
              <AssetIcon
                assetIcons={code !== "XLM" ? icons : {}}
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

interface TrustlineProps {
  operations: Operation.ChangeTrust[];
  icons: AssetIcons;
}

export const Trustline = ({ operations, icons }: TrustlineProps) => {
  const { t } = useTranslation();
  const renderTrustlineChanges = (operation: Operation.ChangeTrust) => {
    const { line, limit } = operation;
    const isRemoveTrustline = new BigNumber(limit).isZero();

    const renderTrustlineAsset = (line: Asset | LiquidityPoolAsset) => {
      if ("code" in line) {
        const { code, issuer } = line;
        return (
          <>
            <AssetIcon
              assetIcons={code !== "XLM" ? icons : {}}
              code={code}
              issuerKey={issuer}
            />
            {code}
          </>
        );
      }
      const parameters = line.getLiquidityPoolParameters();
      const poolId = getLiquidityPoolId("constant_product", parameters);
      return (
        <>
          <AssetIcon assetIcons={{}} code={""} issuerKey={""} isLPShare />
          {poolId.toString("hex")}
        </>
      );
    };

    return (
      <div className="SignTransaction__TrustlineRow">
        <div
          className="SignTransaction__TrustlineRow__Asset"
          data-testid="SignTransaction__TrustlineRow__Asset"
        >
          {renderTrustlineAsset(line)}
        </div>
        <div
          className="SignTransaction__TrustlineRow__Type"
          data-testid="SignTransaction__TrustlineRow__Type"
        >
          {isRemoveTrustline ? (
            <>
              <Icon.MinusCircle />
              <span>{t("Remove Trustline")}</span>
            </>
          ) : (
            <>
              <Icon.PlusCircle />
              <span>{t("Add Trustline")}</span>
            </>
          )}
        </div>
      </div>
    );
  };
  return (
    <div className="SignTransaction__Trustlines">
      {operations.map(renderTrustlineChanges)}
    </div>
  );
};
