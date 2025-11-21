import React, { useState, useEffect } from "react";
import { Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import browser from "webextension-polyfill";

import {
  getMobileAppBannerDismissed,
  dismissMobileAppBanner,
} from "@shared/api/internal";

import { openTab } from "popup/helpers/navigate";
import FreighterLogo from "popup/assets/logo-freighter-shadow.png";

import "./styles.scss";

// Check if browser storage is available (extension context, not fullscreen)
const isStorageAvailable = (): boolean => {
  return !!browser?.storage?.local;
};

export const MobileAppBanner = () => {
  const { t } = useTranslation();
  const [isDismissed, setIsDismissed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDismissedStatus = async () => {
      try {
        const dismissed = await getMobileAppBannerDismissed();
        setIsDismissed(dismissed);
      } catch (error) {
        console.error("Error checking banner dismissal status:", error);
        setIsDismissed(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (isStorageAvailable()) {
      checkDismissedStatus();
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dismissMobileAppBanner();
      setIsDismissed(true);
    } catch (error) {
      console.error("Error dismissing banner:", error);
    }
  };

  const handleBannerClick = () => {
    openTab("https://www.freighter.app/#download");
  };

  // Don't show banner if storage is not available (e.g., fullscreen mode) or if dismissed
  if (!isStorageAvailable() || isLoading || isDismissed) {
    return null;
  }

  return (
    <div
      className="MobileAppBanner"
      data-testid="mobile-app-banner"
      onClick={handleBannerClick}
    >
      <div className="MobileAppBanner__content">
        <div className="MobileAppBanner__text">
          <Text
            as="div"
            size="sm"
            weight="medium"
            className="MobileAppBanner__title"
          >
            {t("Introducing Freighter Mobile")}
          </Text>
          <Text
            as="div"
            size="xs"
            weight="medium"
            className="MobileAppBanner__subtitle"
          >
            {t("Download on iOS or Android today")}
          </Text>
        </div>
        <div className="MobileAppBanner__logo">
          <img src={FreighterLogo} alt="Freighter logo" />
        </div>
      </div>
      <button
        type="button"
        className="MobileAppBanner__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        data-testid="mobile-app-banner-dismiss"
      >
        <Icon.X />
      </button>
    </div>
  );
};
