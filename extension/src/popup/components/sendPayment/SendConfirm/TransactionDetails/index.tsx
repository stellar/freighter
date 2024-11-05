import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import BigNumber from "bignumber.js";
import {
  Account,
  Asset,
  Memo,
  Operation,
  TransactionBuilder,
  Networks,
} from "stellar-sdk";
import { Card, Loader, Icon, Button } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  isMainnet,
  isMuxedAccount,
  xlmToStroop,
  getConversionRate,
  truncatedFedAddress,
} from "helpers/stellar";
import { getStellarExpertUrl } from "popup/helpers/account";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { AssetBalance, AssetIcons, ActionStatus } from "@shared/api/types";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";
import {
  defaultBlockaidScanAssetResult,
  isCustomNetwork,
} from "@shared/helpers/stellar";
import {
  isAssetSuspicious,
  isTxSuspicious,
  useScanAsset,
  useScanTx,
} from "popup/helpers/blockaid";

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
import {
  AccountAssets,
  AssetIcon,
} from "popup/components/account/AccountAssets";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import {
  BlockaidTxScanLabel,
  FlaggedWarningMessage,
} from "popup/components/WarningMessages";
import { View } from "popup/basics/layout/View";

import { TRANSACTION_WARNING } from "constants/transaction";
import { formatAmount } from "popup/helpers/formatters";

import { resetSimulation } from "popup/ducks/token-payment";
import { NetworkDetails } from "@shared/constants/stellar";

import "./styles.scss";

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

const computeDestMinWithSlippage = (
  slippage: string,
  destMin: string,
): BigNumber => {
  const mult = 1 - parseFloat(slippage) / 100;
  return new BigNumber(destMin).times(new BigNumber(mult));
};

const getOperation = (
  sourceAsset: Asset | { code: string; issuer: string },
  destAsset: Asset | { code: string; issuer: string },
  amount: string,
  destinationAmount: string,
  destination: string,
  allowedSlippage: string,
  path: string[],
  isPathPayment: boolean,
  isSwap: boolean,
  isFunded: boolean,
  publicKey: string,
) => {
  // path payment or swap
  if (isPathPayment || isSwap) {
    const destMin = computeDestMinWithSlippage(
      allowedSlippage,
      destinationAmount,
    );
    return Operation.pathPaymentStrictSend({
      sendAsset: sourceAsset as Asset,
      sendAmount: amount,
      destination: isSwap ? publicKey : destination,
      destAsset: destAsset as Asset,
      destMin: destMin.toFixed(7),
      path: path.map((p) => getAssetFromCanonical(p)) as Asset[],
    });
  }

  // create account if unfunded and sending xlm
  if (!isFunded && sourceAsset.code === Asset.native().code) {
    return Operation.createAccount({
      destination,
      startingBalance: amount,
    });
  }
  // regular payment
  return Operation.payment({
    destination,
    asset: sourceAsset as Asset,
    amount,
  });
};

