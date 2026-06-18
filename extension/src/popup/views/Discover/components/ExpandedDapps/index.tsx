import React from "react";
import { useTranslation } from "react-i18next";

import { DiscoverData, ProtocolEntry } from "@shared/api/types";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { ProtocolRow } from "../ProtocolRow";
import "./styles.scss";

interface ExpandedDappsProps {
  items: DiscoverData;
  onBack: () => void;
  onRowClick: (protocol: ProtocolEntry) => void;
  onOpenClick: (protocol: ProtocolEntry) => void;
}

export const ExpandedDapps = ({
  items,
  onBack,
  onRowClick,
  onOpenClick,
}: ExpandedDappsProps) => {
  const { t } = useTranslation();

  return (
    <View>
      <SubviewHeader title={t("dApps")} customBackAction={onBack} />
      <View.Content hasNoTopPadding>
        <div className="ExpandedDapps__list">
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
