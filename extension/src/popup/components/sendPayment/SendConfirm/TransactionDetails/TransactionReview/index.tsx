import React, { useEffect } from "react";
import { SorobanRpc } from "stellar-sdk";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Button, Card, CopyText, Icon } from "@stellar/design-system";

import { TRANSACTION_WARNING } from "constants/transaction";
import { ROUTES } from "popup/constants/routes";
import { MemoRequiredAccount } from "@shared/api/types";
import { TransactionData } from "types/transactions";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { TwoAssetCard } from "popup/components/TwoAssetCard";
import {
  BlockaidTxScanLabel,
  FlaggedWarningMessage,
} from "popup/components/WarningMessages";
import { FedOrGAddress } from "popup/basics/sendPayment/FedOrGAddress";
import { View } from "popup/basics/layout/View";
import { formatAmount } from "popup/helpers/formatters";
import { findAssetBalance } from "popup/helpers/balance";
import { navigateTo } from "popup/helpers/navigate";
import { isTxSuspicious } from "popup/helpers/blockaid";
import {
  getAssetFromCanonical,
  getConversionRate,
  isMainnet,
  isMuxedAccount,
  truncatedFedAddress,
} from "helpers/stellar";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { isContractId } from "popup/helpers/soroban";
import { useSignTx } from "helpers/hooks/useSignTx";
import {
  computeDestMinWithSlippage,
  TxDetailsData,
} from "../hooks/useGetTxDetailsData";
import { useGetTxDetailsData } from "./hooks/useGetTxDetails";

import "./styles.scss";
import { useSubmitTx } from "helpers/hooks/useSubmitTx";

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

interface TransactionReview {
  transactionData: TransactionData;
  isSwap: boolean;
  goBack: () => void;
  transactionSimulation: SorobanRpc.Api.SimulateTransactionSuccessResponse;
  preparedTransaction: string;
}

export const TransactionReview = ({
  transactionData,
  isSwap,
  goBack,
  transactionSimulation,
  preparedTransaction,
}: TransactionReview) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const { isMemoValidationEnabled } = useSelector(settingsSelector);
  const _isMainnet = isMainnet(networkDetails);
  const isValidatingMemo = isMemoValidationEnabled && _isMainnet;
  const memoRequiredAccounts = [] as MemoRequiredAccount[]; // TODO: add to this hook
  const matchingBlockedTags = memoRequiredAccounts
    .filter(({ address }) => address === destination)
    .flatMap(({ tags }) => tags);

  const {
    allowedSlippage,
    amount,
    asset,
    destination,
    destinationAsset,
    destinationAmount,
    federationAddress,
    memo,
    transactionFee,
    path,
    transactionTimeout,
  } = transactionData;

  const isPathPayment = transactionData.destinationAsset !== "";
  const sourceAsset = getAssetFromCanonical(transactionData.asset);
  const destAsset = getAssetFromCanonical(destinationAsset || "native");
  const showMemo = !isSwap && !isMuxedAccount(destination);

  // TODO: set these up
  const isToken = false;
  const isSoroswap = false;
  const hwStatus = false;

  const scanParams =
    isToken || isSoroswap || isContractId(destination)
      ? {
          type: "soroban" as const,
          xdr: preparedTransaction,
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

  // TODO: use this error state
  const { state: txDetailsData, fetchData } = useGetTxDetailsData(
    publicKey,
    destination,
    networkDetails,
    getAssetFromCanonical(destinationAsset || "native"),
    sourceAsset,
    {
      shouldScan: true,
      url: "internal",
      params: scanParams,
    },
    {
      isMainnet: isMainnet(networkDetails),
      showHidden: false,
      includeIcons: true,
    },
  );

  const { state: signedTransaction, signTx } = useSignTx(
    publicKey,
    networkDetails,
  );
  const { state: txResponse, submitTx } = useSubmitTx(networkDetails);

  const isMemoRequired =
    isValidatingMemo &&
    matchingBlockedTags.some(
      (tag) => tag === TRANSACTION_WARNING.memoRequired && !memo,
    );
  const renderPageTitle = (isSwap: boolean) => {
    return isSwap ? t("Confirm Swap") : `${t("Confirm Send")}`;
  };

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    await signTx(txDetailsData.data?.transactionXdr!);
    await submitTx(signedTransaction.data?.signedTransaction!);
    console.log(txResponse);
    // go to recieipt
  };

  return (
    <>
      <SubviewHeader
        title={renderPageTitle(isSwap)}
        customBackAction={goBack}
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
            isDestAssetSuspicious={txDetailsData.data!.isDestAssetSuspicious}
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
        <div className="TransactionDetails__row">
          <div>{t("Resource cost")} </div>
          <div className="TransactionDetails__row__right">
            <div className="TransactionDetails__row__right__item">
              {transactionSimulation.cost.cpuInsns} CPU
            </div>
            <div className="TransactionDetails__row__right__item">
              {transactionSimulation.cost.memBytes} Bytes
            </div>
          </div>
        </div>
        <div className="TransactionDetails__row">
          <div>{t("Minimum resource fee")} </div>
          <div className="TransactionDetails__row__right">
            {transactionSimulation.minResourceFee} XLM
          </div>
        </div>
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
        <div className="TransactionDetails__warnings">
          {txDetailsData.data!.scanResult && (
            <BlockaidTxScanLabel scanResult={txDetailsData.data!.scanResult} />
          )}
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
        </div>
      </View.Content>
      <div className="TransactionDetails__bottom-wrapper__copy">
        {(isPathPayment || isSwap) &&
          t("The final amount is approximate and may change")}
      </div>
      <View.Footer isInline>
        <Button
          size="md"
          variant="secondary"
          onClick={() => {
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
          disabled={isMemoRequired}
          onClick={handleSend}
          isLoading={hwStatus}
          data-testid="transaction-details-btn-send"
        >
          {isSwap ? t("Swap") : t("Send")}
        </Button>
      </View.Footer>
    </>
  );
};
