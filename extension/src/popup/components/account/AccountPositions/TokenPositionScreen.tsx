import React, { useState } from "react";
import { Button, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { AssetIcons } from "@shared/api/types";
import { PoolPosition } from "@shared/api/types/blend";
import { NetworkDetails } from "@shared/constants/stellar";
import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { PositionActivity } from "popup/components/earn/PositionActivity";
import {
  PoolPausedBanner,
  PoolPausedSheet,
} from "popup/components/earn/PoolPausedBanner";
import { formatProjection } from "popup/components/earn/EarnReview/helpers/projectEarnings";
import {
  formatAccountUsd,
  formatRate,
} from "popup/components/earn/helpers/formatPoolStats";
import { formatEarnAmount } from "popup/components/earn/helpers/formatEarnAmount";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";
import { getGainPercent } from "popup/components/earn/helpers/poolPositionSummary";
import { PositionTokenRow } from "popup/components/earn/helpers/positionRows";
import { getPositionSummary } from "popup/components/earn/helpers/positionSummary";
import { PoolDetailsTab } from "popup/constants/earn";
import { getBlendAppUrl } from "popup/constants/externalLinks";
import {
  getStellarExpertUrl,
  isStellarExpertSupported,
} from "popup/helpers/account";
import { openTab } from "popup/helpers/navigate";

import { EarnLeafIcon } from "./PositionIcons";
import { PositionTabs } from "./PositionTabs";
import { NO_FIAT_VALUE } from "popup/helpers/formatters";

import { formatPositionGain, getGainModifier } from "./positionFigures";

interface TokenPositionScreenProps {
  position: PoolPosition;
  /** The supplied token this screen is about. */
  row: PositionTokenRow;
  assetIcons: AssetIcons;
  networkDetails: NetworkDetails;
  /** Deposit is offered (flag and network); otherwise the footer is empty. */
  canDeposit: boolean;
  /**
   * The pool is frozen or still being set up: Deposit stays in view but
   * disabled, under a banner that says why. Only read where Deposit is offered.
   */
  isDepositPaused?: boolean;
  onClose: () => void;
  onDeposit: () => void;
  /** Fires on a tap that changes the tab, never on mount. */
  onTabChange: (tab: PoolDetailsTab) => void;
}

/** A section's small grey heading over its content. */
const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="PositionScreen__section">
    <div className="PositionScreen__section-title">{title}</div>
    {children}
  </div>
);

