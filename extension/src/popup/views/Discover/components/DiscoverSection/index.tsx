import React from "react";
import { Icon, Text } from "@stellar/design-system";

import { DiscoverData, ProtocolEntry } from "@shared/api/types";
import { ProtocolRow } from "../ProtocolRow";
import "./styles.scss";

const MAX_VISIBLE = 5;

interface DiscoverSectionProps {
  title: string;
  items: DiscoverData;
  onExpand: () => void;
  onRowClick: (protocol: ProtocolEntry) => void;
  onOpenClick: (protocol: ProtocolEntry) => void;
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
        role="button"
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
