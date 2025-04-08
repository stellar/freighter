import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card, Loader, Icon, Button, CopyText } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { HorizonApi } from "stellar-sdk/lib/horizon";

import {
  getAssetFromCanonical,
  isMainnet,
  isMuxedAccount,
  getConversionRate,
  truncatedFedAddress,
} from "helpers/stellar";
import { getStellarExpertUrl } from "popup/helpers/account";
import {
  defaultBlockaidScanAssetResult,
  isCustomNetwork,
} from "@shared/helpers/stellar";
import { isTxSuspicious } from "popup/helpers/blockaid";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { ShowOverlayStatus } from "popup/ducks/transactionSubmission";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { FedOrGAddress } from "popup/basics/sendPayment/FedOrGAddress";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import {
  BlockaidTxScanLabel,
  FlaggedWarningMessage,
} from "popup/components/WarningMessages";
import { View } from "popup/basics/layout/View";

import { TRANSACTION_WARNING } from "constants/transaction";
import { findAssetBalance } from "popup/helpers/balance";
import { formatAmount } from "popup/helpers/formatters";
import { isContractId } from "popup/helpers/soroban";
import { WalletType } from "@shared/constants/hardwareWallet";

import { resetSimulation } from "popup/ducks/token-payment";
import { RequestState } from "popup/views/Account/hooks/useGetAccountData";
import { TwoAssetCard } from "popup/components/TwoAssetCard";
import { TransactionData } from "types/transactions";
import { GetSettingsData } from "popup/views/SendPayment/hooks/useGetSettingsData";
import {
  computeDestMinWithSlippage,
  TxDetailsData,
  useGetTxDetailsData,
} from "./hooks/useGetTxDetailsData";
import { SignTxResponse } from "./hooks/useSignAndSubmitTx";

import "./styles.scss";

interface TransactionDetails {
  transactionSimulation: GetSettingsData["simulationResponse"];
  transactionData: TransactionData;
  goBack: () => void;
  shouldScanTx: boolean;
  signAndSubmit: (transactionXDR: string) => Promise<SignTxResponse | Error>;
  signAndSubmitHardware: (
    transactionXDR: string,
    walletType: WalletType.LEDGER,
    bipPath: string,
    isHashSigningEnabled: boolean,
    isAuthEntry: boolean,
    shouldSubmit: boolean,
  ) => Promise<
    HorizonApi.SubmitTransactionResponse | Buffer<ArrayBufferLike> | undefined
  >;
  submissionStatus: RequestState;
  transactionHash: string;
}

