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
  PoolFrozenBanner,
  PoolFrozenSheet,
} from "popup/components/earn/PoolFrozenBanner";
import { StatRow } from "popup/components/earn/StatRow";
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

import { NO_FIAT_VALUE } from "popup/helpers/formatters";

import { EarnLeafIcon } from "./PositionIcons";
import { PositionFigures, PositionTokenLine, Section } from "./PositionParts";
import { PositionTabs } from "./PositionTabs";
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
   * The pool is frozen: Deposit stays in view but disabled, under a banner
   * that says why. Only read where Deposit is offered.
   */
  isPoolFrozen?: boolean;
  onClose: () => void;
  onDeposit: () => void;
  /** Fires on a tap that changes the tab, never on mount. */
  onTabChange: (tab: PoolDetailsTab) => void;
  /** Fires when the frozen banner's tap opens its sheet. */
  onFrozenInfoOpen?: () => void;
}

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
  isPoolFrozen = false,
  onClose,
  onDeposit,
  onTabChange,
  onFrozenInfoOpen,
}: TokenPositionScreenProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<PoolDetailsTab>("your_position");
  const [isFrozenSheetOpen, setIsFrozenSheetOpen] = useState(false);
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
              disabled={isPoolFrozen}
              data-testid="token-position-deposit"
            >
              {t("Deposit")}
            </Button>
          ) : undefined
        }
      >
        <div className="PositionScreen" data-testid="token-position-screen">
          <PositionFigures
            mark={tokenIcon}
            totalUsd={summary.currentBalanceUsd}
            gain={gain}
            gainValue={interestUsd}
            testIdPrefix="token-position"
          />

          {canDeposit && isPoolFrozen && (
            <>
              <PoolFrozenBanner
                onOpen={() => {
                  setIsFrozenSheetOpen(true);
                  onFrozenInfoOpen?.();
                }}
              />
              <PoolFrozenSheet
                isOpen={isFrozenSheetOpen}
                onClose={() => setIsFrozenSheetOpen(false)}
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
                <PositionTokenLine
                  icon={tokenIcon}
                  code={row.code}
                  value={formatAccountUsd(deposit?.usd ?? null)}
                  valueTestId={`earn-position-deposit-usd-${row.code}`}
                  amount={`${formatEarnAmount(deposit?.tokens ?? "0")} ${
                    row.code
                  }`}
                />
              </Section>

              <Section title={t("Your earnings")}>
                <div className="PositionScreen__card PositionScreen__earnings">
                  <PositionTokenLine
                    isCard={false}
                    icon={
                      <span className="PositionScreen__earning-mark">
                        {tokenIcon}
                        <span className="PositionScreen__earning-mark__badge">
                          <EarnLeafIcon />
                        </span>
                      </span>
                    }
                    code={row.code}
                    subtitle={t("{{rate}} Deposit APY", {
                      rate: formatRate(summary.apy),
                    })}
                    value={
                      formatPositionGain(interestUsd, null) ?? NO_FIAT_VALUE
                    }
                    valueClassName={`PositionScreen__positive${getGainModifier(
                      "PositionScreen__positive",
                      interestUsd,
                    )}`}
                    valueTestId={`earn-position-earnings-usd-${row.code}`}
                    amount={`${formatEarnAmount(earning?.tokens ?? "0")} ${
                      row.code
                    }`}
                  />
                  <div className="PositionScreen__divider" />
                  {/* One group, so the rows' own divider and spacing apply
                      between them rather than the card's gap. */}
                  <div>
                    <StatRow
                      label={t("Est. monthly earnings")}
                      value={formatProjection(summary.estMonthlyUsd)}
                      testId="earn-position-est-monthly"
                    />
                    <StatRow
                      label={t("Est. yearly earnings")}
                      value={formatProjection(summary.estYearlyUsd)}
                      testId="earn-position-est-yearly"
                    />
                  </div>
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
