import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon, Notification } from "@stellar/design-system";

import { SwapTokenRow } from "../SwapTokenRow";
import {
  VerifiedTokenInfoSheet,
  UnverifiedTokenInfoSheet,
} from "../InfoSheets";
import type { SwapTokenRecord } from "../hooks/useSwapTokenLookup";

import "./styles.scss";

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
  onClickAsset: (canonical: string, isContract: boolean) => void;
  stellarExpertUrl: string;
}

export const SwapPickerSections = ({
  result,
  searchTerm,
  onClickAsset,
  stellarExpertUrl,
}: SwapPickerSectionsProps) => {
  const { t } = useTranslation();
  const [verifiedSheetOpen, setVerifiedSheetOpen] = useState(false);
  const [unverifiedSheetOpen, setUnverifiedSheetOpen] = useState(false);

  const isSearching = searchTerm.trim().length > 0;

  const renderRows = (records: SwapTokenRecord[]) =>
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
        onClick={() => onClickAsset(r.canonical, r.isContract)}
      />
    ));

  const hasResults = isSearching
    ? result.yourTokens.length +
        result.verified.length +
        result.unverified.length >
      0
    : (result.isNewAccount ? 0 : result.yourTokens.length) +
        result.popular.length >
      0;

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
          {!result.isNewAccount && result.yourTokens.length > 0 && (
            <>
              <div
                className="SwapPickerSections__header"
                data-testid="swap-section-your-tokens"
              >
                {t("Your tokens")}
              </div>
              {renderRows(result.yourTokens)}
            </>
          )}

          {!isSearching && result.popular.length > 0 && (
            <>
              <div
                className="SwapPickerSections__header"
                data-testid="swap-section-popular"
              >
                {t("Popular tokens")}
              </div>
              {renderRows(result.popular)}
            </>
          )}

          {isSearching && result.verified.length > 0 && (
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
              {renderRows(result.verified)}
            </>
          )}

          {isSearching && result.unverified.length > 0 && (
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
              {renderRows(result.unverified)}
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