export const TransactionDetails = ({
  transactionData,
  transactionSimulation,
  goBack,
  shouldScanTx,
  signAndSubmit,
  signAndSubmitHardware,
  submissionStatus,
  transactionHash,
}: TransactionDetails) => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const {
    asset,
    amount,
    allowedSlippage,
    destination,
    destinationAsset,
    destinationAmount,
    memo,
    federationAddress,
    transactionFee,
    path,
    transactionTimeout,
  } = transactionData;

  const [hwStatus, setHwStatus] = React.useState(ShowOverlayStatus.IDLE);
  const isToken = isContractId(asset);

  const isPathPayment = destinationAsset !== "";
  const { isMemoValidationEnabled } = useSelector(settingsSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const isSwap = useIsSwap();
  const sourceAsset = getAssetFromCanonical(asset);
  const isSoroswap = false; // TODO: is src or dest in soroswap tokens, need to move those up higher and take as props
  const scanParams =
    isToken || isSoroswap || isContractId(destination)
      ? {
          type: "soroban" as const,
          xdr: transactionSimulation!.preparedTransaction,
        }
      : {
          type: "classic" as const,
          sourceAsset,
          destAsset: getAssetFromCanonical(destinationAsset || "native"),
          amount,
          destinationAmount,
          destination,
          allowedSlippage,
          path,
          isPathPayment,
          isSwap,
          memo,
          transactionFee,
          transactionTimeout,
        };
  const { state: txDetailsData, fetchData } = useGetTxDetailsData(
    publicKey,
    destination,
    networkDetails,
    getAssetFromCanonical(destinationAsset || "native"),
    sourceAsset,
    {
      shouldScan: shouldScanTx,
      url: "internal",
      params: scanParams,
    },
    {
      isMainnet: isMainnet(networkDetails),
      showHidden: false,
      includeIcons: true,
    },
  );

  const { t } = useTranslation();
  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!hardwareWalletType;

  const destAsset = getAssetFromCanonical(destinationAsset || "native");

  const _isMainnet = isMainnet(networkDetails);
  const isValidatingMemo = isMemoValidationEnabled && _isMainnet;

  const handleSend = async () => {
    if (isHardwareWallet) {
      setHwStatus(ShowOverlayStatus.IN_PROGRESS);
      return;
    }
    await signAndSubmit(txDetailsData.data?.transactionXdr!);
  };

  const showMemo = !isSwap && !isMuxedAccount(destination);

  const StellarExpertButton = () =>
    !isCustomNetwork(networkDetails) && !isToken ? (
      <Button
        size="md"
        isFullWidth
        variant="tertiary"
        onClick={() =>
          openTab(
            `${getStellarExpertUrl(networkDetails)}/tx/${transactionHash}`,
          )
        }
      >
        {t("View on")} stellar.expert
      </Button>
    ) : null;

  const renderPageTitle = (isSuccess: boolean) => {
    if (isSuccess) {
      return isSwap ? t("Swapped") : `${t("Sent")} ${sourceAsset.code}`;
    }

    return isSwap ? t("Confirm Swap") : `${t("Confirm Send")}`;
  };

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getBlockaidData = (
    details: TxDetailsData | null,
    source: ReturnType<typeof getAssetFromCanonical>,
    dest: ReturnType<typeof getAssetFromCanonical>,
  ) => {
    const sourceBalance = findAssetBalance(details!.balances.balances, source);
    const destBalance = findAssetBalance(
      details!.destinationBalances.balances,
      dest,
    );
    if (
      sourceBalance &&
      details!.isSourceAssetSuspicious &&
      "blockaidData" in sourceBalance
    ) {
      return sourceBalance.blockaidData;
    }
    if (
      destBalance &&
      details!.isDestAssetSuspicious &&
      "blockaidData" in destBalance
    ) {
      return destBalance.blockaidData;
    }
    return defaultBlockaidScanAssetResult;
  };

  const isLoading =
    txDetailsData.state === RequestState.IDLE ||
    txDetailsData.state === RequestState.LOADING;

  const matchingBlockedTags = txDetailsData
    .data!.memoRequiredAccounts.filter(({ address }) => address === destination)
    .flatMap(({ tags }) => tags);
  const isMemoRequired =
    isValidatingMemo &&
    matchingBlockedTags.some(
      (tag) => tag === TRANSACTION_WARNING.memoRequired && !memo,
    );

  const isSubmitDisabled = isMemoRequired;

  return (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && hardwareWalletType && (
        <HardwareSign walletType={hardwareWalletType} />
      )}
      {isLoading ? (
        <View.Content hasNoTopPadding>
          <div className="TransactionDetails__loader">
            <Loader size="2rem" />
          </div>
        </View.Content>
      ) : (
        <React.Fragment>
          {submissionStatus === RequestState.LOADING && (
            <div className="TransactionDetails__processing">
              <div className="TransactionDetails__processing__header">
                <Loader />{" "}
                <span>
                  {t("Processing")} {isSwap ? t("swap") : t("transaction")}
                </span>
              </div>
              <div className="TransactionDetails__processing__copy">
                {t("Please don’t close this window")}
              </div>
            </div>
          )}
          <SubviewHeader
            title={renderPageTitle(submissionStatus === RequestState.SUCCESS)}
            customBackAction={goBack}
            customBackIcon={
              submissionStatus === RequestState.SUCCESS ? <Icon.XClose /> : null
            }
          />
          <View.Content hasNoTopPadding>
            {!(isPathPayment || isSwap) && (
              <div className="TransactionDetails__cards">
                <Card>
                  <div className="TransactionDetails__send-asset">
                    <div className="TransactionDetails__copy-left">
                      <AssetIcon
                        assetIcons={txDetailsData.data?.balances?.icons || {}}
                        code={sourceAsset.code}
                        issuerKey={sourceAsset.issuer}
                        isLPShare={false}
                        soroswapTokens={
                          txDetailsData.data?.soroswapTokens || []
                        }
                      />
                    </div>
                    <div className="TransactionDetails__copy-right">
                      <div className="send-asset-value">
                        <div
                          className="send-asset-amount"
                          data-testid="asset-amount"
                        >
                          {formatAmount(amount)} <span>{sourceAsset.code}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {(isPathPayment || isSwap) && (
              <TwoAssetCard
                sourceAssetIcons={txDetailsData.data?.balances?.icons || {}}
                sourceCanon={asset}
                sourceAmount={amount}
                destAssetIcons={
                  txDetailsData.data?.destinationBalances?.icons || {}
                }
                destCanon={destinationAsset || "native"}
                destAmount={destinationAmount}
                isSourceAssetSuspicious={
                  txDetailsData.data!.isSourceAssetSuspicious
                }
                isDestAssetSuspicious={
                  txDetailsData.data!.isDestAssetSuspicious
                }
                soroswapTokens={txDetailsData.data?.soroswapTokens || []}
              />
            )}

            {!isSwap && (
              <div className="TransactionDetails__row">
                <div>{t("Sending to")} </div>
                <div className="TransactionDetails__row__right">
                  <div className="TransactionDetails__identicon">
                    <FedOrGAddress
                      fedAddress={truncatedFedAddress(federationAddress)}
                      gAddress={destination}
                    />
                  </div>
                </div>
              </div>
            )}
            {showMemo && (
              <div className="TransactionDetails__row">
                <div>{t("Memo")}</div>
                <div className="TransactionDetails__row__right">
                  {memo || t("None")}
                </div>
              </div>
            )}

            {(isPathPayment || isSwap) && (
              <div className="TransactionDetails__row">
                <div>{t("Conversion rate")} </div>
                <div
                  className="TransactionDetails__row__right"
                  data-testid="TransactionDetailsConversionRate"
                >
                  1 {sourceAsset.code} /{" "}
                  {getConversionRate(amount, destinationAmount).toFixed(2)}{" "}
                  {destAsset.code}
                </div>
              </div>
            )}
            <div className="TransactionDetails__row">
              <div>{t("Transaction fee")} </div>
              <div
                className="TransactionDetails__row__right"
                data-testid="TransactionDetailsTransactionFee"
              >
                {transactionFee} XLM
              </div>
            </div>
            {transactionSimulation && (
              <>
                <div className="TransactionDetails__row">
                  <div>{t("Resource cost")} </div>
                  <div className="TransactionDetails__row__right">
                    <div className="TransactionDetails__row__right__item">
                      {
                        transactionSimulation.simulationTransaction.cost
                          .cpuInsns
                      }{" "}
                      CPU
                    </div>
                    <div className="TransactionDetails__row__right__item">
                      {
                        transactionSimulation.simulationTransaction.cost
                          .memBytes
                      }{" "}
                      Bytes
                    </div>
                  </div>
                </div>
                <div className="TransactionDetails__row">
                  <div>{t("Minimum resource fee")} </div>
                  <div className="TransactionDetails__row__right">
                    {transactionSimulation.simulationTransaction.minResourceFee}{" "}
                    XLM
                  </div>
                </div>
              </>
            )}
            {isSwap && (
              <div className="TransactionDetails__row">
                <div>{t("Minimum Received")} </div>
                <div
                  className="TransactionDetails__row__right"
                  data-testid="TransactionDetailsMinimumReceived"
                >
                  {computeDestMinWithSlippage(
                    allowedSlippage,
                    destinationAmount,
                  ).toFixed()}{" "}
                  {destAsset.code}
                </div>
              </div>
            )}
            {submissionStatus !== RequestState.SUCCESS ? (
              <div className="TransactionDetails__row">
                <div>{t("XDR")} </div>
                <div
                  className="TransactionDetails__row__right--hasOverflow"
                  data-testid="TransactionDetailsXDR"
                >
                  <CopyText textToCopy={txDetailsData.data!.transactionXdr}>
                    <>
                      <div className="TransactionDetails__row__copy">
                        <Icon.Copy01 />
                      </div>
                      {`${txDetailsData.data!.transactionXdr.slice(0, 10)}…`}
                    </>
                  </CopyText>
                </div>
              </div>
            ) : null}

            <div className="TransactionDetails__warnings">
              {txDetailsData.data!.scanResult && (
                <BlockaidTxScanLabel
                  scanResult={txDetailsData.data!.scanResult}
                />
              )}
              {submissionStatus === RequestState.IDLE && (
                <FlaggedWarningMessage
                  isMemoRequired={isMemoRequired}
                  blockaidData={getBlockaidData(
                    txDetailsData.data,
                    sourceAsset,
                    destAsset,
                  )}
                  isSuspicious={
                    txDetailsData.data!.isSourceAssetSuspicious ||
                    txDetailsData.data!.isDestAssetSuspicious
                  }
                />
              )}
            </div>
          </View.Content>
          <div className="TransactionDetails__bottom-wrapper__copy">
            {(isPathPayment || isSwap) &&
              submissionStatus !== RequestState.SUCCESS &&
              t("The final amount is approximate and may change")}
          </div>
          <View.Footer isInline>
            {submissionStatus === RequestState.SUCCESS ? (
              <StellarExpertButton />
            ) : (
              <>
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => {
                    dispatch(resetSimulation());
                    navigateTo(ROUTES.account, navigate);
                  }}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  size="md"
                  variant={
                    txDetailsData.data!.isSourceAssetSuspicious ||
                    txDetailsData.data!.isDestAssetSuspicious ||
                    (txDetailsData.data!.scanResult &&
                      isTxSuspicious(txDetailsData.data!.scanResult))
                      ? "error"
                      : "primary"
                  }
                  disabled={isSubmitDisabled}
                  onClick={handleSend}
                  isLoading={hwStatus === ShowOverlayStatus.IN_PROGRESS}
                  data-testid="transaction-details-btn-send"
                >
                  {isSwap ? t("Swap") : t("Send")}
                </Button>
              </>
            )}
          </View.Footer>
        </React.Fragment>
      )}
    </>
  );
};
