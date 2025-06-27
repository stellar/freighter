import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";
import { CopyText, Icon, Link } from "@stellar/design-system";

import {
  ApiTokenPrice,
  ApiTokenPrices,
  HorizonOperation,
} from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";
import {
  displaySorobanId,
  getAvailableBalance,
  getIsDustPayment,
  getIsPayment,
  getIsSwap,
  getIssuerFromBalance,
  isSorobanIssuer,
} from "popup/helpers/account";
import { useAssetDomain } from "popup/helpers/useAssetDomain";
import { formatTokenAmount } from "popup/helpers/soroban";
import { getAssetFromCanonical, isMainnet, isTestnet } from "helpers/stellar";

import {
  historyItemDetailViewProps,
  HistoryItem,
} from "popup/components/accountHistory/HistoryItem";
import {
  TransactionDetail,
  TransactionDetailProps,
} from "popup/components/accountHistory/TransactionDetail";
import { SlideupModal } from "popup/components/SlideupModal";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { settingsSelector } from "popup/ducks/settings";
import StellarLogo from "popup/assets/stellar-logo.png";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";
import { isAssetSuspicious } from "popup/helpers/blockaid";
import { Loading } from "popup/components/Loading";
import { BlockaidAssetWarning } from "popup/components/WarningMessages";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import {
  getBalanceByAsset,
  getPriceDeltaColor,
  isNativeBalance,
  isSorobanBalance,
} from "popup/helpers/balance";
import { CopyValue } from "popup/components/CopyValue";
import {
  AssetType,
  ClassicAsset,
  LiquidityPoolShareAsset,
  NativeAsset,
  SorobanAsset,
} from "@shared/api/types/account-balance";

import "./styles.scss";

interface AssetDetailProps {
  accountBalances: AccountBalances;
  assetOperations: HorizonOperation[];
  networkDetails: NetworkDetails;
  publicKey: string;
  selectedAsset: string;
  setSelectedAsset: (selectedAsset: string) => void;
  subentryCount: number;
  tokenPrices?: ApiTokenPrices | null;
}

