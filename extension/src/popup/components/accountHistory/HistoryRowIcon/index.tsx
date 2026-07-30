import React, { useState } from "react";
import { Icon } from "@stellar/design-system";

import {
  ResolvedToken,
  RowIconDescriptor,
} from "popup/views/AccountHistory/model";
import StellarLogo from "popup/assets/stellar-logo.png";
import ImageMissingIcon from "popup/assets/image-missing.svg?react";

import "./styles.scss";

/**
 * Renders the leading icon of a redesigned (v2) history row / detail header
 * purely from a RowIconDescriptor. It performs no data fetching — token icons,
 * protocol logos, etc. are resolved upstream (tokenResolver + mappers) and
 * passed in as data.
 */

const isXlm = (token: ResolvedToken) =>
  token.code === "XLM" && token.issuer === null;

/** A single circular token icon: image, XLM logo, or a lettered fallback. */
const TokenIcon = ({ token }: { token: ResolvedToken }) => {
  const [hasError, setHasError] = useState(false);
  const src = isXlm(token) ? StellarLogo : token.icon;

  if (src && !hasError) {
    return (
      <div
        className="HistoryRowIcon__token"
        data-testid="history-row-icon-token"
      >
        <img src={src} alt={token.code} onError={() => setHasError(true)} />
      </div>
    );
  }

  if (token.code) {
    return (
      <div
        className="HistoryRowIcon__token HistoryRowIcon__token--letter"
        data-testid="history-row-icon-token"
      >
        <span>{token.code.slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <div className="HistoryRowIcon__token" data-testid="history-row-icon-token">
      <ImageMissingIcon />
    </div>
  );
};

/** A circular icon wrapper for the non-asset (glyph) descriptor variants. */
const GlyphIcon = ({
  variant,
  children,
}: {
  variant: string;
  children: React.ReactNode;
}) => (
  <div
    className={`HistoryRowIcon__glyph HistoryRowIcon__glyph--${variant}`}
    data-testid={`history-row-icon-${variant}`}
  >
    {children}
  </div>
);

const AssetIcons = ({ tokens }: { tokens: ResolvedToken[] }) => {
  // no tokens resolved — fall back to the generic contract glyph
  if (tokens.length === 0) {
    return (
      <GlyphIcon variant="contract">
        <Icon.FileCode02 />
      </GlyphIcon>
    );
  }

  // single token
  if (tokens.length === 1) {
    return (
      <div className="HistoryRowIcon HistoryRowIcon--single">
        <TokenIcon token={tokens[0]} />
      </div>
    );
  }

  // swap pair — two overlapping icons
  if (tokens.length === 2) {
    return (
      <div className="HistoryRowIcon HistoryRowIcon--pair">
        <TokenIcon token={tokens[0]} />
        <TokenIcon token={tokens[1]} />
      </div>
    );
  }

  // 3+ tokens — stack the first two and show a "+N" badge for the remainder
  const extra = tokens.length - 2;
  return (
    <div className="HistoryRowIcon HistoryRowIcon--stacked">
      <TokenIcon token={tokens[0]} />
      <TokenIcon token={tokens[1]} />
      <div
        className="HistoryRowIcon__badge"
        data-testid="history-row-icon-badge"
      >
        +{extra}
      </div>
    </div>
  );
};

export const HistoryRowIcon = ({ icon }: { icon: RowIconDescriptor }) => {
  switch (icon.type) {
    case "asset":
      return <AssetIcons tokens={icon.tokens} />;

    case "protocol":
      return (
        <div className="HistoryRowIcon HistoryRowIcon--single">
          <div
            className="HistoryRowIcon__protocol"
            data-testid="history-row-icon-protocol"
          >
            <img src={icon.src} alt={icon.name} />
          </div>
        </div>
      );

    case "contract":
      return (
        <GlyphIcon variant="contract">
          <Icon.FileCode02 />
        </GlyphIcon>
      );

    case "settings": {
      const settingsGlyphs = {
        signer: <Icon.Key01 />,
        threshold: <Icon.ShieldTick />,
        data: <Icon.Database01 />,
        domain: <Icon.Globe02 />,
        flag: <Icon.Flag01 />,
        reserve: <Icon.Coins01 />,
        generic: <Icon.Settings04 />,
      };
      return (
        <GlyphIcon variant="settings">
          {settingsGlyphs[icon.glyph] ?? <Icon.Settings04 />}
        </GlyphIcon>
      );
    }

    case "failed":
      return (
        <GlyphIcon variant="failed">
          <Icon.AlertCircle />
        </GlyphIcon>
      );

    case "account":
      return (
        <GlyphIcon variant={`account-${icon.variant}`}>
          {icon.variant === "create" ? <Icon.UserPlus01 /> : <Icon.UserX01 />}
        </GlyphIcon>
      );

    default:
      return null;
  }
};
