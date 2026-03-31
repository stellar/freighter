import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { DiscoverData } from "@shared/api/types";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { TrendingCarousel } from "../TrendingCarousel";
import { DiscoverSection } from "../DiscoverSection";

import "./styles.scss";

type Protocol = DiscoverData[number];

interface DiscoverHomeProps {
  trendingItems: DiscoverData;
  recentItems: DiscoverData;
  dappsItems: DiscoverData;
  onClose: () => void;
  onExpandRecent: () => void;
  onExpandDapps: () => void;
  onCardClick: (protocol: Protocol) => void;
  onRowClick: (protocol: Protocol) => void;
  onOpenClick: (protocol: Protocol) => void;
}

export const DiscoverHome = ({
  trendingItems,
  recentItems,
  dappsItems,
  onClose,
  onExpandRecent,
  onExpandDapps,
  onCardClick,
  onRowClick,
  onOpenClick,
}: DiscoverHomeProps) => {
  const { t } = useTranslation();

  return (
    <>
      <SubviewHeader
        title={t("Discover")}
        customBackIcon={<Icon.XClose />}
        customBackAction={onClose}
      />
      <View.Content hasNoTopPadding>
        <div className="DiscoverHome__sections">
          <TrendingCarousel items={trendingItems} onCardClick={onCardClick} />
          <DiscoverSection
            title={t("Recent")}
            items={recentItems}
            onExpand={onExpandRecent}
            onRowClick={onRowClick}
            onOpenClick={onOpenClick}
          />
          <DiscoverSection
            title={t("dApps")}
            items={dappsItems}
            onExpand={onExpandDapps}
            onRowClick={onRowClick}
            onOpenClick={onOpenClick}
          />
        </div>
        {dappsItems.length > 0 && (
          <div className="DiscoverHome__footer">
            <div className="DiscoverHome__footer__copy">
              {`${t(
                "Freighter provides access to third-party dApps, protocols, and tokens for informational purposes only.",
              )} ${t("Freighter does not endorse any listed items.")}`}
            </div>
            <div className="DiscoverHome__footer__copy">
              {t(
                "By using these services, you act at your own risk, and Freighter or Stellar Development Foundation (SDF) bears no liability for any resulting losses or damages.",
              )}
            </div>
          </div>
        )}
      </View.Content>
    </>
  );
};
