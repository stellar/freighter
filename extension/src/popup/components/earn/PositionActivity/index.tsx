import React, { useState } from "react";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";

import { AssetIcons } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { AssetIcon } from "popup/components/account/AccountAssets";
import {
  EarnDepositDetailsSheet,
  EarnDetailsType,
} from "popup/components/earn/EarnDepositDetailsSheet";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { SlideupModal } from "popup/components/SlideupModal";
import { formatActivityDate } from "popup/components/earn/helpers/formatActivityDate";
import { formatEarnAmount } from "popup/components/earn/helpers/formatEarnAmount";
import {
  trackPositionActivityDetailsActionSelected,
  trackPositionActivityRowSelected,
} from "popup/metrics/positions";
import {
  PositionActivityItem,
  PositionActivityType,
} from "popup/components/earn/helpers/positionActivity";

import { usePositionActivity } from "./hooks/usePositionActivity";

import "./styles.scss";

/** How a row presents its event type. */
interface ActivityKind {
  label: (t: TFunction) => string;
  /** "+" for money into the position, "-" for money out. */
  sign: "+" | "-" | "";
  /** Deposits read green, as drawn; withdrawals keep the secondary color. */
  isPositive: boolean;
  /** The details sheet a tap opens; a kind without one is not tappable. */
  detailsType?: EarnDetailsType;
}

/**
 * The registry from an item's `type` to its row. A type no entry knows yet
 * renders through `GENERIC_KIND`, so new protocol events show up without a
 * client change; they just read less specifically until one is added here.
 */
const ACTIVITY_KINDS: Record<string, ActivityKind> = {
  [PositionActivityType.DEPOSIT]: {
    label: (t) => t("Deposit"),
    sign: "+",
    isPositive: true,
    detailsType: "deposit",
  },
  [PositionActivityType.WITHDRAW]: {
    label: (t) => t("Withdraw"),
    sign: "-",
    isPositive: false,
    detailsType: "withdraw",
  },
};

const GENERIC_KIND: ActivityKind = {
  label: (t) => t("Activity"),
  sign: "",
  isPositive: false,
};

/** The protocol's site, shown under each row's title. */
const PROTOCOL_SITES: Record<PositionActivityItem["protocol"], string> = {
  blend: "blend.capital",
};

interface PositionActivityProps {
  poolId: string;
  assetId: string;
  code: string;
  issuer?: string;
  /** The token's decimals, to scale the items' integer amounts. */
  decimals: number;
  assetIcons: AssetIcons;
  /** The pool's backend name, for the details sheet. */
  poolName?: string | null;
  networkDetails: NetworkDetails;
}

/**
 * The Activity list on a supplied token's position screen (Figma Varial
 * 4470:113064): each deposit and withdrawal, newest first.
 *
 * A deposit or withdrawal opens its details sheet (Figma Varial 4478:115461,
 * 4478:116412), the one the deposit flow shows after a deposit, so the
 * transaction's date, fee and full breakdown are a tap away.
 *
 * Renders nothing until there is something to list. The interim source only
 * reaches the account's latest operations, so an empty result does not mean
 * the position has no history; the design has no empty state to say so.
 */
export const PositionActivity = ({
  poolId,
  assetId,
  code,
  issuer,
  decimals,
  assetIcons,
  poolName,
  networkDetails,
}: PositionActivityProps) => {
  const { t, i18n } = useTranslation();
  const items = usePositionActivity({ poolId, assetId });
  const language = i18n.resolvedLanguage || i18n.language;
  const [selected, setSelected] = useState<PositionActivityItem | null>(null);
  const selectedType = selected
    ? ACTIVITY_KINDS[selected.type]?.detailsType
    : undefined;

  if (!items?.length) {
    return null;
  }

  // The items carry integer amounts in the token's smallest unit.
  const toTokens = (item: PositionActivityItem) =>
    new BigNumber(item.amount).shiftedBy(-decimals).toFixed();

  // What every Activity event reports about the row it came from.
  const eventProps = (item: PositionActivityItem) => ({
    poolId,
    protocol: item.protocol,
    assetCode: code,
    activityType: item.type,
  });

  return (
    <div className="PositionActivity" data-testid="position-activity">
      <div className="PositionActivity__title">{t("Activity")}</div>
      <div className="PositionActivity__list">
        {items.map((item) => {
          const kind = ACTIVITY_KINDS[item.type] ?? GENERIC_KIND;
          const amount = formatEarnAmount(toTokens(item));
          // A button only where a tap leads somewhere.
          const Row = kind.detailsType ? "button" : "div";

          return (
            <Row
              className={`PositionActivity__row${
                kind.detailsType ? " PositionActivity__row--tappable" : ""
              }`}
              key={item.id}
              data-testid="position-activity-row"
              {...(kind.detailsType
                ? {
                    type: "button" as const,
                    onClick: () => {
                      trackPositionActivityRowSelected(eventProps(item));
                      setSelected(item);
                    },
                  }
                : {})}
            >
              <div className="PositionActivity__icon">
                <div className="PositionActivity__icon__token">
                  <AssetIcon
                    assetIcons={assetIcons}
                    code={code}
                    issuerKey={issuer}
                  />
                </div>
                <div className="PositionActivity__icon__badge">
                  <PoolIcon protocol={item.protocol} size={16} />
                </div>
              </div>
              <div className="PositionActivity__main">
                <div className="PositionActivity__label">{kind.label(t)}</div>
                <div className="PositionActivity__site">
                  {PROTOCOL_SITES[item.protocol]}
                </div>
              </div>
              <div className="PositionActivity__figures">
                <div
                  className={`PositionActivity__amount${
                    kind.isPositive ? " PositionActivity__amount--positive" : ""
                  }`}
                >
                  {`${kind.sign}${amount} ${code}`}
                </div>
                <div className="PositionActivity__date">
                  {formatActivityDate(item.occurredAt, language)}
                </div>
              </div>
            </Row>
          );
        })}
      </div>

      <SlideupModal
        isModalOpen={Boolean(selected && selectedType)}
        setIsModalOpen={(isOpen) => !isOpen && setSelected(null)}
        ariaLabel={
          selectedType === "withdraw"
            ? t("Withdrew {{code}}", { code })
            : t("Deposited {{code}}", { code })
        }
      >
        {selected && selectedType ? (
          <EarnDepositDetailsSheet
            // A fresh sheet per event: its Horizon read is keyed on the hash.
            key={selected.id}
            type={selectedType}
            amount={toTokens(selected)}
            assetCode={code}
            assetIssuer={issuer}
            assetIcons={assetIcons}
            poolName={poolName}
            transactionHash={selected.txHash}
            occurredAt={selected.occurredAt}
            networkDetails={networkDetails}
            onClose={() => setSelected(null)}
            onAction={(action) =>
              trackPositionActivityDetailsActionSelected({
                ...eventProps(selected),
                action,
              })
            }
          />
        ) : (
          <></>
        )}
      </SlideupModal>
    </div>
  );
};
