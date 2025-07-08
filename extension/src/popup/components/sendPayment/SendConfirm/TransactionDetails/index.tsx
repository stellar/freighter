import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import BigNumber from "bignumber.js";
import { Networks } from "stellar-sdk";
import {
  Card,
  Loader,
  Icon,
  Button,
  CopyText,
  Notification,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import {
  getAssetFromCanonical,
  isMainnet,
  isMuxedAccount,
  getConversionRate,
  truncatedFedAddress,
  truncatedPublicKey,
} from "helpers/stellar";
import { getStellarExpertUrl } from "popup/helpers/account";
import { AssetIcons, ActionStatus } from "@shared/api/types";
import {
  defaultBlockaidScanAssetResult,
  isCustomNetwork,
} from "@shared/helpers/stellar";
import { isTxSuspicious } from "popup/helpers/blockaid";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import {
  getMemoRequiredAccounts,
  signFreighterTransaction,
  signFreighterSorobanTransaction,
  submitFreighterTransaction,
  submitFreighterSorobanTransaction,
  transactionSubmissionSelector,
  addRecentAddress,
  isPathPaymentSelector,
  ShowOverlayStatus,
  startHwSign,
  resetSubmission,
} from "popup/ducks/transactionSubmission";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
  addTokenId,
} from "popup/ducks/accountServices";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
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

import { resetSimulation } from "popup/ducks/token-payment";
import { RequestState } from "popup/views/Account/hooks/useGetAccountData";
import {
  computeDestMinWithSlippage,
  TxDetailsData,
  useGetTxDetailsData,
} from "./hooks/useGetTxDetailsData";
import { VerifyAccountDrawer } from "popup/components/VerifyAccountDrawer";

import "./styles.scss";
import { useSubmitTxData } from "./hooks/useSubmitTxData";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";

const TwoAssetCard = ({
  sourceAssetIcons,
  sourceCanon,
  sourceAmount,
  destAssetIcons,
  destCanon,
  destAmount,
  isSourceAssetSuspicious,
  isDestAssetSuspicious,
}: {
  sourceAssetIcons: AssetIcons;
  sourceCanon: string;
  sourceAmount: string;
  destAssetIcons: AssetIcons;
  destCanon: string;
  destAmount: string;
  isSourceAssetSuspicious: boolean;
  isDestAssetSuspicious: boolean;
}) => {
  const sourceAsset = getAssetFromCanonical(sourceCanon);
  const destAsset = getAssetFromCanonical(destCanon);

  return (
    <div className="TwoAssetCard">
      <div className="TwoAssetCard__row">
        <div className="TwoAssetCard__row__left">
          <AssetIcon
            assetIcons={sourceAssetIcons}
            code={sourceAsset.code}
            issuerKey={sourceAsset.issuer}
            isSuspicious={isSourceAssetSuspicious}
          />
          {sourceAsset.code}
        </div>
        <div
          className="TwoAssetCard__row__right"
          data-testid="TransactionDetailsAssetSource"
        >
          {formatAmount(sourceAmount)} {sourceAsset.code}
        </div>
      </div>
      <div className="TwoAssetCard__arrow-icon">
        <Icon.ArrowDown />
      </div>
      <div className="TwoAssetCard__row">
        <div className="TwoAssetCard__row__left">
          <AssetIcon
            assetIcons={destAssetIcons}
            code={destAsset.code}
            issuerKey={destAsset.issuer}
            isSuspicious={isDestAssetSuspicious}
          />
          {destAsset.code}
        </div>
        <div
          className="TwoAssetCard__row__right"
          data-testid="TransactionDetailsAssetDestination"
        >
          {formatAmount(new BigNumber(destAmount).toFixed())} {destAsset.code}
        </div>
      </div>
    </div>
  );
};

