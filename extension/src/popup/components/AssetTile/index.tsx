import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { AssetIcon } from "popup/components/account/AccountAssets";
import { SelectionTile } from "popup/components/SelectionTile";

interface AssetTileProps {
  asset: {
    code: string;
    canonical: string;
    issuer: string;
  } | null;
  assetIcon: string | null;
  balance?: string;
  isSuspicious: boolean;
  onClick: () => void;
  emptyLabel?: string;
  emptySubtext?: string;
  testId?: string;
}

export const AssetTile = ({
  asset,
  assetIcon,
  balance,
  isSuspicious,
  onClick,
  emptyLabel,
  emptySubtext,
  testId,
}: AssetTileProps) => {
  const { t } = useTranslation();

  if (asset) {
    return (
      <SelectionTile
        icon={
          <AssetIcon
            assetIcons={
              asset.canonical !== "native"
                ? { [asset.canonical]: assetIcon }
                : {}
            }
            code={asset.code}
            issuerKey={asset.issuer}
            icon={assetIcon}
            isSuspicious={isSuspicious}
          />
        }
        primaryText={asset.code}
        secondaryText={balance}
        onClick={onClick}
        shouldUseIconWrapper={false}
        testId={testId}
      />
    );
  }

  return (
    <SelectionTile
      icon={<Icon.Activity />}
      primaryText={emptyLabel || t("Select asset")}
      secondaryText={emptySubtext || t("Choose Asset")}
      onClick={onClick}
      isEmpty
      testId={testId}
    />
  );
};
