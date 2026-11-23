import React, { useCallback, useState } from "react";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";
import { Notification } from "@stellar/design-system";

import { NetworkDetails } from "@shared/constants/stellar";
import IconSoroban from "popup/assets/icon-soroban.svg?react";
import {
  NO_FIAT_VALUE,
  formatAmount,
  roundUsdValue,
} from "popup/helpers/formatters";
import { getPriceDeltaColor } from "popup/helpers/balance";
import { Shimmer } from "popup/components/Shimmer";
import {
  PriceDirection,
  TokenChartSource,
} from "popup/components/account/TokenPriceChart/constants";
import {
  RangeDeltaState,
  TokenPriceChart,
  formatInspectedPriceLabel,
} from "popup/components/account/TokenPriceChart";
import { AssetAbout } from "popup/components/account/AssetAbout";
import { TokenStats } from "popup/components/account/TokenStats";

const LOADING_DELTA: RangeDeltaState = {
  isLoading: true,
  text: "",
  colorClass: PriceDirection.Neutral,
  inspectedPrice: null,
};

export interface AssetDetailBodyProps {
  /** Canonical token id: `native`, CODE:ISSUER or SYMBOL:CONTRACTID. */
  token: string;
  networkDetails: NetworkDetails;
  source: TokenChartSource;
  title: React.ReactNode;
  iconUrl?: string | null;
  isSorobanAsset: boolean;
  /** Spot price and 24h change for the header; null when unknown. */
  spotPrice: {
    currentPrice?: string | null;
    percentagePriceChange24h?: string | null;
  } | null;
  /** `$--` placeholder when there is no price and the asset is a contract token. */
  isPricePlaceholder: boolean;
  assetDomain?: string;
  /** flag && mainnet && !LP — owner decides; the body only renders. */
  isChartShown: boolean;
  /** Blockaid verdict for the token; malicious wins when both are set. */
  isMalicious?: boolean;
  isSuspicious?: boolean;
  /** Rendered between the chart and the About card (the held Balance/Value rows). */
  children?: React.ReactNode;
}

export const AssetDetailBody = ({
  token,
  networkDetails,
  source,
  title,
  iconUrl,
  isSorobanAsset,
  spotPrice,
  isPricePlaceholder: isSpotPricePlaceholder,
  assetDomain,
  isChartShown,
  isMalicious = false,
  isSuspicious = false,
  children,
}: AssetDetailBodyProps) => {
  const { t } = useTranslation();
  // The chart section owns the range and the fetch; it reports the selected
  // range's delta up. The report is tagged with the (network, token) it was
  // made for: this instance outlives a scope change that remounts the chart,
  // and until the new chart reports, a delta from another scope must read as
  // the placeholder rather than the previous token's number.
  const scopeKey = `${networkDetails.networkPassphrase}/${token}`;
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

  // Remount the scoped sections when the token or network changes in place,
  // so no render carries the previous scope's series, stats or delta under
  // the new identity (and `token_chart.viewed` cannot fire for the old data).
  // Prefixed per child: identical keys on siblings send React's reconciler
  // into a loop.
  // The scope tag cannot tell a remount from a return: hiding the chart and
  // showing it again for the same scope would revive the delta under the
  // remounted chart's default range. Drop it while the chart is hidden.
  if (!isChartShown && rangeDelta.delta !== LOADING_DELTA) {
    setRangeDelta({ scope: scopeKey, delta: LOADING_DELTA });
  }

  // See the `AssetDetail__price` div below for why this falls back to spot.
  // The guard mirrors the render-time `LOADING_DELTA` reset above: either
  // alone keeps an inspected price off a hidden chart's header.
  const inspectedHeaderPrice = isChartShown ? shownDelta.inspectedPrice : null;
  const headerPrice = inspectedHeaderPrice ?? spotPrice?.currentPrice;
  // An inspected price fills the header, so the spot-only placeholder yields.
  const isPricePlaceholder = !headerPrice && isSpotPricePlaceholder;

  const flaggedWarning = isMalicious
    ? {
        variant: "error" as const,
        title: t("This token was flagged as malicious"),
      }
    : isSuspicious
      ? {
          variant: "warning" as const,
          title: t("This token was flagged as suspicious"),
        }
      : null;

  return (
    <>
      <div className="AssetDetail__network-icon">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={t("Network icon")}
            data-testid="AssetDetail__icon"
          />
        ) : isSorobanAsset ? (
          <IconSoroban data-testid="AssetDetail__soroban-icon" />
        ) : null}
      </div>
      <div className="AssetDetail__title">{title}</div>
      {/* Spot, or the inspected point's close while a drag-to-inspect is
          in progress. Inspecting describes a chart point, so it uses
          the chart's precision, as the delta already does. */}
      <div
        className={`AssetDetail__price${
          isPricePlaceholder ? " AssetDetail__price--placeholder" : ""
        }`}
        data-testid="AssetDetail__price"
      >
        {inspectedHeaderPrice
          ? formatInspectedPriceLabel(inspectedHeaderPrice)
          : headerPrice
            ? `$${formatAmount(
                roundUsdValue(new BigNumber(headerPrice).toString()),
              )}`
            : isPricePlaceholder
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
              width="9.5rem"
              height="1.25rem"
            />
          ) : (
            shownDelta.text
          )}
        </div>
      ) : spotPrice && spotPrice.percentagePriceChange24h ? (
        <div
          className={`AssetDetail__delta ${getPriceDeltaColor(
            new BigNumber(roundUsdValue(spotPrice.percentagePriceChange24h)),
          )}`}
          data-testid="AssetDetail__delta"
        >
          {formatAmount(roundUsdValue(spotPrice.percentagePriceChange24h))}%
        </div>
      ) : null}
      {/* Between the header and the chart, where mobile puts its banner. */}
      {flaggedWarning ? (
        <div
          className="AssetDetail__warning"
          data-testid="AssetDetail__warning"
        >
          <Notification
            variant={flaggedWarning.variant}
            title={flaggedWarning.title}
          />
        </div>
      ) : null}
      {isChartShown ? (
        <TokenPriceChart
          key={`chart-${scopeKey}`}
          token={token}
          networkDetails={networkDetails}
          fallback24hPercent={spotPrice?.percentagePriceChange24h}
          onDeltaChange={handleDeltaChange}
          source={source}
        />
      ) : null}
      {children}
      {isChartShown ? (
        <AssetAbout
          key={`about-${scopeKey}`}
          token={token}
          assetDomain={assetDomain}
          networkPassphrase={networkDetails.networkPassphrase}
        />
      ) : null}
      {isChartShown ? (
        <TokenStats
          key={`stats-${scopeKey}`}
          token={token}
          networkDetails={networkDetails}
        />
      ) : null}
    </>
  );
};