export const TransactionDetails = ({
  goBack,
  shouldScanTx,
}: {
  goBack: () => void;
  shouldScanTx: boolean;
}) => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const [isVerifyAccountModalOpen, setIsVerifyAccountModalOpen] =
    useState(false);
  const submission = useSelector(transactionSubmissionSelector);
  const {
    transactionData: {
      destination,
      federationAddress,
      amount,
      asset,
      memo,
      transactionFee,
      transactionTimeout,
      allowedSlippage,
      destinationAsset,
      destinationAmount,
      path,
      isToken,
      isSoroswap,
    },
    hardwareWalletData: { status: hwStatus },
    memoRequiredAccounts,
    transactionSimulation,
  } = submission;

  const transactionHash = submission.response?.hash;
  const isPathPayment = useSelector(isPathPaymentSelector);
  const { isMemoValidationEnabled } = useSelector(settingsSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const isSwap = useIsSwap();
  const sourceAsset = getAssetFromCanonical(asset);
  const scanParams =
    isToken || isSoroswap || isContractId(destination)
      ? {
          type: "soroban" as const,
          xdr: transactionSimulation.preparedTransaction!,
        }
      : {
          type: "classic" as const,
          sourceAsset,
          destAsset: getAssetFromCanonical(destinationAsset || "native"),
          amount,
          destinationAmount,
          allowedSlippage,
          path,
          isPathPayment,
          isSwap,
          memo,
          transactionFee,
          transactionTimeout,
        };
  // TODO: use this error state
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

  const matchingBlockedTags = memoRequiredAccounts
    .filter(({ address }) => address === destination)
    .flatMap(({ tags }) => tags);
  const isMemoRequired =
    isValidatingMemo &&
    matchingBlockedTags.some(
      (tag) => tag === TRANSACTION_WARNING.memoRequired && !memo,
    );

  const isSubmitDisabled = isMemoRequired;

  // TODO: figure out which view actually needs this
  useEffect(() => {
    dispatch(getMemoRequiredAccounts());
  }, [dispatch]);

  const handleSorobanTransaction = async () => {
    try {
      const res = await dispatch(
        signFreighterSorobanTransaction({
          transactionXDR: transactionSimulation.preparedTransaction!,
          network: networkDetails.networkPassphrase,
        }),
      );

      if (
        signFreighterSorobanTransaction.fulfilled.match(res) &&
        res.payload.signedTransaction
      ) {
        const submitResp = await dispatch(
          submitFreighterSorobanTransaction({
            publicKey,
            signedXDR: res.payload.signedTransaction,
            networkDetails,
          }),
        );

        if (submitFreighterSorobanTransaction.fulfilled.match(submitResp)) {
          addRecentAddress({ address: destination }),
            emitMetric(METRIC_NAMES.sendPaymentSuccess, {
              sourceAsset: sourceAsset.code,
            });

          if (isSoroswap && destAsset.issuer) {
            await dispatch(
              addTokenId({
                publicKey,
                tokenId: destAsset.issuer,
                network: networkDetails.network as Networks,
              }),
            );
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePaymentTransaction = async () => {
    try {
      if (isHardwareWallet) {
        dispatch(
          startHwSign({
            transactionXDR: txDetailsData.data?.transactionXdr,
            shouldSubmit: true,
          }),
        );
        return;
      }
      const res = await dispatch(
        signFreighterTransaction({
          transactionXDR: txDetailsData.data!.transactionXdr,
          network: networkDetails.networkPassphrase,
        }),
      );

      if (
        signFreighterTransaction.fulfilled.match(res) &&
        res.payload.signedTransaction
      ) {
        const submitResp = await dispatch(
          submitFreighterTransaction({
            publicKey,
            signedXDR: res.payload.signedTransaction,
            networkDetails,
          }),
        );

        if (submitFreighterTransaction.fulfilled.match(submitResp)) {
          if (!isSwap) {
            await dispatch(
              addRecentAddress({ address: federationAddress || destination }),
            );
          }
          if (isPathPayment) {
            emitMetric(METRIC_NAMES.sendPaymentPathPaymentSuccess, {
              sourceAsset,
              destAsset,
              allowedSlippage,
            });
          } else {
            emitMetric(METRIC_NAMES.sendPaymentSuccess, { sourceAsset });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // handles signing and submitting
  const handleSend = async () => {
    if (isToken || isSoroswap) {
      await handleSorobanTransaction();
    } else {
      await handlePaymentTransaction();
    }
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
    const destBalances = details!.destinationBalances.balances || [];
    const sourceBalance = findAssetBalance(details!.balances.balances, source);
    const destBalance = findAssetBalance(destBalances, dest);
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

  useEffect(() => {
    if (
      txDetailsData.state === RequestState.SUCCESS &&
      !txDetailsData.data.hasPrivateKey
    ) {
      setIsVerifyAccountModalOpen(true);
    }
  }, [txDetailsData]);

  if (txDetailsData.state === RequestState.ERROR) {
    return (
      <div className="TransactionDetails__error">
        <Notification
          variant="error"
          title={t("Failed to fetch your transaction details")}
        >
          {t(
            "We had an issue retrieving your transaction details. Please try again.",
          )}
        </Notification>
        <Button size="md" variant="secondary" onClick={goBack}>
          {t("Back")}
        </Button>
      </div>
    );
  }

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
          {submission.submitStatus === ActionStatus.PENDING && (
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
            title={renderPageTitle(
              submission.submitStatus === ActionStatus.SUCCESS,
            )}
            customBackAction={goBack}
            customBackIcon={
              submission.submitStatus === ActionStatus.SUCCESS ? (
                <Icon.XClose />
              ) : null
            }
          />
          <View.Content hasNoTopPadding>
            {!(isPathPayment || isSwap) && (
              <div className="TransactionDetails__cards">
                <Card>
                  <div className="TransactionDetails__send-asset">
                    <div className="TransactionDetails__copy-left">
                      <AssetIcon
                        assetIcons={txDetailsData.data.balances.icons || {}}
                        code={sourceAsset.code}
                        issuerKey={sourceAsset.issuer}
                        isLPShare={false}
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
                sourceAssetIcons={txDetailsData.data.balances.icons || {}}
                sourceCanon={asset}
                sourceAmount={amount}
                destAssetIcons={
                  txDetailsData.data.destinationBalances.icons || {}
                }
                destCanon={destinationAsset || "native"}
                destAmount={destinationAmount}
                isSourceAssetSuspicious={
                  txDetailsData.data.isSourceAssetSuspicious
                }
                isDestAssetSuspicious={txDetailsData.data.isDestAssetSuspicious}
              />
            )}

            {!isSwap && (
              <div className="TransactionDetails__row">
                <div>{t("Sending to")} </div>
                <div className="TransactionDetails__row__right">
                  <div
                    className="TransactionDetails__identicon"
                    data-testid="to-field"
                  >
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
                <div
                  className="TransactionDetails__row__right"
                  data-testid="memo"
                >
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
            {transactionSimulation.response && (
              <>
                <div className="TransactionDetails__row">
                  <div>{t("Resource cost")} </div>
                  <div className="TransactionDetails__row__right">
                    <div className="TransactionDetails__row__right__item">
                      {transactionSimulation.response.cost.cpuInsns} CPU
                    </div>
                    <div className="TransactionDetails__row__right__item">
                      {transactionSimulation.response.cost.memBytes} Bytes
                    </div>
                  </div>
                </div>
                <div className="TransactionDetails__row">
                  <div>{t("Minimum resource fee")} </div>
                  <div className="TransactionDetails__row__right">
                    {transactionSimulation.response.minResourceFee} XLM
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
            {submission.submitStatus !== ActionStatus.SUCCESS ? (
              <div className="TransactionDetails__row">
                <div>{t("XDR")} </div>
                <div
                  className="TransactionDetails__row__right--hasOverflow"
                  data-testid="TransactionDetailsXDR"
                >
                  <CopyText textToCopy={txDetailsData.data.transactionXdr}>
                    <>
                      <div className="TransactionDetails__row__copy">
                        <Icon.Copy01 />
                      </div>
                      {`${txDetailsData.data.transactionXdr.slice(0, 10)}…`}
                    </>
                  </CopyText>
                </div>
              </div>
            ) : null}

            <div className="TransactionDetails__warnings">
              {txDetailsData.data.scanResult && (
                <BlockaidTxScanLabel
                  scanResult={txDetailsData.data.scanResult}
                />
              )}
              {submission.submitStatus === ActionStatus.IDLE && (
                <FlaggedWarningMessage
                  isMemoRequired={isMemoRequired}
                  blockaidData={getBlockaidData(
                    txDetailsData.data,
                    sourceAsset,
                    destAsset,
                  )}
                  isSuspicious={
                    txDetailsData.data.isSourceAssetSuspicious ||
                    txDetailsData.data.isDestAssetSuspicious
                  }
                />
              )}
            </div>
            <div className="TransactionDetails__bottom-wrapper__copy">
              {(isPathPayment || isSwap) &&
                submission.submitStatus !== ActionStatus.SUCCESS &&
                t("The final amount is approximate and may change")}
            </div>
          </View.Content>
          <View.Footer isInline>
            {submission.submitStatus === ActionStatus.SUCCESS ? (
              <StellarExpertButton />
            ) : (
              <>
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => {
                    dispatch(resetSimulation());
                    dispatch(resetSubmission());
                    navigateTo(ROUTES.account, navigate);
                  }}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  size="md"
                  variant={
                    txDetailsData.data.isSourceAssetSuspicious ||
                    txDetailsData.data.isDestAssetSuspicious ||
                    (txDetailsData.data.scanResult &&
                      isTxSuspicious(txDetailsData.data.scanResult))
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
          <div className="TransactionDetails__modal-wrapper">
            <VerifyAccountDrawer
              publicKey={publicKey}
              isModalOpen={isVerifyAccountModalOpen}
              setIsModalOpen={setIsVerifyAccountModalOpen}
            />
          </div>
        </React.Fragment>
      )}
    </>
  );
};

interface SendingTransactionProps {
  xdr: string;
}

export const SendingTransaction = ({ xdr }: SendingTransactionProps) => {
  const submission = useSelector(transactionSubmissionSelector);
  const {
    transactionData: { amount, asset, destination, isToken },
  } = submission;
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!hardwareWalletType;
  const srcAsset = getAssetFromCanonical(asset);

  const { state: submissionState, fetchData } = useSubmitTxData({
    publicKey,
    networkDetails,
    xdr,
  });

  useEffect(() => {
    const getData = async () => {
      await fetchData({
        isToken,
        isHardwareWallet,
      });
    };
    // TODO
    console.log(getData);
    // getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading =
    submissionState.state === RequestState.IDLE ||
    submissionState.state === RequestState.LOADING;
  const isSuccess = submissionState.state === RequestState.SUCCESS;
  const assetIcon = submissionState.data?.icons[asset]!;
  const assetIcons = asset !== "native" ? { [asset]: assetIcon } : {};

  return (
    <View.Content
      contentFooter={
        <div className="SendingTransaction__footer">
          <div className="SendingTransaction__footer__subtext">
            You can close this screen, your transaction should be complete in
            less than a minute.
          </div>
          <Button
            size="md"
            isFullWidth
            isRounded
            variant="tertiary"
            onClick={(e) => {
              e.preventDefault();
              window.close();
            }}
          >
            Close
          </Button>
        </div>
      }
    >
      <div className="SendingTransaction">
        <div className="SendingTransaction__Title">
          {isLoading ? (
            <>
              <Loader size="2rem" />
              <span>Sending</span>
            </>
          ) : (
            <>
              <Icon.CheckCircle />
              <span>Sent!</span>
            </>
          )}
        </div>
        <div className="SendingTransaction__Summary">
          <div className="SendingTransaction__Summary__Assets">
            <AssetIcon
              assetIcons={assetIcons}
              code={srcAsset.code}
              issuerKey={srcAsset.issuer}
              icon={assetIcon}
              isSuspicious={false}
            />
            <div className="SendingTransaction__Summary__Assets__Divider">
              <Icon.ChevronRightDouble />
            </div>
            <IdenticonImg publicKey={destination} />
          </div>
          <div className="SendingTransaction__Summary__Description">
            {isLoading &&
              `${amount} ${srcAsset.code} to ${truncatedPublicKey(destination)}`}
            {isSuccess &&
              `${amount} ${srcAsset.code} was sent to ${truncatedPublicKey(destination)}`}
          </div>
        </div>
      </div>
    </View.Content>
  );
};
