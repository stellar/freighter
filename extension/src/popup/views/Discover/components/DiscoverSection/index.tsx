import React from "react";
import { Icon, Text } from "@stellar/design-system";

import { DiscoverData } from "@shared/api/types";
import { ProtocolRow } from "../ProtocolRow";

import "./styles.scss";

type Protocol = DiscoverData[number];

const MAX_VISIBLE = 5;

interface DiscoverSectionProps {
  title: string;
  items: DiscoverData;
  onExpand: () => void;
  onRowClick: (protocol: Protocol) => void;
  onOpenClick: (protocol: Protocol) => void;
}

export const DiscoverSection = ({
  title,
  items,
  onExpand,
  onRowClick,
  onOpenClick,
}: DiscoverSectionProps) => {
  if (items.length === 0) {
    return null;
  }

  const visibleItems = items.slice(0, MAX_VISIBLE);

  return (
    <div
      className="DiscoverSection"
      data-testid={`discover-section-${title.toLowerCase()}`}
    >
      <div
        className="DiscoverSection__header"
        onClick={onExpand}
        data-testid={`discover-section-expand-${title.toLowerCase()}`}
      >
        <Text as="div" size="sm" weight="semi-bold">
          {title}
        </Text>
        <Icon.ChevronRight />
      </div>
      <div className="DiscoverSection__list">
        {visibleItems.map((protocol) => (
          <ProtocolRow
            key={protocol.websiteUrl}
            protocol={protocol}
            onRowClick={onRowClick}
            onOpenClick={onOpenClick}
          />
        ))}
      </div>
    </div>
  );
};
