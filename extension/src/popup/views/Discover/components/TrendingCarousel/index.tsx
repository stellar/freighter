import React, { useState } from "react";
import { Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { DiscoverData, ProtocolEntry } from "@shared/api/types";

import "./styles.scss";

const TrendingCard = ({
  protocol,
  onCardClick,
}: {
  protocol: ProtocolEntry;
  onCardClick: (protocol: ProtocolEntry) => void;
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = !protocol.backgroundUrl || imgFailed;

  return (
    <div
      className="TrendingCarousel__card"
      data-testid="trending-card"
      onClick={() => onCardClick(protocol)}
    >
      {showPlaceholder ? (
        <div className="TrendingCarousel__card__placeholder">
          <Icon.Image01 />
        </div>
      ) : (
        <img
          className="TrendingCarousel__card__bg"
          src={protocol.backgroundUrl}
          alt={`${protocol.name} background image`}
          onError={() => setImgFailed(true)}
        />
      )}
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
  );
};

interface TrendingCarouselProps {
  items: DiscoverData;
  onCardClick: (protocol: ProtocolEntry) => void;
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
          <TrendingCard
            key={protocol.websiteUrl}
            protocol={protocol}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
};
