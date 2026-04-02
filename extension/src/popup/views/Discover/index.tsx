import React, { useCallback, useState } from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ProtocolEntry } from "@shared/api/types";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { openTab } from "popup/helpers/navigate";
import {
  addRecentProtocol,
  clearRecentProtocols,
} from "popup/helpers/recentProtocols";
import { SlideupModal } from "popup/components/SlideupModal";
import { Loading } from "popup/components/Loading";

import { useDiscoverData } from "./hooks/useDiscoverData";
import { useDiscoverWelcome } from "./hooks/useDiscoverWelcome";
import { DiscoverHome } from "./components/DiscoverHome";
import { ExpandedRecent } from "./components/ExpandedRecent";
import { ExpandedDapps } from "./components/ExpandedDapps";
import { ProtocolDetailsPanel } from "./components/ProtocolDetailsPanel";
import { DiscoverWelcomeModal } from "./components/DiscoverWelcomeModal";
import { DiscoverError } from "./components/DiscoverError";
import "./styles.scss";

type DiscoverView = "main" | "recent" | "dapps";

interface DiscoverProps {
  onClose?: () => void;
}

export const Discover = ({ onClose = () => {} }: DiscoverProps) => {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<DiscoverView>("main");
  const [selectedProtocol, setSelectedProtocol] =
    useState<ProtocolEntry | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const {
    isLoading,
    error,
    trendingItems,
    recentItems,
    dappsItems,
    refreshRecent,
    retry,
  } = useDiscoverData();
  const { showWelcome, dismissWelcome } = useDiscoverWelcome();

  const handleOpenProtocol = useCallback(
    async (protocol: ProtocolEntry) => {
      await addRecentProtocol(protocol.websiteUrl);
      await refreshRecent();
      openTab(protocol.websiteUrl);
    },
    [refreshRecent],
  );

  const handleRowClick = useCallback((protocol: ProtocolEntry) => {
    setSelectedProtocol(protocol);
    setIsDetailsOpen(true);
  }, []);

  const handleDetailsOpen = useCallback(
    async (protocol: ProtocolEntry) => {
      setIsDetailsOpen(false);
      // Wait for the SlideupModal close animation before clearing state
      setTimeout(async () => {
        setSelectedProtocol(null);
        await handleOpenProtocol(protocol);
      }, 200);
    },
    [handleOpenProtocol],
  );

  const handleClearRecent = useCallback(async () => {
    await clearRecentProtocols();
    await refreshRecent();
    setActiveView("main");
  }, [refreshRecent]);

  if (isLoading) {
    return (
      <div className="Discover">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="Discover">
        <View>
          <SubviewHeader
            title={t("Discover")}
            customBackIcon={<Icon.X />}
            customBackAction={onClose}
          />
          <View.Content hasNoTopPadding>
            <DiscoverError onRetry={retry} />
          </View.Content>
        </View>
      </div>
    );
  }

  return (
    <div className="Discover">
      {activeView === "main" && (
        <DiscoverHome
          trendingItems={trendingItems}
          recentItems={recentItems}
          dappsItems={dappsItems}
          onClose={onClose}
          onExpandRecent={() => setActiveView("recent")}
          onExpandDapps={() => setActiveView("dapps")}
          onCardClick={handleRowClick}
          onRowClick={handleRowClick}
          onOpenClick={handleOpenProtocol}
        />
      )}
      {activeView === "recent" && (
        <ExpandedRecent
          items={recentItems}
          onBack={() => setActiveView("main")}
          onRowClick={handleRowClick}
          onOpenClick={handleOpenProtocol}
          onClearRecent={handleClearRecent}
        />
      )}
      {activeView === "dapps" && (
        <ExpandedDapps
          items={dappsItems}
          onBack={() => setActiveView("main")}
          onRowClick={handleRowClick}
          onOpenClick={handleOpenProtocol}
        />
      )}

      <SlideupModal
        isModalOpen={isDetailsOpen}
        setIsModalOpen={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setSelectedProtocol(null);
          }
        }}
      >
        {selectedProtocol ? (
          <ProtocolDetailsPanel
            protocol={selectedProtocol}
            onOpen={handleDetailsOpen}
          />
        ) : (
          <div />
        )}
      </SlideupModal>

      {showWelcome && <DiscoverWelcomeModal onDismiss={dismissWelcome} />}
    </div>
  );
};
