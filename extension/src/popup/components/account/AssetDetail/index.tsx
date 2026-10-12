import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, CopyText, Icon, Link } from "@stellar/design-system";

import { NetworkDetails } from "@shared/constants/stellar";
import {
  isNativeAssetId,
  isNativeBalance,
} from "@shared/helpers/assetIdentity";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";
import IconSoroban from "popup/assets/icon-soroban.svg?react";
import {
  getAvailableBalance,
  getIssuerFromBalance,
  isSorobanIssuer,
} from "popup/helpers/account";
import { useAssetDomain } from "popup/helpers/useAssetDomain";
import { formatTokenAmount, isSacContract } from "popup/helpers/soroban";
import {
  getAssetFromCanonical,
  isMainnet,
  isTestnet,
  truncateString,
} from "helpers/stellar";

import { HistoryItem } from "popup/components/accountHistory/HistoryItem";
import { TransactionDetail } from "popup/components/accountHistory/TransactionDetail";
import { SlideupModal } from "popup/components/SlideupModal";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import StellarLogo from "popup/assets/stellar-logo.png";
import {
  NO_FIAT_VALUE,
  formatAmount,
  roundUsdValue,
} from "popup/helpers/formatters";
import { Loading } from "popup/components/Loading";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { title } from "helpers/transaction";
import { getTokenType, TokenType } from "popup/helpers/token";
import { PriceDirection } from "popup/components/account/TokenPriceChart/constants";
import {
  getBalanceByAsset,
  getPriceDeltaColor,
  isSorobanBalance,
} from "popup/helpers/balance";
import { Shimmer } from "popup/components/Shimmer";
import {
  AssetType,
  LiquidityPoolShareAsset,
} from "@shared/api/types/account-balance";
import { OperationDataRow } from "popup/views/AccountHistory/hooks/useGetHistoryData";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { SwapSource } from "popup/constants/swap";
import { AccountHistoryData } from "popup/views/Account/hooks/useGetAccountHistoryData";
import { publicKeySelector } from "popup/ducks/accountServices";
import { iconsSelector, tokenPricesSelector } from "popup/ducks/cache";
import { tokenPriceHistoryEnabledSelector } from "popup/ducks/remoteConfig";
import {
  RangeDeltaState,
  TokenPriceChart,
  formatInspectedPriceLabel,
} from "popup/components/account/TokenPriceChart";
import { AssetAbout } from "popup/components/account/AssetAbout";
import { TokenStats } from "popup/components/account/TokenStats";
import { AppDataType } from "helpers/hooks/useGetAppData";

import "./styles.scss";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

const LOADING_DELTA: RangeDeltaState = {
  isLoading: true,
  text: "",
  colorClass: PriceDirection.Neutral,
  inspectedPrice: null,
};

// One shared empty list, so the operations memo keeps its identity for an
// asset with no history instead of recomputing on every render.
const NO_OPERATIONS: OperationDataRow[] = [];

// Memoised: drag-to-inspect reports a new price and delta per SNAPPED point,
// so this whole view re-renders on every pointer move over the chart, and the
// operations list has nothing to do with any of it.
const AssetDetailOperations = React.memo(function AssetDetailOperations({
  filteredAssetOperations,
  accountBalances,
  publicKey,
  networkDetails,
  setActiveAssetId,
}: {
  filteredAssetOperations: OperationDataRow[];
  accountBalances: AccountBalances;
  publicKey: string;
  networkDetails: NetworkDetails;
  setActiveAssetId: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {filteredAssetOperations.length ? (
        <div className="AssetDetail__list" data-testid="AssetDetail__list">
          <>
            {filteredAssetOperations.map((operation) => (
              <HistoryItem
                key={operation.id}
                accountBalances={accountBalances}
                operation={operation}
                publicKey={publicKey}
                networkDetails={networkDetails}
                setActiveHistoryDetailId={() => setActiveAssetId(operation.id)}
              />
            ))}
          </>
        </div>
      ) : (
        <div className="AssetDetail__empty" data-testid="AssetDetail__empty">
          {t("No transactions to show")}
        </div>
      )}
    </>
  );
});

interface AssetDetailProps {
  accountBalances: AccountBalances;
  historyData: AccountHistoryData | null;
  selectedAsset: string;
  handleClose: () => void;
  /** The account history request failed; shows an error, not a skeleton. */
  hasHistoryError?: boolean;
}