export const AssetDetail = ({
  assetOperations,
  accountBalances,
  networkDetails,
  publicKey,
  selectedAsset,
  setSelectedAsset,
  subentryCount,
  tokenPrices,
}: AssetDetailProps) => {
  const { t } = useTranslation();
  const { isHideDustEnabled } = useSelector(settingsSelector);
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const activeOptionsRef = useRef<HTMLDivElement>(null);
  const isNative = selectedAsset === "native";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        activeOptionsRef.current &&
        !activeOptionsRef.current.contains(event.target as Node)
      ) {
        setOptionsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeOptionsRef]);

  const canonical = getAssetFromCanonical(selectedAsset);
  const isSorobanAsset = canonical.issuer && isSorobanIssuer(canonical.issuer);

  const selectedBalance = getBalanceByAsset(
    canonical,
    accountBalances.balances,
  ) as Exclude<AssetType, LiquidityPoolShareAsset>;
  const isSuspicious =
    "blockaidData" in selectedBalance
      ? isAssetSuspicious(selectedBalance.blockaidData)
      : false;

  const icons = accountBalances.icons || {};
  const assetIconUrl =
    "type" in selectedBalance.token && selectedBalance.token.type === "native"
      ? StellarLogo
      : icons[selectedAsset];
  const assetPrice: ApiTokenPrice | null = tokenPrices
    ? tokenPrices[selectedAsset]
    : null;
  const assetIssuer = selectedBalance
    ? getIssuerFromBalance(selectedBalance)
    : "";
  const total =
    selectedBalance && "decimals" in selectedBalance
      ? formatTokenAmount(
          new BigNumber(selectedBalance.total || "0"),
          Number(selectedBalance.decimals),
        )
      : (selectedBalance && new BigNumber(selectedBalance?.total).toString()) ||
        "0";

  const balanceAvailable = getAvailableBalance({
    balance: selectedBalance,
    subentryCount,
  });

  const availableTotal = `${formatAmount(balanceAvailable)} ${canonical.code}`;
  const displayTotal = `${formatAmount(total)} ${canonical.code}`;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailViewShowing, setIsDetailViewShowing] = useState(false);

  const defaultDetailViewProps: TransactionDetailProps = {
    ...historyItemDetailViewProps,
    setIsDetailViewShowing,
  };
  const [detailViewProps, setDetailViewProps] = useState(
    defaultDetailViewProps,
  );

  const { assetDomain, error: assetError } = useAssetDomain({
    assetIssuer,
  });

  if (!assetOperations && !isSorobanAsset) {
    return null;
  }

  const sortedAssetOperations = assetOperations.filter((operation) => {
    const isDustPayment = getIsDustPayment(publicKey, operation);

    if (isDustPayment && isHideDustEnabled) {
      return false;
    }

    return true;
  });

  if (assetIssuer && !assetDomain && !assetError && !isSorobanAsset) {
    // if we have an asset issuer, wait until we have the asset domain before continuing
    return <Loading />;
  }

  const title = (balance: NativeAsset | ClassicAsset | SorobanAsset) => {
    if ("type" in balance.token && balance.token.type === "native") {
      return "Stellar Lumens";
    }
    if ("symbol" in balance) {
      return balance.symbol;
    }

    return "";
  };

  const isStellarExpertSupported =
    isMainnet(networkDetails) || isTestnet(networkDetails);
  const stellarExpertAssetLinkSlug = isSorobanBalance(selectedBalance)
    ? `contract/${selectedBalance.contractId}`
    : `asset/${selectedAsset.replace(":", "-")}`;

  return isDetailViewShowing ? (
    <TransactionDetail {...detailViewProps} />
  ) : (
    <React.Fragment>
      <SubviewHeader
        title={canonical.code}
        customBackAction={() => setSelectedAsset("")}
        rightButton={
          !isStellarExpertSupported &&
          isNativeBalance(selectedBalance) ? null : (
            <>
              <div
                className="AssetDetail__options"
                onClick={() => setOptionsOpen(true)}
              >
                <img src={IconEllipsis} alt="asset options" />
              </div>
              {optionsOpen ? (
                <div
                  className="AssetDetail__options-actions"
                  ref={activeOptionsRef}
                >
                  {!isNativeBalance(selectedBalance) ? (
                    <div className="AssetDetail__options-actions__row">
                      <CopyText
                        textToCopy={
                          isSorobanBalance(selectedBalance)
                            ? selectedBalance.contractId
                            : selectedBalance.token.issuer.key
                        }
                      >
                        <div className="action">
                          <div className="AssetDetail__options-actions__label">
                            Copy address
                          </div>
                          <Icon.Copy01 />
                        </div>
                      </CopyText>
                    </div>
                  ) : null}
                  {isStellarExpertSupported ? (
                    <div className="AssetDetail__options-actions__row">
                      <Link
                        className="action link"
                        variant="secondary"
                        rel="noreferrer"
                        target="_blank"
                        href={`https://stellar.expert/explorer/${networkDetails.network.toLowerCase()}/${stellarExpertAssetLinkSlug}`}
                      >
                        <>
                          <div className="AssetDetail__options-actions__label">
                            Stellar.expert
                          </div>
                          <Icon.LinkExternal01 />
                        </>
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )
        }
      />
      <View.Content>
        <div className="AssetDetail__wrapper" data-testid="AssetDetail">
          <div className="AssetDetail__network-icon">
            {assetIconUrl ? (
              <img src={assetIconUrl} alt="Network icon" />
            ) : null}
          </div>
          <div className="AssetDetail__title">
            {title(selectedBalance) || assetDomain}
          </div>
          {"contractId" in selectedBalance ? (
            <div className="AssetDetail__subtitle">
              <CopyValue
                value={selectedBalance.contractId}
                displayValue={displaySorobanId(selectedBalance.contractId, 28)}
              />
            </div>
          ) : null}
          <div className="AssetDetail__price">
            {assetPrice && assetPrice.currentPrice
              ? `$${formatAmount(
                  roundUsdValue(
                    new BigNumber(assetPrice.currentPrice).toString(),
                  ),
                )}`
              : null}
          </div>
          {assetPrice && assetPrice.percentagePriceChange24h ? (
            <div
              className={`AssetDetail__delta ${getPriceDeltaColor(
                new BigNumber(
                  roundUsdValue(assetPrice.percentagePriceChange24h),
                ),
              )}`}
            >
              {formatAmount(roundUsdValue(assetPrice.percentagePriceChange24h))}
              %
            </div>
          ) : null}
          <div className="AssetDetail__balance-info">
            <div
              className="AssetDetail__balance"
              data-testid="asset-detail-available-copy"
            >
              <div className="AssetDetail__balance-label">Balance</div>
              <div>{displayTotal}</div>
            </div>
            <div className="AssetDetail__balance-value">
              <div className="AssetDetail__balance-label">Value</div>
              <div>
                {assetPrice && assetPrice.currentPrice
                  ? `$${formatAmount(
                      roundUsdValue(
                        new BigNumber(assetPrice.currentPrice)
                          .multipliedBy(selectedBalance.total)
                          .toString(),
                      ),
                    )}`
                  : "--"}
              </div>
            </div>
          </div>
          <div className="AssetDetail__scam-warning">
            {isSuspicious && (
              <BlockaidAssetWarning
                blockaidData={
                  ("blockaidData" in selectedBalance &&
                    selectedBalance.blockaidData) ||
                  defaultBlockaidScanAssetResult
                }
              />
            )}
          </div>
          {sortedAssetOperations.length ? (
            <div className="AssetDetail__list" data-testid="AssetDetail__list">
              <>
                {sortedAssetOperations.map((operation) => {
                  const historyItemOperation = {
                    ...operation,
                    isPayment: getIsPayment(operation.type),
                    isSwap: getIsSwap(operation),
                  } as any; // TODO: isPayment/isSwap overload op type
                  return (
                    <HistoryItem
                      key={operation.id}
                      accountBalances={accountBalances}
                      operation={historyItemOperation}
                      publicKey={publicKey}
                      networkDetails={networkDetails}
                      setDetailViewProps={setDetailViewProps}
                      setIsDetailViewShowing={setIsDetailViewShowing}
                    />
                  );
                })}
              </>
            </div>
          ) : (
            <div
              className="AssetDetail__empty"
              data-testid="AssetDetail__empty"
            >
              {t("No transactions to show")}
            </div>
          )}
        </div>
      </View.Content>
      {/* TODO: fix the slideup modal */}
      {isNative && (
        <SlideupModal isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}>
          <div className="AssetDetail__info-modal">
            <div className="AssetDetail__info-modal__total-box">
              <div className="AssetDetail__info-modal__asset-code">
                <img src={StellarLogo} alt="Network icon" />{" "}
                <div>{canonical.code}</div>
              </div>
              <div>{displayTotal}</div>
            </div>
            <div className="AssetDetail__info-modal__available-box">
              <div className="AssetDetail__info-modal__balance-row">
                <div>{t("Total Balance")}</div>
                <div>{displayTotal}</div>
              </div>
              <div className="AssetDetail__info-modal__balance-row">
                <div>{t("Reserved Balance*")}</div>
                {selectedBalance &&
                "available" in selectedBalance &&
                selectedBalance?.available &&
                selectedBalance?.total ? (
                  <div>
                    {formatAmount(
                      new BigNumber(balanceAvailable)
                        .minus(new BigNumber(selectedBalance?.total))
                        .toString(),
                    )}{" "}
                    {canonical.code}
                  </div>
                ) : null}
              </div>
              <div className="AssetDetail__info-modal__total-available-row">
                <div>{t("Total Available")}</div>
                <div>{availableTotal}</div>
              </div>
            </div>
            <div className="AssetDetail__info-modal__footnote">
              {t(
                "* All Stellar accounts must maintain a minimum balance of lumens.",
              )}{" "}
              <a
                href="https://developers.stellar.org/docs/glossary/minimum-balance/"
                target="_blank"
                rel="noreferrer"
              >
                {t("Learn More")}
              </a>
            </div>
          </div>
        </SlideupModal>
      )}
    </React.Fragment>
  );
};
