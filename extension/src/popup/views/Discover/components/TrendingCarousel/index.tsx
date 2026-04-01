import React from "react";
import { Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { DiscoverData } from "@shared/api/types";

import "./styles.scss";

type Protocol = DiscoverData[number];

interface TrendingCarouselProps {
  items: DiscoverData;
  onCardClick: (protocol: Protocol) => void;
}

export const TrendingCarousel = ({
  items,
  onCardClick,
}: TrendingCarouselProps) => {
  const { t } = useTranslation();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="TrendingCarousel" data-testid="trending-carousel">
      <div className="TrendingCarousel__label">
        <Text as="div" size="sm" weight="semi-bold">
          {t("Trending")}
        </Text>
      </div>
      <div className="TrendingCarousel__scroll-container">
        {items.map((protocol) => (
          <div
            key={protocol.websiteUrl}
            className="TrendingCarousel__card"
            data-testid="trending-card"
            style={
              protocol.backgroundUrl
                ? { backgroundImage: `url(${protocol.backgroundUrl})` }
                : {}
            }
            onClick={() => onCardClick(protocol)}
          >
            <div className="TrendingCarousel__card__gradient" />
            <div className="TrendingCarousel__card__content">
              <Text as="div" size="sm" weight="semi-bold">
                {protocol.name}
              </Text>
              <div className="TrendingCarousel__card__tag">
                <Text as="div" size="sm" weight="medium">
                  {protocol.tags[0] ?? ""}
                </Text>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
