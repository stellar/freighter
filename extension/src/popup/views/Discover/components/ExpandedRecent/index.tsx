import React, { useState } from "react";
import { Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { DiscoverData, ProtocolEntry } from "@shared/api/types";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "popup/basics/shadcn/Popover";
import { ProtocolRow } from "../ProtocolRow";
import "./styles.scss";

interface ExpandedRecentProps {
  items: DiscoverData;
  onBack: () => void;
  onRowClick: (protocol: ProtocolEntry) => void;
  onOpenClick: (protocol: ProtocolEntry) => void;
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <View>
      <SubviewHeader
        title={t("Recent")}
        customBackAction={onBack}
        rightButton={
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild onClick={() => setIsPopoverOpen(true)}>
              <button
                className="ExpandedRecent__menu-trigger"
                data-testid="expanded-recent-menu"
              >
                <Icon.DotsHorizontal />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="ExpandedRecent__dropdown"
            >
              <div
                className="ExpandedRecent__dropdown-item"
                onClick={() => {
                  setIsPopoverOpen(false);
                  onClearRecent();
                }}
                data-testid="clear-recents-button"
              >
                <Icon.Trash01 />
                <Text as="div" size="sm" weight="medium">
                  {t("Clear recents")}
                </Text>
              </div>
            </PopoverContent>
          </Popover>
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
    </View>
  );
};
