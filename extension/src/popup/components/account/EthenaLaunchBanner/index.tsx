import React, { useState, useEffect } from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { captureException } from "@sentry/browser";

import {
  getEthenaLaunchBannerDismissed,
  dismissEthenaLaunchBanner,
} from "@shared/api/internal";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import EthenaLaunchBannerGlow from "popup/assets/ethena-launch-banner-glow.svg";

import "./styles.scss";

export const EthenaLaunchBanner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDismissedStatus = async () => {
      try {
        const dismissed = await getEthenaLaunchBannerDismissed();
        setIsDismissed(dismissed);
      } catch (error) {
        // Default to hiding the banner on messaging failure so we never
        // re-show it to a user who has already dismissed it.
        captureException(error);
        setIsDismissed(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkDismissedStatus();
  }, []);

  const handleDismiss = async () => {
    try {
      const { isDismissed } = await dismissEthenaLaunchBanner();
      setIsDismissed(isDismissed);
    } catch (error) {
      captureException(error);
    }
  };

  const handleBannerClick = () => {
    navigateTo(ROUTES.ethenaLaunch, navigate);
  };

  // Don't show banner if loading or if dismissed
  if (isLoading || isDismissed) {
    return null;
  }

  return (
    <div className="EthenaLaunchBanner" data-testid="ethena-launch-banner">
      <img
        className="EthenaLaunchBanner__glow"
        src={EthenaLaunchBannerGlow}
        alt=""
      />
      <button
        type="button"
        className="EthenaLaunchBanner__content"
        onClick={handleBannerClick}
        data-testid="ethena-launch-banner-open"
      >
        <div className="EthenaLaunchBanner__title">
          {t("Meet Ethena on Stellar")}
        </div>
        <div className="EthenaLaunchBanner__subtitle">
          {t("USDe and sUSDe are now available.")}
        </div>
      </button>
      <button
        type="button"
        className="EthenaLaunchBanner__dismiss"
        onClick={handleDismiss}
        aria-label={t("Dismiss banner")}
        data-testid="ethena-launch-banner-dismiss"
      >
        <Icon.X />
      </button>
    </div>
  );
};
