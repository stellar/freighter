import React from "react";
import { Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ProtocolEntry } from "@shared/api/types";

import "./styles.scss";

interface ProtocolRowProps {
  protocol: ProtocolEntry;
  onRowClick: (protocol: ProtocolEntry) => void;
  onOpenClick: (protocol: ProtocolEntry) => void;
}

export const ProtocolRow = ({
  protocol,
  onRowClick,
  onOpenClick,
}: ProtocolRowProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="ProtocolRow"
      data-testid="protocol-row"
      onClick={() => onRowClick(protocol)}
    >
      <img
        src={protocol.iconUrl}
        alt={protocol.name}
        className="ProtocolRow__icon"
      />
      <div className="ProtocolRow__label">
        <Text as="div" size="sm" weight="medium">
          {protocol.name}
        </Text>
        <div className="ProtocolRow__label__subtitle">
          <Text as="div" size="xs" weight="medium">
            {protocol.tags[0] ?? ""}
          </Text>
        </div>
      </div>
      <button
        className="ProtocolRow__open-button"
        data-testid="protocol-row-open"
        onClick={(e) => {
          e.stopPropagation();
          onOpenClick(protocol);
        }}
      >
        <Text as="div" size="sm" weight="semi-bold">
          {t("Open")}
        </Text>
        <div className="ProtocolRow__open-button__icon">
          <Icon.LinkExternal01 />
        </div>
      </button>
    </div>
  );
};
