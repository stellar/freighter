import React from "react";
import { useTranslation } from "react-i18next";
import IconWarning from "popup/assets/icon-warning-asset-blockaid.svg?react";
import "./styles.scss";

export const ScamAssetIcon = ({
  isScamAsset,
  isMalicious = true,
}: {
  isScamAsset: boolean;
  // Colors the badge by verdict: red for malicious, amber for suspicious.
  // Defaults to malicious (red) so callers that only know "flagged" stay red.
  isMalicious?: boolean;
}) => {
  const { t } = useTranslation();

  if (!isScamAsset) {
    return null;
  }

  return (
    <span
      className={`ScamAssetIcon ScamAssetIcon--${
        isMalicious ? "malicious" : "suspicious"
      }`}
      data-testid="ScamAssetIcon"
      aria-label={t("warning")}
    >
      <IconWarning />
    </span>
  );
};
