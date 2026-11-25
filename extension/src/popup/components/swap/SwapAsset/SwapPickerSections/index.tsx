import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon, Notification } from "@stellar/design-system";

import { SwapTokenMenu } from "../SwapTokenMenu";
import { BalanceRow } from "popup/components/BalanceRow";
import {
  VerifiedTokenInfoSheet,
  UnverifiedTokenInfoSheet,
} from "popup/components/TokenVerificationSheets";
import { AssetListRow } from "popup/components/AssetListRow";
import { CLASSIC_ASSET_DECIMALS } from "popup/helpers/soroban";
import { swapIdentityKey } from "popup/helpers/swapQuote";
import { truncateString } from "helpers/stellar";
import { SecurityLevel } from "popup/constants/blockaid";
import type { SwapTokenRecord } from "../hooks/useSwapTokenLookup";
import type { SwapPickerSelection } from "../index";

import "./styles.scss";

/** Which picker section a clicked row came from (used for telemetry). */
export type PickerSource = "balances" | "popular" | "search";

/** Builds the destination descriptor passed up to the Swap view on pick. */
export const buildSelection = (
  r: SwapTokenRecord,
  source: PickerSource,
): SwapPickerSelection => ({
  tokenCode: r.code ?? "",
  requiresTrustline: r.requiresTrustline,
  // An unheld contract token's decimals are read when it is picked, not
  // taken from the search record.
  decimals: r.isContract
    ? r.isHeld
      ? r.decimals
      : undefined
    : CLASSIC_ASSET_DECIMALS,
  issuer: r.issuer || undefined,
  securityLevel: r.securityLevel,
  securityWarnings: r.securityWarnings,
  iconUrl: r.image ?? r.icon ?? undefined,
  spotPrice: r.spotPrice,
  source,
});

/**
 * Flat sections shape accepted by this presentational component.
 * Callers consuming `useSwapTokenLookup` should destructure `state.data.sections`
 * and merge it with the top-level flags before passing here.
 */
export interface SwapPickerSectionsResult {
  yourTokens: SwapTokenRecord[];
  popular: SwapTokenRecord[];
  verified: SwapTokenRecord[];
  unverified: SwapTokenRecord[];
  isFallback: boolean;
  /** True when the account has no held balances (new/unfunded account). */
  isNewAccount: boolean;
}

export interface SwapPickerSectionsProps {
  result: SwapPickerSectionsResult;
  searchTerm: string;
  /** Canonicals to exclude from every section (e.g. the swap source asset, so
   * a user can't pick the same token as both sides). */
  hiddenAssets?: string[];
  onClickAsset: (
    canonical: string,
    isContract: boolean,
    details?: SwapPickerSelection,
  ) => void;
  stellarExpertUrl: string;
  /** Whether token discovery (Popular + search) exists on this network — true on
   * Mainnet/Testnet, false on custom/Futurenet. When false the discovery-
   * unavailable notice is suppressed: the network simply has no Popular list, so
   * it's hidden gracefully rather than flagged as a (transient) outage. */
  isDiscoverySupported?: boolean;
  /** Opens the row's details; `source` lets a Swap To from there pick like the row. */
  onViewDetails?: (record: SwapTokenRecord, source: PickerSource) => void;
}