export const AssetDetail = ({
  accountBalances,
  historyData,
  selectedAsset,
  handleClose,
  hasHistoryError = false,
}: AssetDetailProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const cachedTokenPrices = useSelector(tokenPricesSelector);
  const assetIcons = useSelector(iconsSelector);
  const isPriceHistoryEnabled = useSelector(tokenPriceHistoryEnabledSelector);
  const { isHideDustEnabled } = useSelector(settingsSelector);
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  // The chart section owns the range and the fetch; it reports the selected
  // range's delta up. The report is tagged with the (network, token) it was
  // made for: this instance outlives a scope change that remounts the chart,
  // and until the new chart reports, a delta from another scope must read as
  // the placeholder rather than the previous token's number.
  const scopeKey = `${networkDetails.networkPassphrase}/${selectedAsset}`;
  const [rangeDelta, setRangeDelta] = useState<{
    scope: string;
    delta: RangeDeltaState;
  }>({ scope: scopeKey, delta: LOADING_DELTA });
  const handleDeltaChange = useCallback(
    (delta: RangeDeltaState) => setRangeDelta({ scope: scopeKey, delta }),
    [scopeKey],
  );
  const shownDelta =
    rangeDelta.scope === scopeKey ? rangeDelta.delta : LOADING_DELTA;
  const activeOptionsRef = useRef<HTMLDivElement>(null);
  const isNative = isNativeAssetId(selectedAsset);
  const tokenPrices =
    cachedTokenPrices[networkDetails.networkPassphrase]?.[publicKey] || null;

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

  const icons = assetIcons || {};
  const assetIconUrl = isNativeBalance(selectedBalance)
    ? StellarLogo
    : icons[selectedAsset];
  const assetPrice = tokenPrices ? tokenPrices[selectedAsset] : null;
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
    subentryCount: accountBalances.subentryCount,
  });

  const availableTotal = `${formatAmount(balanceAvailable)} ${canonical.code}`;
  const displayTotal = `${formatAmount(total)} ${canonical.code}`;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);

  const { assetDomain, error: assetError } = useAssetDomain({
    assetIssuer,
  });

  const isLpShare = Boolean(
    selectedBalance && "liquidityPoolId" in selectedBalance,
  );

  // Chart + stats are mainnet-only; elsewhere the header keeps its 24h delta.
  // LP shares are excluded: `<pool-id>:lp` is not priceable (getTokenPrices
  // strips it), so the section would fire seven doomed requests and the About
  // card would misclassify it as classic.
  // Remount the scoped sections when the token or network changes in place,
  // so no render carries the previous scope's series, stats or delta under
  // the new identity (and `token_chart.viewed` cannot fire for the old data).
  // Prefixed per child: identical keys on siblings send React's reconciler
  // into a loop.
  const isChartShown =
    isPriceHistoryEnabled && isMainnet(networkDetails) && !isLpShare;
  // The scope tag cannot tell a remount from a return: hiding the chart and
  // showing it again for the same scope would revive the delta under the
  // remounted chart's default range. Drop it while the chart is hidden.
  if (!isChartShown && rangeDelta.delta !== LOADING_DELTA) {
    setRangeDelta({ scope: scopeKey, delta: LOADING_DELTA });
  }

  // Narrowed by hand rather than by the `REROUTE` early return below: this has
  // to sit above it to be a hook, and a reroute has no operations anyway.
  // A missing key means no operations for this asset, not a pending fetch:
  // only null history (not fetched yet) should keep the loader up.
  const assetOperations =
    historyData && historyData.type !== AppDataType.REROUTE
      ? (historyData.operationsByAsset?.[selectedAsset] ?? NO_OPERATIONS)
      : null;

  // Memoised for the same reason `AssetDetailOperations` is: a fresh array on
  // every pointer move over the chart would defeat the memo it feeds.
  const filteredAssetOperations = useMemo(
    () =>
      assetOperations
        ? assetOperations.filter(
            (operation) =>
              !(operation.metadata.isDustPayment && isHideDustEnabled),
          )
        : null,
    [assetOperations, isHideDustEnabled],
  );

  if (historyData?.type === AppDataType.REROUTE) {
    return null;
  }

  const activeOperation =
    filteredAssetOperations?.find((op) => op.id === activeAssetId) || null;

  if (assetIssuer && !assetDomain && !assetError && !isSorobanAsset) {
    // if we have an asset issuer, wait until we have the asset domain before continuing
    return <Loading />;
  }

  const isStellarExpertSupported =
    isMainnet(networkDetails) || isTestnet(networkDetails);
  const stellarExpertAssetLinkSlug = isSorobanBalance(selectedBalance)
    ? `contract/${selectedBalance.contractId}`
    : `asset/${selectedAsset.replace(":", "-")}`;

  const hasBalance =
    selectedBalance?.total &&
    new BigNumber(selectedBalance.total).isGreaterThan(0);
  // A SAC's `name()` is "native" or "CODE:ISSUER", so only a custom SEP-41
  // token gets its contract name as the title.
  const isCustomToken =
    !!selectedBalance &&
    isSorobanBalance(selectedBalance) &&
    getTokenType(selectedAsset, networkDetails.networkPassphrase) ===
      TokenType.Soroban &&
    !isSacContract(
      selectedBalance.name,
      selectedBalance.contractId,
      networkDetails.networkPassphrase,
    );
  const isShowingSwap = !isSorobanAsset && !isLpShare;
  const isShowingSend = hasBalance;

  // See the `AssetDetail__price` div below for why this falls back to spot.
  // The guard mirrors the render-time `LOADING_DELTA` reset above: either
  // alone keeps an inspected price off a hidden chart's header.
  const inspectedHeaderPrice = isChartShown ? shownDelta.inspectedPrice : null;
  const headerPrice = inspectedHeaderPrice ?? assetPrice?.currentPrice;

  return (
    <React.Fragment>
      <View>
        <SubviewHeader
          title={canonical.code}
          customBackIcon={<Icon.X />}
          customBackAction={handleClose}
          rightButton={
            !isStellarExpertSupported &&
            isNativeBalance(selectedBalance) ? null : (
              <>
                <div
                  className="AssetDetail__options"
                  onClick={() => setOptionsOpen(true)}
                >
                  <img src={IconEllipsis} alt={t("asset options")} />
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
                              {t("Copy address")}
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
                <img
                  src={assetIconUrl}
                  alt={t("Network icon")}
                  data-testid="AssetDetail__icon"
                />
              ) : isSorobanAsset ? (
                <IconSoroban data-testid="AssetDetail__soroban-icon" />
              ) : null}
            </div>
            <div className="AssetDetail__title">
              {/* The native asset shows its NAME here, not its code — the
                  balance list (BalanceRow) and the token picker (TokenList)
                  both already do, and this header was the one place still
                  reading "XLM". `title()` cannot own this: it is a plain
                  helper with no access to `t`, and the name is translatable. */}
              {isLpShare && "liquidityPoolId" in selectedBalance
                ? `LP: ${truncateString(selectedBalance.liquidityPoolId as string, 12)}`
                : isCustomToken &&
                    isSorobanBalance(selectedBalance) &&
                    selectedBalance.name
                  ? selectedBalance.name
                  : (getTokenType(
                      selectedAsset,
                      networkDetails.networkPassphrase,
                    ) === TokenType.Native
                      ? t("Stellar Lumens")
                      : title(
                          selectedBalance as Exclude<
                            AssetType,
                            LiquidityPoolShareAsset
                          >,
                        )) || assetDomain}
            </div>
            {/* Spot, or the inspected point's close while a drag-to-inspect is
                in progress. Inspecting describes a chart point, so it uses
                the chart's precision, as the delta already does. */}
            <div
              className="AssetDetail__price"
              data-testid="AssetDetail__price"
            >
              {inspectedHeaderPrice
                ? formatInspectedPriceLabel(inspectedHeaderPrice)
                : headerPrice
                  ? `$${formatAmount(
                      roundUsdValue(new BigNumber(headerPrice).toString()),
                    )}`
                  : isSorobanAsset
                    ? `$${NO_FIAT_VALUE}`
                    : null}
            </div>
            {isChartShown ? (
              /* The view's one delta, reported by the chart section. Rendered in
                 every state so the price and chart never shift. */
              <div
                className={`AssetDetail__delta AssetDetail__delta--range ${shownDelta.colorClass}`}
                data-testid="AssetDetail__delta"
              >
                {shownDelta.isLoading ? (
                  <Shimmer
                    className="AssetDetail__delta-ghost"
                    width="9.125rem"
                    height="1.5rem"
                  />
                ) : (
                  shownDelta.text
                )}
              </div>
            ) : assetPrice && assetPrice.percentagePriceChange24h ? (
              <div
                className={`AssetDetail__delta ${getPriceDeltaColor(
                  new BigNumber(
                    roundUsdValue(assetPrice.percentagePriceChange24h),
                  ),
                )}`}
                data-testid="AssetDetail__delta"
              >
                {formatAmount(
                  roundUsdValue(assetPrice.percentagePriceChange24h),
                )}
                %
              </div>
            ) : null}
            {isChartShown ? (
              <TokenPriceChart
                key={`chart-${scopeKey}`}
                token={selectedAsset}
                networkDetails={networkDetails}
                fallback24hPercent={assetPrice?.percentagePriceChange24h}
                onDeltaChange={handleDeltaChange}
              />
            ) : null}
            <div className="AssetDetail__balance-info">
              <div
                className="AssetDetail__balance"
                data-testid="asset-detail-available-copy"
              >
                <div className="AssetDetail__balance-label">
                  <Icon.Coins01 />
                  {t("Balance")}
                </div>
                <div>{displayTotal}</div>
              </div>
              <div className="AssetDetail__balance-value">
                <div className="AssetDetail__balance-label">
                  <Icon.BankNote02 />
                  {t("Value")}
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
                    : NO_FIAT_VALUE}
                </div>
              </div>
            </div>
            {isChartShown ? (
              <AssetAbout
                key={`about-${scopeKey}`}
                token={selectedAsset}
                assetDomain={assetDomain}
                networkPassphrase={networkDetails.networkPassphrase}
              />
            ) : null}
            {isChartShown ? (
              <TokenStats
                key={`stats-${scopeKey}`}
                token={selectedAsset}
                networkDetails={networkDetails}
              />
            ) : null}
            {filteredAssetOperations === null && hasHistoryError ? (
              <div
                className="AssetDetail__empty"
                data-testid="AssetDetail__list__error"
              >
                {t("Unable to load history")}
              </div>
            ) : filteredAssetOperations === null ? (
              <div
                className="AssetDetail__list AssetDetail__list--loading"
                data-testid="AssetDetail__list__loader"
                role="status"
                aria-label={t("Loading history")}
              >
                {[0, 1, 2].map((row) => (
                  <Shimmer
                    key={row}
                    data-testid="AssetDetail__list__skeleton-row"
                    width="100%"
                    height="2.75rem"
                  />
                ))}
              </div>
            ) : (
              <AssetDetailOperations
                filteredAssetOperations={filteredAssetOperations}
                accountBalances={accountBalances}
                publicKey={publicKey}
                networkDetails={networkDetails}
                setActiveAssetId={setActiveAssetId}
              />
            )}
          </div>
        </View.Content>
        {(isShowingSwap || isShowingSend) && (
          <div className="AssetDetail__actions-container">
            {isShowingSend && (
              <Button
                data-testid="asset-detail-send-button"
                variant="secondary"
                size="lg"
                isRounded
                isFullWidth
                onClick={() => {
                  const queryParams = `?asset=${encodeURIComponent(selectedAsset)}&return_to=asset_detail&return_asset=${encodeURIComponent(selectedAsset)}`;
                  navigateTo(ROUTES.sendPayment, navigate, queryParams);
                }}
              >
                {t("Send")}
              </Button>
            )}
            {isShowingSwap && (
              <Button
                data-testid="asset-detail-swap-button"
                variant="secondary"
                size="lg"
                isRounded
                isFullWidth
                onClick={() => {
                  // `source` tags swap.completed with its entry point.
                  const queryParams = `?source_asset=${encodeURIComponent(selectedAsset)}&source=${SwapSource.TokenDetails}`;
                  navigateTo(ROUTES.swap, navigate, queryParams);
                }}
              >
                {t("Swap")}
              </Button>
            )}
          </div>
        )}
        {isNative && (
          <SlideupModal
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
          >
            <div className="AssetDetail__info-modal">
              <div className="AssetDetail__info-modal__total-box">
                <div className="AssetDetail__info-modal__asset-code">
                  <img src={StellarLogo} alt={t("Network icon")} />
                  <div>{` ${canonical.code}`}</div>
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
                      {`${formatAmount(
                        new BigNumber(balanceAvailable)
                          .minus(new BigNumber(selectedBalance?.total))
                          .toString(),
                      )} `}
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
                {`${t(
                  "* All Stellar accounts must maintain a minimum balance of lumens.",
                )} `}
                <a
                  href="https://developers.stellar.org/docs/glossary/minimum-balance/"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Learn more")}
                </a>
              </div>
            </div>
          </SlideupModal>
        )}
        {/* The full-screen backdrop also covers the sticky Send/Swap bar */}
        <SlideupModal
          isModalOpen={activeOperation !== null}
          setIsModalOpen={() => setActiveAssetId(null)}
          hasBackdrop
        >
          <TransactionDetail
            activeOperation={activeOperation}
            networkDetails={networkDetails}
          />
        </SlideupModal>
      </View>
    </React.Fragment>
  );
};
