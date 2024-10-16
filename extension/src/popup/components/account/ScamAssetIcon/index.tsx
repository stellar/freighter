import React from "react";
import IconWarning from "popup/assets/icon-warning-asset-blockaid.svg";
import "./styles.scss";

export const ScamAssetIcon = ({ isScamAsset }: { isScamAsset: boolean }) =>
  isScamAsset ? (
    <span className="ScamAssetIcon" data-testid="ScamAssetIcon">
      {isScamAsset && <img src={IconWarning} alt="warning" />}
    </span>
  ) : null;
