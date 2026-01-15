/**
 * @fileoverview AccountTabs component provides tab navigation and asset management
 * functionality for the account view. It includes tabs for tokens and collectibles,
 * with modal dialogs for managing assets and adding collectibles.
 */

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import classnames from "classnames";
import { Icon } from "@stellar/design-system";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

import { TabsList } from "popup/views/Account/contexts/activeTabContext";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { collectionsSelector } from "popup/ducks/cache";
import { isCustomNetwork } from "@shared/helpers/stellar";
import { ROUTES } from "popup/constants/routes";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { CollectibleKey } from "@shared/api/types/types";

import { AccountHeaderModal } from "../AccountHeaderModal";
import { HiddenCollectibles } from "../HiddenCollectibles";
import { useActiveTab } from "./hooks/useActiveTab";

import "./styles.scss";

/**
 * TabButtons component renders the tab navigation buttons for switching between
 * tokens and collectibles views. Hides the collectibles tab on custom networks.
 *
 * @param {Object} props - Component props
 * @param {boolean} [props.isIncludingIcons] - Whether to display icons alongside tab labels (used in Send flow)
 * @returns {JSX.Element} Rendered tab buttons
 */
export const TabButtons = ({
  isIncludingIcons,
}: {
  isIncludingIcons?: boolean;
}) => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { activeTab, setActiveTab } = useActiveTab();

  const tabLabels: Record<string, string> = {
    tokens: t("Tokens"),
    collectibles: t("Collectibles"),
  };

  const tabIcons: Record<string, React.ReactNode> = {
    tokens: <Icon.Coins03 />,
    collectibles: <Icon.Image01 />,
  };

  return (
    <>
      {Object.values(TabsList).map((tab) => {
        if (tab === TabsList.COLLECTIBLES && isCustomNetwork(networkDetails)) {
          return null;
        }

        return (
          <div
            data-testid={`account-tab-${tab}`}
            className={classnames("AccountTabs__tab-item", {
              "AccountTabs__tab-item--active": activeTab === tab,
            })}
            key={tab}
            onClick={() => {
              setActiveTab(tab);
            }}
          >
            {isIncludingIcons && tabIcons[tab]}
            {tabLabels[tab]}
          </div>
        );
      })}
    </>
  );
};

/**
 * ManageAssetsModalContent component renders the content for the manage assets modal,
 * providing links to add tokens and manage existing tokens.
 *
 * @returns {JSX.Element} Modal content with links to asset management routes
 */
const ManageAssetsModalContent = () => {
  const { t } = useTranslation();

  return (
    <>
      <Link to={ROUTES.searchAsset}>
        <div className="AccountTabs__modal__item">
          <div className="AccountTabs__modal__item__icon">
            <Icon.PlusSquare />
          </div>
          <div className="AccountTabs__modal__item__title">
            {t("Add a token")}
          </div>
        </div>
      </Link>
      <Link to={ROUTES.manageAssets}>
        <div className="AccountTabs__modal__item">
          <div className="AccountTabs__modal__item__icon">
            <Icon.Pencil01 />
          </div>
          <div className="AccountTabs__modal__item__title">
            {t("Manage tokens")}
          </div>
        </div>
      </Link>
    </>
  );
};

/**
 * AddCollectiblesModalContent component renders the content for the add collectibles modal,
 * providing a link to manually add collectibles.
 *
 * @param {Object} props - Component props
 * @param {() => void} props.onHiddenCollectiblesClick - Callback when hidden collectibles is clicked
 * @returns {JSX.Element} Modal content with link to add collectibles route
 */