export const SwapPickerSections = ({
  result,
  searchTerm,
  hiddenAssets = [],
  onClickAsset,
  stellarExpertUrl,
  isDiscoverySupported = false,
  onViewDetails,
}: SwapPickerSectionsProps) => {
  const { t } = useTranslation();
  const [verifiedSheetOpen, setVerifiedSheetOpen] = useState(false);
  const [unverifiedSheetOpen, setUnverifiedSheetOpen] = useState(false);

  const isSearching = searchTerm.trim().length > 0;

  // Exclude hidden canonicals (the other side's asset) from the discover
  // sections. "Your tokens" is intentionally NOT filtered — every held token
  // should stay visible even when it is already selected on the other side.
  const hidden = new Set(hiddenAssets.map(swapIdentityKey));
  const isShown = (r: SwapTokenRecord) =>
    !hidden.has(swapIdentityKey(r.canonical));
  const yourTokens = result.yourTokens;
  const popular = result.popular.filter(isShown);
  const verified = result.verified.filter(isShown);
  const unverified = result.unverified.filter(isShown);

  // The info button at the end of a row opens the token's details. The row
  // body still selects.
  const renderInfoButton = (
    r: SwapTokenRecord,
    code: string,
    source: PickerSource,
  ) =>
    onViewDetails ? (
      <button
        type="button"
        className="SwapPickerSections__info"
        data-testid={`SwapTokenRow-${code}-view-details`}
        aria-label={t("View details")}
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails(r, source);
        }}
      >
        <Icon.InfoCircle />
      </button>
    ) : null;

  // Held "Your tokens" rows use BalanceRow, matching the account-home balances
  // list, divided like it but with no line after the last row, where the next
  // section's header starts. The info button sits outside the row so the
  // divider ends before it.
  const renderBalanceRows = (
    records: SwapTokenRecord[],
    source: PickerSource,
  ) =>
    records.map((r, index) => {
      const code = r.code ?? "";
      const row = (
        <BalanceRow
          key={r.canonical}
          data-testid={`SwapTokenRow-${code}`}
          code={code}
          issuerKey={r.issuer}
          iconUrl={r.image ?? r.icon ?? undefined}
          amount={r.tokenAmount ?? "0"}
          fiatAmount={r.fiatValue ?? null}
          percentChange={r.percentChange24h ?? null}
          hasDivider={index < records.length - 1}
          onClick={() =>
            onClickAsset(r.canonical, r.isContract, buildSelection(r, source))
          }
        />
      );
      const info = renderInfoButton(r, code, source);
      return info ? (
        <div key={r.canonical} className="SwapPickerSections__row">
          {row}
          {info}
        </div>
      ) : (
        row
      );
    });

  // Non-held discover rows (Popular / Verified / Unverified) use the shared
  // AssetListRow. On the right: the info button while details are offered,
  // otherwise the overflow menu (copy address, stellar.expert).
  const renderDiscoverRows = (
    records: SwapTokenRecord[],
    source: PickerSource,
  ) =>
    records.map((r) => {
      const code = r.code ?? "";
      const isSuspicious =
        r.securityLevel === SecurityLevel.MALICIOUS ||
        r.securityLevel === SecurityLevel.SUSPICIOUS;
      const isMalicious = r.securityLevel === SecurityLevel.MALICIOUS;
      return (
        <AssetListRow
          key={r.canonical}
          data-testid={`SwapTokenRow-${code}`}
          bodyTestId={`SwapTokenRow-${code}-body`}
          code={code}
          issuer={r.issuer}
          // A contract token shows its contract ID, so a lookalike of a
          // known token still looks different.
          domain={r.isContract ? truncateString(r.issuer ?? "") : r.domain}
          iconUrl={r.image ?? r.icon ?? undefined}
          isSuspicious={isSuspicious}
          isMalicious={isMalicious}
          onClick={() =>
            onClickAsset(r.canonical, r.isContract, buildSelection(r, source))
          }
          rightElement={
            onViewDetails && r.issuer ? (
              renderInfoButton(r, code, source)
            ) : (
              <SwapTokenMenu
                code={code}
                issuerKey={r.issuer}
                stellarExpertUrl={stellarExpertUrl}
              />
            )
          }
        />
      );
    });

  const hasResults = isSearching
    ? yourTokens.length + verified.length + unverified.length > 0
    : (result.isNewAccount ? 0 : yourTokens.length) + popular.length > 0;

  return (
    <div className="SwapPickerSections" data-testid="swap-picker-sections">
      {result.isFallback && isDiscoverySupported && (
        <div
          className="SwapPickerSections__notice"
          data-testid="swap-picker-fallback-notice"
        >
          <Notification
            variant="warning"
            title={t(
              "Token discovery is temporarily unavailable. You can still swap between tokens you already hold.",
            )}
          />
        </div>
      )}

      {!hasResults ? (
        isSearching ? (
          <div
            className="SwapPickerSections__empty"
            data-testid="swap-picker-empty"
          >
            {t("No tokens match {{term}}", { term: searchTerm })}
          </div>
        ) : null
      ) : (
        <>
          {!result.isNewAccount && yourTokens.length > 0 && (
            <>
              <div
                className="SwapPickerSections__header"
                data-testid="swap-section-your-tokens"
              >
                {t("Your tokens")}
              </div>
              {renderBalanceRows(yourTokens, "balances")}
            </>
          )}

          {!isSearching && popular.length > 0 && (
            <>
              <div
                className="SwapPickerSections__header"
                data-testid="swap-section-popular"
              >
                {t("Popular tokens")}
              </div>
              {renderDiscoverRows(popular, "popular")}
            </>
          )}

          {isSearching && verified.length > 0 && (
            <>
              <button
                type="button"
                className="SwapPickerSections__header SwapPickerSections__header--button"
                data-testid="swap-section-verified-info"
                aria-label={t("About verified tokens")}
                onClick={() => setVerifiedSheetOpen(true)}
              >
                <span data-testid="swap-section-verified">{t("Verified")}</span>
                <span className="SwapPickerSections__header__info">
                  <Icon.InfoCircle />
                </span>
              </button>
              {renderDiscoverRows(verified, "search")}
            </>
          )}

          {isSearching && unverified.length > 0 && (
            <>
              <button
                type="button"
                className="SwapPickerSections__header SwapPickerSections__header--button"
                data-testid="swap-section-unverified-info"
                aria-label={t("About unverified tokens")}
                onClick={() => setUnverifiedSheetOpen(true)}
              >
                <span data-testid="swap-section-unverified">
                  {t("Unverified")}
                </span>
                <span className="SwapPickerSections__header__info">
                  <Icon.InfoCircle />
                </span>
              </button>
              {renderDiscoverRows(unverified, "search")}
            </>
          )}
        </>
      )}

      <VerifiedTokenInfoSheet
        isOpen={verifiedSheetOpen}
        onClose={() => setVerifiedSheetOpen(false)}
      />
      <UnverifiedTokenInfoSheet
        isOpen={unverifiedSheetOpen}
        onClose={() => setUnverifiedSheetOpen(false)}
      />
    </div>
  );
};
