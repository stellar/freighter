import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";

import { SecurityLevel } from "popup/constants/blockaid";

import "./styles.scss";

/**
 * What the Blockaid assessment is about. Drives the banner copy:
 * - `tokenAggregate` — a swap/operation touching several tokens where any one
 *   may be flagged ("A token was flagged as …").
 * - `token` — a single specific token ("This token was flagged as …").
 * - `transaction` / `address` / `site` — the corresponding single entity.
 */
export type BlockaidEntity =
  | "token"
  | "tokenAggregate"
  | "transaction"
  | "address"
  | "site";

/**
 * Resolves the banner title from the flagged entity and its severity, matching
 * freighter-mobile's wording. UNABLE_TO_SCAN is a soft "proceed with caution"
 * (site has its own copy). SAFE never produces a title.
 */
export const getBlockaidBannerTitle = (
  t: TFunction,
  entity: BlockaidEntity,
  securityLevel: SecurityLevel,
): string => {
  if (securityLevel === SecurityLevel.UNABLE_TO_SCAN) {
    return entity === "site"
      ? t("Unable to scan site for malicious behavior")
      : t("Proceed with caution");
  }

  const isMalicious = securityLevel === SecurityLevel.MALICIOUS;

  switch (entity) {
    case "tokenAggregate":
      return isMalicious
        ? t("A token was flagged as malicious")
        : t("A token was flagged as suspicious");
    case "token":
      return isMalicious
        ? t("This token was flagged as malicious")
        : t("This token was flagged as suspicious");
    case "address":
      return isMalicious
        ? t("This address was flagged as malicious")
        : t("This address was flagged as suspicious");
    case "site":
      return isMalicious
        ? t("This site was flagged as malicious")
        : t("This site was flagged as suspicious");
    case "transaction":
    default:
      return isMalicious
        ? t("This transaction was flagged as malicious")
        : t("This transaction was flagged as suspicious");
  }
};

interface BlockaidBannerProps {
  securityLevel: SecurityLevel;
  entity: BlockaidEntity;
  onClick?: () => void;
  dataTestId?: string;
}

/**
 * The single reusable Blockaid warning banner. Filled style, colored by
 * severity (red for malicious, amber for suspicious / unable-to-scan), with a
 * chevron when it opens a detail sheet. Renders nothing for a SAFE verdict.
 */
export const BlockaidBanner = ({
  securityLevel,
  entity,
  onClick,
  dataTestId = "blockaid-banner",
}: BlockaidBannerProps) => {
  const { t } = useTranslation();

  if (securityLevel === SecurityLevel.SAFE) {
    return null;
  }

  const isMalicious = securityLevel === SecurityLevel.MALICIOUS;
  const variantClass = isMalicious
    ? "BlockaidBanner--malicious"
    : "BlockaidBanner--caution";

  return (
    <div
      className={`BlockaidBanner ${variantClass}`}
      data-testid={dataTestId}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="BlockaidBanner__info">
        <div className="BlockaidBanner__icon">
          <Icon.AlertSquare />
        </div>
        <span className="BlockaidBanner__message">
          {getBlockaidBannerTitle(t, entity, securityLevel)}
        </span>
      </div>
      {onClick ? (
        <div className="BlockaidBanner__action">
          <Icon.ChevronRight />
        </div>
      ) : null}
    </div>
  );
};
