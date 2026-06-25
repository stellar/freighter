import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon, Notification } from "@stellar/design-system";

import { SwapTokenRow } from "../SwapTokenRow";
import { SwapTokenMenu } from "../SwapTokenMenu";
import {
  VerifiedTokenInfoSheet,
  UnverifiedTokenInfoSheet,
} from "../InfoSheets";
import { AssetListRow } from "popup/components/AssetListRow";
import { SecurityLevel } from "popup/constants/blockaid";
import type { SwapTokenRecord } from "../hooks/useSwapTokenLookup";
import type { SwapPickerSelection } from "../index";

import "./styles.scss";

/** Which picker section a clicked row came from (used for telemetry). */
type PickerSource = "balances" | "popular" | "search";

/**
 * Builds the destination descriptor passed up to the Swap view on pick.
 * `decimals` is 7 for classic Stellar assets.
 */
const buildSelection = (
  r: SwapTokenRecord,
  source: PickerSource,
): SwapPickerSelection => ({
  tokenCode: r.code ?? "",
  requiresTrustline: r.requiresTrustline,
  decimals: 7,
  issuer: r.issuer || undefined,
  securityLevel: r.securityLevel,
  iconUrl: r.image ?? r.icon ?? undefined,
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
  hadSorobanMatches: boolean;
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
}

export const SwapPickerSections = ({
  result,
  searchTerm,
  hiddenAssets = [],
  onClickAsset,
  stellarExpertUrl,
}: SwapPickerSectionsProps) => {
  const { t } = useTranslation();
  const [verifiedSheetOpen, setVerifiedSheetOpen] = useState(false);
  const [unverifiedSheetOpen, setUnverifiedSheetOpen] = useState(false);

  const isSearching = searchTerm.trim().length > 0;

  // Exclude hidden canonicals (the swap source asset) from every section.
  const hidden = new Set(hiddenAssets);
  const yourTokens = result.yourTokens.filter((r) => !hidden.has(r.canonical));
  const popular = result.popular.filter((r) => !hidden.has(r.canonical));
  const verified = result.verified.filter((r) => !hidden.has(r.canonical));
  const unverified = result.unverified.filter((r) => !hidden.has(r.canonical));

  // Held "Your tokens" rows still use SwapTokenRow (shows balance/value).
  const renderRows = (records: SwapTokenRecord[], source: PickerSource) =>
    records.map((r) => (
      <SwapTokenRow
        key={r.canonical}
        code={r.code ?? ""}
        issuerKey={r.issuer}
        domain={r.domain}
        // Both image and icon come from ManageAssetCurrency heritage; image is preferred
        iconUrl={r.image ?? r.icon ?? undefined}
        isHeld={r.isHeld}
        fiatValue={r.fiatValue}
        percentChange24h={r.percentChange24h}
        securityLevel={r.securityLevel}
        stellarExpertUrl={stellarExpertUrl}
        onClick={() =>
          onClickAsset(r.canonical, r.isContract, buildSelection(r, source))
        }
      />
    ));

  // Non-held discover rows (Popular / Verified / Unverified) use the shared
  // AssetListRow with an overflow menu on the right.
  const renderDiscoverRows = (
    records: SwapTokenRecord[],
    source: PickerSource,
  ) =>
    records.map((r) => {
      const code = r.code ?? "";
      const isSuspicious =
        r.securityLevel === SecurityLevel.MALICIOUS ||
        r.securityLevel === SecurityLevel.SUSPICIOUS;
      return (
        <AssetListRow
          key={r.canonical}
          data-testid={`SwapTokenRow-${code}`}
          bodyTestId={`SwapTokenRow-${code}-body`}
          code={code}
          issuer={r.issuer}
          domain={r.domain}
          iconUrl={r.image ?? r.icon ?? undefined}
          isSuspicious={isSuspicious}
          onClick={() =>
            onClickAsset(r.canonical, r.isContract, buildSelection(r, source))
          }
          rightElement={
            <SwapTokenMenu
              code={code}
              issuerKey={r.issuer}
              stellarExpertUrl={stellarExpertUrl}
            />
          }
        />
      );
    });

  const hasResults = isSearching
    ? yourTokens.length + verified.length + unverified.length > 0
    : (result.isNewAccount ? 0 : yourTokens.length) + popular.length > 0;

  return (
    <div className="SwapPickerSections" data-testid="swap-picker-sections">
      {result.isFallback && (
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
        result.hadSorobanMatches ? (
          <div
            className="SwapPickerSections__empty"
            data-testid="swap-picker-empty-soroban"
          >
            {t(
              "Soroban contract tokens aren't supported for swaps yet. Try searching for a Classic token instead.",
            )}
          </div>
        ) : isSearching ? (
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
              {renderRows(yourTokens, "balances")}
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
              <div className="SwapPickerSections__header">
                <span data-testid="swap-section-verified">{t("Verified")}</span>
                <button
                  type="button"
                  className="SwapPickerSections__header__info"
                  data-testid="swap-section-verified-info"
                  aria-label={t("About verified tokens")}
                  onClick={() => setVerifiedSheetOpen(true)}
                >
                  <Icon.InfoCircle />
                </button>
              </div>
              {renderDiscoverRows(verified, "search")}
            </>
          )}

          {isSearching && unverified.length > 0 && (
            <>
              <div className="SwapPickerSections__header">
                <span data-testid="swap-section-unverified">
                  {t("Unverified")}
                </span>
                <button
                  type="button"
                  className="SwapPickerSections__header__info"
                  data-testid="swap-section-unverified-info"
                  aria-label={t("About unverified tokens")}
                  onClick={() => setUnverifiedSheetOpen(true)}
                >
                  <Icon.InfoCircle />
                </button>
              </div>
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
