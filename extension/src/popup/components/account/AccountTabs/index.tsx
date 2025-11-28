import React, { useContext, useState } from "react";
import { useSelector } from "react-redux";
import classnames from "classnames";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

import {
  AccountTabsContext,
  TabsList,
} from "popup/views/Account/contexts/activeTabContext";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { isCustomNetwork } from "@shared/helpers/stellar";
import { ROUTES } from "popup/constants/routes";
import { LoadingBackground } from "popup/basics/LoadingBackground";

import { AccountHeaderModal } from "../AccountHeaderModal";
import "./styles.scss";

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
            <Icon.EyeOff />
          </div>
          <div className="AccountTabs__modal__item__title">
            {t("Manage tokens")}
          </div>
        </div>
      </Link>
    </>
  );
};

const ManageCollectiblesModalContent = () => {
  const { t } = useTranslation();

  return (
    <>
      <Link to={ROUTES.manageCollectibles}>
        <div className="AccountTabs__modal__item">
          <div className="AccountTabs__modal__item__icon">
            <Icon.PlusSquare />
          </div>
          <div className="AccountTabs__modal__item__title">
            {t("Add manually")}
          </div>
        </div>
      </Link>
      {/* <div className="AccountTabs__modal__item">
              <div className="AccountTabs__modal__item__icon">
                <Icon.EyeOff />
              </div>
              <div className="AccountTabs__modal__item__title">
                {t("Hidden collectibles")}
              </div>
            </div> */}
    </>
  );
};

export const AccountTabs = () => {
  const { activeTab, setActiveTab } = useContext(AccountTabsContext);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [isManageAssetsOpen, setIsManageAssetsOpen] = useState(false);
  const [isManageCollectiblesOpen, setIsManageCollectiblesOpen] =
    useState(false);
  const isBackgroundActive = isManageAssetsOpen || isManageCollectiblesOpen;

  const isTokensTab = activeTab === 0;
  const isCollectiblesTab = activeTab === 1;

  const handleManageClick = () => {
    if (isTokensTab) {
      setIsManageAssetsOpen(!isManageAssetsOpen);
    } else if (isCollectiblesTab) {
      setIsManageCollectiblesOpen(!isManageCollectiblesOpen);
    }
  };

  return (
    <div className="AccountTabs">
      <div className="AccountTabs__tabs">
        {TabsList.map((tab, index) => {
          if (tab === "collectibles" && isCustomNetwork(networkDetails)) {
            return null;
          }

          return (
            <div
              data-testid={`account-tab-${tab}`}
              className={classnames("AccountTabs__tab-item", {
                "AccountTabs__tab-item--active": activeTab === index,
              })}
              key={tab}
              onClick={() => {
                setActiveTab(index);
              }}
            >
              {tab}
            </div>
          );
        })}
      </div>

      <AccountHeaderModal
        className="AccountTabs__modal"
        isDropdownOpen={isManageAssetsOpen || isManageCollectiblesOpen}
        icon={
          <div className="AccountTabs__manage-btn" onClick={handleManageClick}>
            <Icon.Sliders01 />
          </div>
        }
      >
        <>
          {isTokensTab && <ManageAssetsModalContent />}
          {isCollectiblesTab && <ManageCollectiblesModalContent />}
        </>
      </AccountHeaderModal>

      {isBackgroundActive
        ? createPortal(
            <LoadingBackground
              onClick={() => {
                setIsManageAssetsOpen(false);
                setIsManageCollectiblesOpen(false);
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
