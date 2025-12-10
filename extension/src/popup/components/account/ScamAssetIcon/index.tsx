import React from "react";
import { useTranslation } from "react-i18next";
import IconWarning from "popup/assets/icon-warning-asset-blockaid.svg";
import "./styles.scss";

export const ScamAssetIcon = ({ isScamAsset }: { isScamAsset: boolean }) => {
  const { t } = useTranslation();
  return isScamAsset ? (
    <span className="ScamAssetIcon" data-testid="ScamAssetIcon">
      {isScamAsset && <img src={IconWarning} alt={t("warning")} />}
    </span>
  ) : null;
};
