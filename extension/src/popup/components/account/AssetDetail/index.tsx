import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";
import { Button, CopyText, Icon, Link } from "@stellar/design-system";
import { useNavigate } from "react-router-dom";

import { ApiTokenPrice, ApiTokenPrices } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";
import {
  displaySorobanId,
  getAvailableBalance,
  getIssuerFromBalance,
  isSorobanIssuer,
} from "popup/helpers/account";
import { useAssetDomain } from "popup/helpers/useAssetDomain";
import { formatTokenAmount, isContractId } from "popup/helpers/soroban";
import { getAssetFromCanonical, isMainnet, isTestnet } from "helpers/stellar";

import { HistoryItem } from "popup/components/accountHistory/HistoryItem";
import { TransactionDetail } from "popup/components/accountHistory/TransactionDetail";
import { SlideupModal } from "popup/components/SlideupModal";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { settingsSelector } from "popup/ducks/settings";
import StellarLogo from "popup/assets/stellar-logo.png";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";
import { Loading } from "popup/components/Loading";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { title } from "helpers/transaction";
import {
  getBalanceByAsset,
  getPriceDeltaColor,
  isNativeBalance,
  isSorobanBalance,
} from "popup/helpers/balance";
import { CopyValue } from "popup/components/CopyValue";
import {
  AssetType,
  LiquidityPoolShareAsset,
} from "@shared/api/types/account-balance";
import { OperationDataRow } from "popup/views/AccountHistory/hooks/useGetHistoryData";
import { AppDispatch } from "popup/App";
import { saveAsset, saveIsToken } from "popup/ducks/transactionSubmission";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";

import "./styles.scss";

interface AssetDetailProps {
  assetOperations: OperationDataRow[];
  accountBalances: AccountBalances;
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
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
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

  const icons = accountBalances.icons || {};
  const assetIconUrl =
    "token" in selectedBalance &&
    "type" in selectedBalance.token &&
    selectedBalance.token.type === "native"
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
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);

  const { assetDomain, error: assetError } = useAssetDomain({
    assetIssuer,
  });

  if (!assetOperations && !isSorobanAsset) {
    return null;
  }

  const sortedAssetOperations = assetOperations.filter((operation) => {
    if (operation.metadata.isDustPayment && isHideDustEnabled) {
      return false;
    }

    return true;
  });

  if (assetIssuer && !assetDomain && !assetError && !isSorobanAsset) {
    // if we have an asset issuer, wait until we have the asset domain before continuing
    return <Loading />;
  }

  const activeOperation = sortedAssetOperations.find(
    (op) => op.id === activeAssetId,
  );

  const isStellarExpertSupported =
    isMainnet(networkDetails) || isTestnet(networkDetails);
  const stellarExpertAssetLinkSlug = isSorobanBalance(selectedBalance)
    ? `contract/${selectedBalance.contractId}`
    : `asset/${selectedAsset.replace(":", "-")}`;

  const isLpShare = "liquidity_pool_id" in selectedBalance;
  const hasBalance =
    selectedBalance?.total &&
    new BigNumber(selectedBalance.total).isGreaterThan(0);
  const showSwap = !isSorobanAsset && !isLpShare;
  const showSend = hasBalance;

  return activeAssetId ? (
    <SlideupModal
      isModalOpen={activeOperation !== null}
      setIsModalOpen={() => setActiveAssetId(null)}
    >
      <TransactionDetail
        activeOperation={activeOperation}
        networkDetails={networkDetails}
      />
    </SlideupModal>
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
              <div className="AssetDetail__balance-label">
                <Icon.Coins01 />
                Balance
              </div>
              <div>{displayTotal}</div>
            </div>
            <div className="AssetDetail__balance-value">
              <div className="AssetDetail__balance-label">
                <Icon.BankNote02 />
                Value
              </div>
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
          {sortedAssetOperations.length ? (
            <div className="AssetDetail__list" data-testid="AssetDetail__list">
              <>
                {sortedAssetOperations.map((operation) => (
                  <HistoryItem
                    key={operation.id}
                    accountBalances={accountBalances}
                    operation={operation}
                    publicKey={publicKey}
                    networkDetails={networkDetails}
                    setActiveHistoryDetailId={() =>
                      setActiveAssetId(operation.id)
                    }
                  />
                ))}
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
      {(showSwap || showSend) && (
        <div className="AssetDetail__actions-container">
          {showSend && (
            <Button
              data-testid="asset-detail-send-button"
              variant="secondary"
              size="lg"
              isRounded
              isFullWidth
              onClick={() => {
                dispatch(saveAsset(selectedAsset));
                if (isContractId(assetIssuer)) {
                  dispatch(saveIsToken(true));
                } else {
                  dispatch(saveIsToken(false));
                }
                navigateTo(ROUTES.sendPayment, navigate);
              }}
            >
              {t("Send")}
            </Button>
          )}
          {showSwap && (
            <Button
              data-testid="asset-detail-swap-button"
              variant="secondary"
              size="lg"
              isRounded
              isFullWidth
              onClick={() => {
                dispatch(saveAsset(selectedAsset));
                navigateTo(ROUTES.swap, navigate);
              }}
            >
              {t("Swap")}
            </Button>
          )}
        </div>
      )}
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
