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
    <View>
      <SubviewHeader
        title={t("Discover")}
        customBackIcon={<Icon.X />}
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
              {t(
                "These services are operated by independent third parties, not by Freighter or SDF. Inclusion here is not an endorsement. DeFi carries risk, including loss of funds. Use at your own risk.",
              )}
            </div>
          </div>
        )}
      </View.Content>
    </View>
  );
};
