import React, { useCallback, useState } from "react";

import { DiscoverData } from "@shared/api/types";
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

import "./styles.scss";

type Protocol = DiscoverData[number];
type DiscoverView = "main" | "recent" | "dapps";

interface DiscoverProps {
  onClose?: () => void;
}

export const Discover = ({ onClose = () => {} }: DiscoverProps) => {
  const [activeView, setActiveView] = useState<DiscoverView>("main");
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(
    null,
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { isLoading, trendingItems, recentItems, dappsItems, refreshRecent } =
    useDiscoverData();
  const { showWelcome, dismissWelcome } = useDiscoverWelcome();

  const handleOpenProtocol = useCallback(
    async (protocol: Protocol) => {
      await addRecentProtocol(protocol.websiteUrl);
      await refreshRecent();
      openTab(protocol.websiteUrl);
    },
    [refreshRecent],
  );

  const handleRowClick = useCallback((protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setIsDetailsOpen(true);
  }, []);

  const handleDetailsOpen = useCallback(
    async (protocol: Protocol) => {
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