const getBuiltTx = async (
  publicKey: string,
  opData: {
    sourceAsset: Asset | { code: string; issuer: string };
    destAsset: Asset | { code: string; issuer: string };
    amount: string;
    destinationAmount: string;
    destination: string;
    allowedSlippage: string;
    path: string[];
    isPathPayment: boolean;
    isSwap: boolean;
    isFunded: boolean;
  },
  fee: string,
  transactionTimeout: number,
  networkDetails: NetworkDetails,
) => {
  const {
    sourceAsset,
    destAsset,
    amount,
    destinationAmount,
    destination,
    allowedSlippage,
    path,
    isPathPayment,
    isSwap,
    isFunded,
  } = opData;
  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );
  const sourceAccount: Account = await server.loadAccount(publicKey);
  const operation = getOperation(
    sourceAsset,
    destAsset,
    amount,
    destinationAmount,
    destination,
    allowedSlippage,
    path,
    isPathPayment,
    isSwap,
    isFunded,
    publicKey,
  );
  return new TransactionBuilder(sourceAccount, {
    fee: xlmToStroop(fee).toFixed(),
    networkPassphrase: networkDetails.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(transactionTimeout);
};

export const TransactionDetails = ({
  goBack,
  shouldScanTx,
}: {
  goBack: () => void;
  shouldScanTx: boolean;
}) => {
  const dispatch: AppDispatch = useDispatch();
  const submission = useSelector(transactionSubmissionSelector);
  const {
    accountBalances,
    destinationBalances,
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
    assetIcons,
    hardwareWalletData: { status: hwStatus },
    memoRequiredAccounts,
    transactionSimulation,
  } = submission;

  const transactionHash = submission.response?.hash;
  const isPathPayment = useSelector(isPathPaymentSelector);
  const { isMemoValidationEnabled } = useSelector(settingsSelector);
  const isSwap = useIsSwap();
  const { scanTx, data: scanResult, isLoading, setLoading } = useScanTx();

  const { t } = useTranslation();

  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!hardwareWalletType;
  const [destAssetIcons, setDestAssetIcons] = useState({} as AssetIcons);

  const sourceAsset = getAssetFromCanonical(asset);
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

  const isSourceAssetSuspicious = isAssetSuspicious(
    accountBalances.balances?.[asset]?.blockaidData,
  );

  const isSubmitDisabled = isMemoRequired;

  const destAssetToScan = destinationAsset
    ? `${destAsset.code}-${destAsset.issuer}`
    : "";

  const { scannedAsset: scannedDestAsset } = useScanAsset(destAssetToScan);
  const isDestAssetSuspicious = isAssetSuspicious(scannedDestAsset);

  // load destination asset icons
  useEffect(() => {
    (async () => {
      const iconURL = await getIconUrlFromIssuer({
        key: destAsset.issuer,
        code: destAsset.code,
        networkDetails,
      });
      setDestAssetIcons({
        [getCanonicalFromAsset(destAsset.code, destAsset.issuer)]: iconURL,
      });
    })();
  }, [destAsset.code, destAsset.issuer, networkDetails]);

  useEffect(() => {
    dispatch(getMemoRequiredAccounts());
  }, [dispatch]);

  useEffect(() => {
    const url = "internal"; // blockaid prefers a URL for this endpoint, but this does not originate from a URL
    const scanSorobanTx = async () => {
      if (
        shouldScanTx &&
        submission.submitStatus === ActionStatus.IDLE &&
        transactionSimulation.preparedTransaction
      ) {
        await scanTx(
          transactionSimulation.preparedTransaction,
          url,
          networkDetails,
        );
      }
      setLoading(false);
    };
    const scanClassicTx = async () => {
      if (shouldScanTx) {
        const transaction = await getBuiltTx(
          publicKey,
          {
            sourceAsset,
            destAsset,
            amount,
            destinationAmount,
            destination,
            allowedSlippage,
            path,
            isPathPayment,
            isSwap,
            isFunded: destinationBalances.isFunded!,
          },
          transactionFee,
          transactionTimeout,
          networkDetails,
        );

        await scanTx(transaction.build().toXDR(), url, networkDetails);
      }
      setLoading(false);
    };
    if (isToken || isSoroswap) {
      scanSorobanTx();
      return;
    }
    scanClassicTx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const transaction = await getBuiltTx(
        publicKey,
        {
          sourceAsset,
          destAsset,
          amount,
          destinationAmount,
          destination,
          allowedSlippage,
          path,
          isPathPayment,
          isSwap,
          isFunded: destinationBalances.isFunded!,
        },
        transactionFee,
        transactionTimeout,
        networkDetails,
      );

      if (memo) {
        transaction.addMemo(Memo.text(memo));
      }

      if (isHardwareWallet) {
        dispatch(
          startHwSign({
            transactionXDR: transaction.build().toXDR(),
            shouldSubmit: true,
          }),
        );
        return;
      }
      const res = await dispatch(
        signFreighterTransaction({
          transactionXDR: transaction.build().toXDR(),
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
              addRecentAddress({ publicKey: federationAddress || destination }),
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

  return (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && hardwareWalletType && (
        <HardwareSign walletType={hardwareWalletType} />
      )}
      {isLoading ? (
        <div className="TransactionDetails__loader">
          <Loader size="2rem" />
        </div>
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
          <View.Content>
            {!(isPathPayment || isSwap) && (
              <div className="TransactionDetails__cards">
                <Card>
                  <AccountAssets
                    assetIcons={assetIcons}
                    sortedBalances={[
                      {
                        token: {
                          issuer: { key: sourceAsset.issuer },
                          code: sourceAsset.code,
                          type: "credit_alphanum4",
                        },
                        total: new BigNumber(amount),
                      } as AssetBalance,
                    ]}
                  />
                </Card>
              </div>
            )}

            {(isPathPayment || isSwap) && (
              <TwoAssetCard
                sourceAssetIcons={assetIcons}
                sourceCanon={asset}
                sourceAmount={amount}
                destAssetIcons={destAssetIcons}
                destCanon={destinationAsset || "native"}
                destAmount={destinationAmount}
                isSourceAssetSuspicious={isSourceAssetSuspicious}
                isDestAssetSuspicious={isDestAssetSuspicious}
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
            <div className="TransactionDetails__warnings">
              {scanResult && (
                <BlockaidTxScanLabel scanResult={scanResult} isPopup />
              )}
              {submission.submitStatus === ActionStatus.IDLE && (
                <FlaggedWarningMessage
                  isMemoRequired={isMemoRequired}
                  blockaidData={
                    (isSourceAssetSuspicious
                      ? accountBalances.balances?.[asset]?.blockaidData
                      : accountBalances.balances?.[destinationAsset]
                          ?.blockaidData) || defaultBlockaidScanAssetResult
                  }
                  isSuspicious={
                    isSourceAssetSuspicious || isDestAssetSuspicious
                  }
                />
              )}
            </div>
          </View.Content>
          <div className="TransactionDetails__bottom-wrapper__copy">
            {(isPathPayment || isSwap) &&
              submission.submitStatus !== ActionStatus.SUCCESS &&
              t("The final amount is approximate and may change")}
          </div>
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
                    navigateTo(ROUTES.account);
                  }}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  size="md"
                  variant={
                    isSourceAssetSuspicious ||
                    isDestAssetSuspicious ||
                    (scanResult && isTxSuspicious(scanResult))
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
