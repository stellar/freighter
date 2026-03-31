import React from "react";
import { Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { DiscoverData } from "@shared/api/types";

import "./styles.scss";

type Protocol = DiscoverData[number];

interface ProtocolDetailsPanelProps {
  protocol: Protocol;
  onOpen: (protocol: Protocol) => void;
}

const getHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

export const ProtocolDetailsPanel = ({
  protocol,
  onOpen,
}: ProtocolDetailsPanelProps) => {
  const { t } = useTranslation();

  return (
    <div className="ProtocolDetailsPanel" data-testid="protocol-details-panel">
      <div className="ProtocolDetailsPanel__header">
        <img
          src={protocol.iconUrl}
          alt={protocol.name}
          className="ProtocolDetailsPanel__icon"
        />
        <div className="ProtocolDetailsPanel__name">
          <Text as="div" size="lg" weight="medium">
            {protocol.name}
          </Text>
        </div>
        <button
          className="ProtocolDetailsPanel__open-button"
          data-testid="protocol-details-open"
          onClick={() => onOpen(protocol)}
        >
          <Text as="div" size="sm" weight="semi-bold">
            {t("Open")}
          </Text>
          <div className="ProtocolDetailsPanel__open-button__icon">
            <Icon.LinkExternal01 />
          </div>
        </button>
      </div>

      <div className="ProtocolDetailsPanel__section">
        <div className="ProtocolDetailsPanel__section__label">
          <Text as="div" size="xs" weight="medium">
            {t("Domain")}
          </Text>
        </div>
        <div className="ProtocolDetailsPanel__domain">
          <Icon.Globe02 />
          <Text as="div" size="sm" weight="medium">
            {getHostname(protocol.websiteUrl)}
          </Text>
        </div>
      </div>

      <div className="ProtocolDetailsPanel__section">
        <div className="ProtocolDetailsPanel__section__label">
          <Text as="div" size="xs" weight="medium">
            {t("Tags")}
          </Text>
        </div>
        <div className="ProtocolDetailsPanel__tags">
          {protocol.tags.map((tag) => (
            <div key={tag} className="ProtocolDetailsPanel__tag">
              <Text as="div" size="sm" weight="semi-bold">
                {tag}
              </Text>
            </div>
          ))}
        </div>
      </div>

      <div className="ProtocolDetailsPanel__section">
        <div className="ProtocolDetailsPanel__section__label">
          <Text as="div" size="xs" weight="medium">
            {t("Overview")}
          </Text>
        </div>
        <div className="ProtocolDetailsPanel__description">
          <Text as="div" size="sm" weight="regular">
            {protocol.description}
          </Text>
        </div>
      </div>
    </div>
  );
};
