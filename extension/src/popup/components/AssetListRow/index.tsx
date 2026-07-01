import React from "react";

import { AssetIcon } from "popup/components/account/AccountAssets";
import { formatDomain, getCanonicalFromAsset } from "helpers/stellar";
import { truncateString } from "helpers/stellar";

import "./styles.scss";

export interface AssetListRowProps {
  code: string;
  /** Label to show instead of `code` (e.g. a SAC token's name). Falls back to
   * `code`. `code`/`issuer` are still used for the icon/canonical. */
  displayCode?: string;
  issuer?: string;
  domain?: string | null;
  /** Icon URL (TOML image / stellar.expert). */
  iconUrl?: string | null;
  /** Renders the Blockaid scam badge on the icon when true. */
  isSuspicious?: boolean;
  /** Colors the badge red (malicious) vs amber (suspicious). Defaults to red. */
  isMalicious?: boolean;
  /** Slot rendered on the right of the row (e.g. an "Add" button or a menu). */
  rightElement?: React.ReactNode;
  /** Click handler for the row body (icon + code + domain). */
  onClick?: () => void;
  "data-testid"?: string;
  /** Optional testids that mirror legacy markup so existing tests keep working. */
  bodyTestId?: string;
  codeTestId?: string;
  domainTestId?: string;
}

/**
 * Shared presentational token-list row: icon + token code + domain subtitle on
 * the left, with a caller-provided element on the right. Used by the
 * Add-a-token flow ("Add +" button) and the Swap destination picker (menu).
 */
export const AssetListRow = ({
  code,
  displayCode,
  issuer = "",
  domain,
  iconUrl,
  isSuspicious = false,
  isMalicious = true,
  rightElement,
  onClick,
  "data-testid": dataTestId,
  bodyTestId,
  codeTestId,
  domainTestId,
}: AssetListRowProps) => {
  const canonical =
    code === "XLM" && !issuer ? "native" : getCanonicalFromAsset(code, issuer);
  const label = displayCode ?? code;
  const displayLabel = label.length > 20 ? truncateString(label) : label;

  return (
    <div className="AssetListRow" data-testid={dataTestId}>
      <div
        className="AssetListRow__body"
        data-testid={bodyTestId}
        onClick={onClick}
        role={onClick ? "button" : undefined}
      >
        <AssetIcon
          assetIcons={code !== "XLM" ? { [canonical]: iconUrl || "" } : {}}
          code={code}
          issuerKey={issuer}
          icon={iconUrl || undefined}
          isSuspicious={isSuspicious}
          isMalicious={isMalicious}
        />
        <div className="AssetListRow__info">
          <div className="AssetListRow__code" data-testid={codeTestId}>
            {displayLabel}
          </div>
          {domain ? (
            <div className="AssetListRow__domain" data-testid={domainTestId}>
              {formatDomain(domain)}
            </div>
          ) : null}
        </div>
      </div>
      {rightElement}
    </div>
  );
};