const AddCollectiblesModalContent = ({
  onHiddenCollectiblesClick,
}: {
  onHiddenCollectiblesClick: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Link to={ROUTES.addCollectibles}>
        <div className="AccountTabs__modal__item">
          <div className="AccountTabs__modal__item__icon">
            <Icon.PlusSquare />
          </div>
          <div className="AccountTabs__modal__item__title">
            {t("Add manually")}
          </div>
        </div>
      </Link>
      <div
        className="AccountTabs__modal__item"
        onClick={onHiddenCollectiblesClick}
        data-testid="hidden-collectibles-btn"
      >
        <div className="AccountTabs__modal__item__icon">
          <Icon.EyeOff />
        </div>
        <div className="AccountTabs__modal__item__title">
          {t("Hidden collectibles")}
        </div>
      </div>
    </>
  );
};

/**
 * AccountTabs component is the main container for account tab navigation and asset management.
 * It manages the state of tab selection and modal dialogs for managing assets and collectibles.
 * Displays a loading background overlay when modals are open.
 *
 * @returns {JSX.Element} Account tabs component with navigation and management modals
 */
export const AccountTabs = ({
  hiddenCollectibles,
  refreshHiddenCollectibles,
}: {
  hiddenCollectibles: Record<CollectibleKey, string>;
  refreshHiddenCollectibles: () => Promise<void>;
}) => {
  const [isManageAssetsOpen, setIsManageAssetsOpen] = useState(false);
  const [isAddCollectiblesOpen, setIsAddCollectiblesOpen] = useState(false);
  const [isHiddenCollectiblesOpen, setIsHiddenCollectiblesOpen] =
    useState(false);
  const isBackgroundActive = isManageAssetsOpen || isAddCollectiblesOpen;

  const { activeTab } = useActiveTab();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const collections = useSelector(collectionsSelector);

  const isTokensTab = activeTab === TabsList.TOKENS;
  const isCollectiblesTab = activeTab === TabsList.COLLECTIBLES;

  const currentCollections =
    collections[networkDetails?.network || ""]?.[publicKey || ""] || [];

  /**
   * Handles the click event on the manage button, toggling the appropriate modal
   * based on the currently active tab.
   */
  const handleManageClick = () => {
    if (isTokensTab) {
      setIsManageAssetsOpen(!isManageAssetsOpen);
    } else if (isCollectiblesTab) {
      setIsAddCollectiblesOpen(!isAddCollectiblesOpen);
    }
  };

  /**
   * Handles the hidden collectibles button click, opening the hidden collectibles sheet
   * and closing the dropdown modal.
   */
  const handleHiddenCollectiblesClick = () => {
    setIsAddCollectiblesOpen(false);
    setIsHiddenCollectiblesOpen(true);
  };

  return (
    <div className="AccountTabs">
      <div className="AccountTabs__tabs">
        <TabButtons />
      </div>

      <AccountHeaderModal
        className="AccountTabs__modal"
        isDropdownOpen={isManageAssetsOpen || isAddCollectiblesOpen}
        icon={
          <div
            className="AccountTabs__manage-btn"
            onClick={handleManageClick}
            data-testid={`account-tabs-manage-btn-${isTokensTab ? "assets" : "collectibles"}`}
          >
            <Icon.Sliders01 />
          </div>
        }
      >
        <>
          {isTokensTab && <ManageAssetsModalContent />}
          {isCollectiblesTab && (
            <AddCollectiblesModalContent
              onHiddenCollectiblesClick={handleHiddenCollectiblesClick}
            />
          )}
        </>
      </AccountHeaderModal>

      <HiddenCollectibles
        collections={currentCollections}
        hiddenCollectibles={hiddenCollectibles}
        refreshHiddenCollectibles={refreshHiddenCollectibles}
        isOpen={isHiddenCollectiblesOpen}
        onClose={() => setIsHiddenCollectiblesOpen(false)}
      />

      {isBackgroundActive
        ? createPortal(
            <LoadingBackground
              onClick={() => {
                setIsManageAssetsOpen(false);
                setIsAddCollectiblesOpen(false);
              }}
              isActive={isBackgroundActive}
              isFullScreen
              isClear
            />,
            document.querySelector("#modal-root")!,
          )
        : null}
    </div>
  );
};
