import React, { useState } from "react";
import { Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { DiscoverData } from "@shared/api/types";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { ProtocolRow } from "../ProtocolRow";

import "./styles.scss";

type Protocol = DiscoverData[number];

interface ExpandedRecentProps {
  items: DiscoverData;
  onBack: () => void;
  onRowClick: (protocol: Protocol) => void;
  onOpenClick: (protocol: Protocol) => void;
  onClearRecent: () => void;
}

export const ExpandedRecent = ({
  items,
  onBack,
  onRowClick,
  onOpenClick,
  onClearRecent,
}: ExpandedRecentProps) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <SubviewHeader
        title={t("Recent")}
        customBackAction={onBack}
        rightButton={
          <div className="ExpandedRecent__menu">
            <button
              className="ExpandedRecent__menu-trigger"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              data-testid="expanded-recent-menu"
            >
              <Icon.DotsHorizontal />
            </button>
            {isMenuOpen && (
              <div className="ExpandedRecent__dropdown">
                <div
                  className="ExpandedRecent__dropdown-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onClearRecent();
                  }}
                  data-testid="clear-recents-button"
                >
                  <Icon.Trash01 />
                  <Text as="div" size="sm" weight="medium">
                    {t("Clear recents")}
                  </Text>
                </div>
              </div>
            )}
          </div>
        }
      />
      <View.Content hasNoTopPadding>
        <div className="ExpandedRecent__list">
          {items.map((protocol) => (
            <ProtocolRow
              key={protocol.websiteUrl}
              protocol={protocol}
              onRowClick={onRowClick}
              onOpenClick={onOpenClick}
            />
          ))}
        </div>
      </View.Content>
    </>
  );
};