/** One "label  value" line inside the earnings card. */
const EstimateLine = ({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) => (
  <div className="PositionScreen__estimate">
    <span className="PositionScreen__estimate__label">{label}</span>
    <span className="PositionScreen__primary" data-testid={testId}>
      {value}
    </span>
  </div>
);

/**
 * One supplied token's position (Figma Varial 4470:113013 and 4470:113073):
 * what it is worth and has earned, then a "Your position" tab with deposits,
 * earnings and activity, and an "Overview" tab about the pool.
 *
 * Deposits are principal and earnings are interest, so the two always add up
 * to the balance at the top (Q2). Withdraw is not offered yet.
 */
export const TokenPositionScreen = ({
  position,
  row,
  assetIcons,
  networkDetails,
  canDeposit,
  isDepositPaused = false,
  onClose,
  onDeposit,
  onTabChange,
}: TokenPositionScreenProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<PoolDetailsTab>("your_position");
  const [isPausedSheetOpen, setIsPausedSheetOpen] = useState(false);
  const summary = getPositionSummary({
    position,
    focusedAssetId: row.assetId,
    networkDetails,
  });
  const deposit = summary.deposits[0] ?? null;
  const earning = summary.earnings[0] ?? null;
  const interestUsd = earning?.usd ?? null;
  const gain = formatPositionGain(
    interestUsd,
    getGainPercent(summary.currentBalanceUsd, interestUsd),
  );
  const poolName = formatPoolName(position.name, t);

  const tokenIcon = (
    <AssetIcon assetIcons={assetIcons} code={row.code} issuerKey={row.issuer} />
  );

  return (
    <View>
      <SubviewHeader
        title={t("{{tokenCode}} position", { tokenCode: row.code })}
        customBackIcon={<Icon.X />}
        customBackAction={onClose}
      />
      <View.Content
        hasNoTopPadding
        contentFooter={
          canDeposit ? (
            <Button
              size="md"
              variant="secondary"
              isFullWidth
              isRounded
              onClick={onDeposit}
              disabled={isDepositPaused}
              data-testid="token-position-deposit"
            >
              {t("Deposit")}
            </Button>
          ) : undefined
        }
      >
        <div className="PositionScreen" data-testid="token-position-screen">
          <div className="PositionScreen__figures">
            <div className="PositionScreen__token-mark">{tokenIcon}</div>
            <div
              className="PositionScreen__total"
              data-testid="token-position-total"
            >
              {formatAccountUsd(summary.currentBalanceUsd)}
            </div>
            <div
              className={`PositionScreen__gain${getGainModifier(
                "PositionScreen__gain",
                interestUsd,
              )}`}
              data-testid="token-position-gain"
            >
              {gain ?? NO_FIAT_VALUE}
            </div>
          </div>

          {canDeposit && isDepositPaused && (
            <>
              <PoolPausedBanner onOpen={() => setIsPausedSheetOpen(true)} />
              <PoolPausedSheet
                isOpen={isPausedSheetOpen}
                onClose={() => setIsPausedSheetOpen(false)}
                poolName={position.name}
              />
            </>
          )}

          <PositionTabs
            active={tab}
            onSelect={(next) => {
              setTab(next);
              onTabChange(next);
            }}
          />

          {tab === "your_position" ? (
            <>
              <Section title={t("Your deposits")}>
                <div className="PositionScreen__card PositionScreen__token">
                  {tokenIcon}
                  <span className="PositionScreen__token__name">
                    <span className="PositionScreen__primary">{row.code}</span>
                  </span>
                  <span className="PositionScreen__token__figures">
                    <span
                      className="PositionScreen__primary"
                      data-testid={`earn-position-deposit-usd-${row.code}`}
                    >
                      {formatAccountUsd(deposit?.usd ?? null)}
                    </span>
                    <span className="PositionScreen__secondary-small">
                      {`${formatEarnAmount(deposit?.tokens ?? "0")} ${
                        row.code
                      }`}
                    </span>
                  </span>
                </div>
              </Section>

              <Section title={t("Your earnings")}>
                <div className="PositionScreen__card PositionScreen__earnings">
                  <div className="PositionScreen__token">
                    <span className="PositionScreen__earning-mark">
                      {tokenIcon}
                      <span className="PositionScreen__earning-mark__badge">
                        <EarnLeafIcon />
                      </span>
                    </span>
                    <span className="PositionScreen__token__name">
                      <span className="PositionScreen__primary">
                        {row.code}
                      </span>
                      <span className="PositionScreen__positive-small">
                        {t("{{rate}} Deposit APY", {
                          rate: formatRate(summary.apy),
                        })}
                      </span>
                    </span>
                    <span className="PositionScreen__token__figures">
                      <span
                        className={`PositionScreen__positive${getGainModifier(
                          "PositionScreen__positive",
                          interestUsd,
                        )}`}
                        data-testid={`earn-position-earnings-usd-${row.code}`}
                      >
                        {formatPositionGain(interestUsd, null) ?? NO_FIAT_VALUE}
                      </span>
                      <span className="PositionScreen__secondary-small">
                        {`${formatEarnAmount(earning?.tokens ?? "0")} ${
                          row.code
                        }`}
                      </span>
                    </span>
                  </div>
                  <div className="PositionScreen__divider" />
                  <EstimateLine
                    label={t("Est. monthly earnings")}
                    value={formatProjection(summary.estMonthlyUsd)}
                    testId="earn-position-est-monthly"
                  />
                  <div className="PositionScreen__divider" />
                  <EstimateLine
                    label={t("Est. yearly earnings")}
                    value={formatProjection(summary.estYearlyUsd)}
                    testId="earn-position-est-yearly"
                  />
                </div>
              </Section>

              <PositionActivity
                poolId={position.id}
                assetId={row.assetId}
                code={row.code}
                issuer={row.issuer}
                decimals={row.decimals}
                assetIcons={assetIcons}
                poolName={position.name}
                networkDetails={networkDetails}
              />
            </>
          ) : (
            <div
              className="PositionScreen__overview"
              data-testid="token-position-overview"
            >
              <Section title={t("About this pool")}>
                <div className="PositionScreen__body">
                  {t(
                    "Deposit supported tokens into Blend's {{pool}} to earn variable yield from lending. APY may change over time based on market conditions.",
                    { pool: poolName, interpolation: { escapeValue: false } },
                  )}
                </div>
              </Section>

              <Section title={t("Provider")}>
                <div className="PositionScreen__provider-row">
                  <PoolIcon size={40} />
                  {/* Blend's name, not copy: the same in every language. */}
                  <span className="PositionScreen__primary">Blend</span>
                </div>
              </Section>

              <Section title={t("How funds are managed")}>
                <div className="PositionScreen__body">
                  {t(
                    "Your tokens are supplied to Blend's lending pool, where borrowers can access liquidity by providing collateral. Interest earned depends on borrowing activity and pool utilization.",
                  )}
                </div>
              </Section>

              <Section title={t("Risks")}>
                <div className="PositionScreen__body">
                  {t(
                    "Depositing tokens involves smart contract, liquidation, and liquidity risks. Returns are not guaranteed, and withdrawals depend on available pool liquidity.",
                  )}
                </div>
              </Section>

              <Section title={t("Links")}>
                <div className="PositionScreen__links">
                  <button
                    type="button"
                    className="PositionScreen__link"
                    onClick={() =>
                      openTab(getBlendAppUrl(networkDetails.network))
                    }
                    data-testid="token-position-blend-link"
                  >
                    {t("View pool on Blend")}
                    <Icon.LinkExternal01 />
                  </button>
                  {isStellarExpertSupported(networkDetails) && (
                    <button
                      type="button"
                      className="PositionScreen__link"
                      onClick={() =>
                        openTab(
                          `${getStellarExpertUrl(networkDetails)}/contract/${
                            position.id
                          }`,
                        )
                      }
                      data-testid="token-position-explorer-link"
                    >
                      {t("View contract on Stellar Expert")}
                      <Icon.LinkExternal01 />
                    </button>
                  )}
                </div>
              </Section>
            </div>
          )}
        </div>
      </View.Content>
    </View>
  );
};
