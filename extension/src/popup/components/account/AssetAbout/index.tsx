import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { getTokenType, TokenType } from "popup/helpers/token";
import { truncateString } from "helpers/stellar";
import { InfoRow, InfoRowCard } from "popup/components/account/InfoRowCard";

interface AssetAboutProps {
  /** The balance's canonical token id: `native`, CODE:ISSUER, or
   * SYMBOL:CONTRACTID. */
  token: string;
  /** Already resolved by the detail sheet (useAssetDomain). */
  assetDomain?: string;
  /** Needed to tell XLM's own SAC apart from an ordinary contract token. */
  networkPassphrase: string;
}

/** Issuer / Type / Domain rows, no fetch. Rows without data are omitted. */
export const AssetAbout = ({
  token,
  assetDomain,
  networkPassphrase,
}: AssetAboutProps) => {
  const { t } = useTranslation();

  // Classification comes from the shared helper, not a local colon split, so
  // the Type row can never disagree with the `token_type` analytics dimension
  // (a bare `C…` id is a contract token even though it has no colon).
  const tokenType = getTokenType(token, networkPassphrase);
  const assetType = {
    native: t("Native"),
    classic: t("Stellar Classic"),
    soroban: t("Soroban"),
  }[tokenType];

  // Gate on the resolved type, not the id's shape: XLM's own SAC arrives as
  // `XLM:<contract id>` and has no issuer to show. Otherwise the issuer is
  // after the colon, or the bare contract id is its own issuer.
  const [, afterColon] = token.split(":");
  const issuer =
    tokenType === TokenType.Native
      ? ""
      : (afterColon ?? (tokenType === TokenType.Soroban ? token : ""));

  const rows: InfoRow[] = [];
  if (issuer) {
    rows.push({
      label: t("Issuer"),
      value: truncateString(issuer),
      testId: "AssetAbout__issuer",
    });
  }
  rows.push({
    label: t("Type"),
    value: assetType,
    testId: "AssetAbout__type",
  });
  // useAssetDomain returns a single space when there is no home domain.
  const domain = assetDomain?.trim();
  if (domain) {
    rows.push({
      label: t("Domain"),
      value: domain,
      testId: "AssetAbout__domain",
    });
  }

  return (
    <InfoRowCard
      testId="AssetAbout"
      icon={<Icon.InfoCircle />}
      title={t("About")}
      rows={rows}
    />
  );
};
