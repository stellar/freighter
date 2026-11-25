import React from "react";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";

import { AssetIcons } from "@shared/api/types";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { formatActivityDate } from "popup/components/earn/helpers/formatActivityDate";
import { formatEarnAmount } from "popup/components/earn/helpers/formatEarnAmount";
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
  },
  [PositionActivityType.WITHDRAW]: {
    label: (t) => t("Withdraw"),
    sign: "-",
    isPositive: false,
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
}

/**
 * The Activity list on a supplied token's position screen (Figma Varial
 * 4470:113064): each deposit and withdrawal, newest first.
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
}: PositionActivityProps) => {
  const { t, i18n } = useTranslation();
  const items = usePositionActivity({ poolId, assetId });
  const language = i18n.resolvedLanguage || i18n.language;

  if (!items?.length) {
    return null;
  }

  return (
    <div className="PositionActivity" data-testid="position-activity">
      <div className="PositionActivity__title">{t("Activity")}</div>
      <div className="PositionActivity__list">
        {items.map((item) => {
          const kind = ACTIVITY_KINDS[item.type] ?? GENERIC_KIND;
          const amount = formatEarnAmount(
            new BigNumber(item.amount).shiftedBy(-decimals).toFixed(),
          );

          return (
            <div
              className="PositionActivity__row"
              key={item.id}
              data-testid="position-activity-row"
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
