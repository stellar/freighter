import React, { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Text } from "@stellar/design-system";
import { Horizon } from "stellar-sdk";

import StellarLogo from "popup/assets/stellar-logo.png";

import { emitMetric } from "helpers/metrics";
import { openTab } from "popup/helpers/navigate";
import { stroopToXlm } from "helpers/stellar";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { isCustomNetwork } from "@shared/helpers/stellar";
import {
  AssetDiffSummary,
  getActionIconByType,
  OperationDataRow,
} from "popup/views/AccountHistory/hooks/useGetHistoryData";
import { NetworkDetails } from "@shared/constants/stellar";
import { getStellarExpertUrl } from "popup/helpers/account";
import { getMemoDisabledState } from "helpers/muxedAddress";

import "./styles.scss";
import { CLASSIC_ASSET_DECIMALS } from "popup/helpers/soroban";

export const TransactionDetail = ({
  activeOperation,
  networkDetails,
}: {
  activeOperation: OperationDataRow | null;
  networkDetails: NetworkDetails;
}) => {
  const { t } = useTranslation();
  // Get memo disabled state using the helper
  // For history, we don't have contractId, so we pass undefined
  // The helper will still correctly disable memo for M addresses
  // Must be called before early return to satisfy React hooks rules
  const memoDisabledState = React.useMemo(() => {
    if (!activeOperation?.metadata?.to) {
      return { isMemoDisabled: false, memoDisabledMessage: undefined };
    }
    return getMemoDisabledState({
      targetAddress: activeOperation.metadata.to,
      contractId: undefined, // Not available in history context
      contractSupportsMuxed: undefined,
      networkDetails,
      t,
    });
  }, [activeOperation?.metadata?.to, networkDetails, t]);

  const { isMemoDisabled } = memoDisabledState;

  if (!activeOperation) {
    return <></>;
  }

  const createdAtDateInstance = new Date(
    Date.parse(activeOperation.metadata.createdAt),
  );
  const createdAtLocalStrArr = createdAtDateInstance
    .toLocaleString()
    .split(" ");
  const createdAtTime = `${createdAtLocalStrArr[1]
    .split(":")
    .slice(0, 2)
    .join(":")} ${createdAtLocalStrArr[2]}`;
  const createdAtDateStr = createdAtDateInstance
    .toDateString()
    .split(" ")
    .slice(1)
    .join(" ");

  const stellarExpertUrl = getStellarExpertUrl(networkDetails);
  const { feeCharged, memo } = activeOperation.metadata;

  // Type interfaces for metadata parameters
  interface PaymentMetadata {
    to?: string;
    from?: string;
    nonLabelAmount: string;
    destIcon?: string;
    destAssetCode: string;
    isReceiving: boolean;
  }

  interface CollectibleTransferMetadata {
    to?: string;
    from?: string;
    amount: string;
    destIcon?: string;
    destAssetCode: string;
    isReceiving: boolean;
  }

  interface SwapMetadata {
    formattedSrcAmount: string;
    srcAssetCode: string;
    nonLabelAmount: string;
    destAssetCode: string;
  }

  interface CreateAccountMetadata {
    to?: string;
    from?: string;
    nonLabelAmount: string;
    isReceiving: boolean;
  }

  // Normalization helper functions
  const normalizePaymentToAssetDiffs = (
    metadata: PaymentMetadata,
  ): AssetDiffSummary[] => {
    const { to, from, nonLabelAmount, destIcon, destAssetCode, isReceiving } =
      metadata;

    return [
      {
        assetCode: destAssetCode,
        assetIssuer: null,
        decimals: CLASSIC_ASSET_DECIMALS,
        amount: nonLabelAmount,
        isCredit: isReceiving,
        destination: isReceiving ? from : to,
        icon: destIcon,
      },
    ];
  };

  const normalizeCollectibleTransferToAssetDiffs = (
    metadata: CollectibleTransferMetadata,
  ): AssetDiffSummary[] => {
    const { to, from, amount, destIcon, destAssetCode, isReceiving } = metadata;

    return [
      {
        assetCode: destAssetCode,
        assetIssuer: null,
        decimals: CLASSIC_ASSET_DECIMALS,
        amount,
        isCredit: isReceiving,
        destination: isReceiving ? from : to,
        icon: destIcon,
      },
    ];
  };

  const normalizeSwapToAssetDiffs = (
    metadata: SwapMetadata,
  ): AssetDiffSummary[] => {
    const { formattedSrcAmount, srcAssetCode, nonLabelAmount, destAssetCode } =
      metadata;

    return [
      // Debit: What was sent
      {
        assetCode: srcAssetCode,
        assetIssuer: null,
        decimals: 7,
        amount: formattedSrcAmount,
        isCredit: false,
      },
      // Credit: What was received
      {
        assetCode: destAssetCode,
        assetIssuer: null,
        decimals: 7,
        amount: nonLabelAmount,
        isCredit: true,
      },
    ];
  };

  const normalizeCreateAccountToAssetDiffs = (
    metadata: CreateAccountMetadata,
  ): AssetDiffSummary[] => {
    const { to, from, nonLabelAmount, isReceiving } = metadata;

    return [
      {
        assetCode: "XLM",
        assetIssuer: null,
        decimals: 7,
        amount: nonLabelAmount,
        isCredit: isReceiving,
        destination: isReceiving ? from : to,
        icon: StellarLogo,
      },
    ];
  };

  // Unified rendering component for all credit/debit displays
  const renderCreditDebits = (
    creditDebits: AssetDiffSummary[],
    shouldShowToFrom: boolean,
    toFromAddress: string | undefined,
    isReceiving: boolean,
    isCollectibleTransfer: boolean,
  ) => {
    if (!creditDebits || creditDebits.length === 0) {
      return null;
    }

    return (
      <div className="TransactionDetailModal__asset-diffs">
        {creditDebits.map((diff: AssetDiffSummary, index: number) => {
          return (
            <div key={index} className="AssetDiff__row">
              <div
                className={`AssetDiff__label ${diff.isCredit ? "credit" : "debit"}`}
              >
                {diff.isCredit ? (
                  <Icon.ArrowCircleDown />
                ) : (
                  <Icon.ArrowCircleUp />
                )}
                <span>{diff.isCredit ? "Received" : "Sent"}</span>
              </div>
              <div
                className={`AssetDiff__value ${diff.isCredit ? "credit" : "debit"}`}
                data-testid={`AssetDiff__amount-${index}`}
              >
                {isCollectibleTransfer ? "" : diff.isCredit ? "+" : "-"}
                {diff.amount} {diff.assetCode}
              </div>
            </div>
          );
        })}
        {shouldShowToFrom && toFromAddress && (
          <div className="AssetDiff__to-from">
            <div className="AssetDiff__label">
              <Icon.User01 />
              <span>{isReceiving ? "From" : "To"}</span>
            </div>
            <div
              className="AssetDiff__value"
              data-testid="AssetDiff__to-from-address"
            >
              <KeyIdenticon publicKey={toFromAddress} isSmall />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBody = (activeOperation: OperationDataRow) => {
    // Normalize all operation types into unified structure
    let creditDebits: AssetDiffSummary[] = [];

    if (
      activeOperation.metadata.isInvokeHostFn &&
      activeOperation.metadata.hasAssetDiffs &&
      activeOperation.metadata.assetDiffs
    ) {
      creditDebits = activeOperation.metadata.assetDiffs;
    } else if (activeOperation.metadata.isCollectibleTransfer) {
      creditDebits = normalizeCollectibleTransferToAssetDiffs(
        activeOperation.metadata as CollectibleTransferMetadata,
      );
    } else if (activeOperation.metadata.isPayment) {
      creditDebits = normalizePaymentToAssetDiffs(
        activeOperation.metadata as PaymentMetadata,
      );
    } else if (activeOperation.metadata.isSwap) {
      creditDebits = normalizeSwapToAssetDiffs(
        activeOperation.metadata as SwapMetadata,
      );
    } else if (
      activeOperation.metadata.type ===
      Horizon.HorizonApi.OperationResponseType.createAccount
    ) {
      creditDebits = normalizeCreateAccountToAssetDiffs(
        activeOperation.metadata as CreateAccountMetadata,
      );
    }

    // Determine title based on operation type
    let title: string | ReactNode;
    if (
      activeOperation.metadata.isInvokeHostFn &&
      (activeOperation.metadata.isTokenTransfer ||
        activeOperation.metadata.isTokenMint)
    ) {
      title = `${activeOperation.action} ${activeOperation.rowText}`;
    } else if (activeOperation.metadata.isCollectibleTransfer) {
      title = `${t("Sent Collectible")}`;
    } else if (activeOperation.metadata.isSwap) {
      title = `${activeOperation.action} ${activeOperation.metadata.srcAssetCode} to ${activeOperation.metadata.destAssetCode}`;
    } else if (activeOperation.metadata.isPayment) {
      title = `${activeOperation.action} ${activeOperation.rowText}`;
    } else if (
      activeOperation.metadata.type ===
      Horizon.HorizonApi.OperationResponseType.changeTrust
    ) {
      title = `${activeOperation.rowText} ${t("for")} ${activeOperation.metadata.destAssetCode}`;
    } else {
      title = activeOperation.rowText;
    }

    const shouldShowToFrom = creditDebits.length === 1;
    const toFromAddress = shouldShowToFrom
      ? creditDebits[0].destination
      : undefined;
    const isReceiving = shouldShowToFrom ? creditDebits[0].isCredit : false;
    return (
      <>
        <div className="TransactionDetailModal__title-row">
          <div className="TransactionDetailModal__icon">
            {activeOperation.rowIcon}
          </div>
          <div className="TransactionDetailModal__title-details">
            <div
              className="TransactionDetailModal__title"
              data-testid="TransactionDetailModal__title"
            >
              {title}
            </div>
            <Text
              as="div"
              size="xs"
              weight="regular"
              addlClassName="TransactionDetailModal__subtitle"
            >
              <>
                {getActionIconByType(activeOperation.actionIcon)}
                <div
                  className="TransactionDetailModal__subtitle-date"
                  data-testid="TransactionDetailModal__subtitle-date"
                >
                  {createdAtDateStr} &bull; {createdAtTime}
                </div>
              </>
            </Text>
          </div>
        </div>
        {renderCreditDebits(
          creditDebits,
          shouldShowToFrom,
          toFromAddress,
          isReceiving,
          activeOperation.metadata.isCollectibleTransfer || false,
        )}
      </>
    );
  };

  return (
    <div
      className="TransactionDetailModal"
      data-testid="TransactionDetailModal"
    >
      {renderBody(activeOperation)}
      <div className="TransactionDetailModal__metadata">
        <div className="Metadata">
          <div className="Metadata__label">
            <Icon.ClockCheck />
            {t("Status")}
          </div>
          <div
            className={`Metadata__value ${activeOperation.metadata.transactionFailed ? "failed" : "success"}`}
            data-testid="TransactionDetailModal__status"
          >
            {activeOperation.metadata.transactionFailed
              ? t("Failed")
              : t("Success")}
          </div>
        </div>
        <div className="Metadata">
          <div className="Metadata__label">
            <Icon.Route />
            {t("Fee")}
          </div>
          <div className="Metadata__value">
            {stroopToXlm(feeCharged as string).toString()} XLM
          </div>
        </div>
        {/* Hide memo row when memo is disabled (e.g., for all M addresses) */}
        {!isMemoDisabled && (
          <div className="Metadata">
            <div className="Metadata__label">
              <Icon.File02 />
              {t("Memo")}
            </div>
            <div className="Metadata__value">{memo || t("None")}</div>
          </div>
        )}
      </div>
      {!isCustomNetwork(networkDetails) ? (
        <Button
          size="lg"
          variant="secondary"
          isFullWidth
          isRounded
          onClick={() => {
            emitMetric(METRIC_NAMES.historyOpenItem);
            openTab(`${stellarExpertUrl}/op/${activeOperation.id}`);
          }}
          icon={<Icon.LinkExternal01 />}
          iconPosition="right"
        >
          {t("View on")} stellar.expert
        </Button>
      ) : null}
    </div>
  );
};
