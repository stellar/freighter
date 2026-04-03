import React from "react";
import { Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { DiscoverData, ProtocolEntry } from "@shared/api/types";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { TrendingCarousel } from "../TrendingCarousel";
import { DiscoverSection } from "../DiscoverSection";
import "./styles.scss";

interface DiscoverHomeProps {
  trendingItems: DiscoverData;
  recentItems: DiscoverData;
  dappsItems: DiscoverData;
  onClose: () => void;
  onExpandRecent: () => void;
  onExpandDapps: () => void;
  onCardClick: (protocol: ProtocolEntry) => void;
  onRecentRowClick: (protocol: ProtocolEntry) => void;
  onDappsRowClick: (protocol: ProtocolEntry) => void;
  onOpenRecentClick: (protocol: ProtocolEntry) => void;
  onOpenDappsClick: (protocol: ProtocolEntry) => void;
}

export const DiscoverHome = ({
  trendingItems,
  recentItems,
  dappsItems,
  onClose,
  onExpandRecent,
  onExpandDapps,
  onCardClick,
  onRecentRowClick,
  onDappsRowClick,
  onOpenRecentClick,
  onOpenDappsClick,
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
            onRowClick={onRecentRowClick}
            onOpenClick={onOpenRecentClick}
          />
          <DiscoverSection
            title={t("dApps")}
            items={dappsItems}
            onExpand={onExpandDapps}
            onRowClick={onDappsRowClick}
            onOpenClick={onOpenDappsClick}
          />
        </div>
        {dappsItems.length > 0 && (
          <div className="DiscoverHome__footer">
            <Text as="div" size="xs" addlClassName="DiscoverHome__footer__copy">
              {t(
                "These services are operated by independent third parties, not by Freighter or SDF. Inclusion here is not an endorsement. DeFi carries risk, including loss of funds. Use at your own risk.",
              )}
            </Text>
          </div>
        )}
      </View.Content>
    </View>
  );
};
