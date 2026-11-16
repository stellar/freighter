import React, { useState, useEffect } from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import {
  getEthenaLaunchBannerDismissed,
  dismissEthenaLaunchBanner,
} from "@shared/api/internal";

import { ROUTES } from "popup/constants/routes";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { isEthenaLaunchNetwork } from "popup/helpers/ethenaLaunch";
import { navigateTo } from "popup/helpers/navigate";
import { emitEthenaLaunchBannerDismissed } from "popup/metrics/ethenaLaunch";
import EthenaLaunchBannerGlow from "popup/assets/ethena-launch-banner-glow.svg";

import "./styles.scss";

export const EthenaLaunchBanner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLaunchNetwork = isEthenaLaunchNetwork(
    useSelector(settingsNetworkDetailsSelector),
  );

  useEffect(() => {
    // Off Mainnet the banner stays hidden, so there's nothing to look up.
    if (!isLaunchNetwork) {
      return;
    }

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
  }, [isLaunchNetwork]);

  const handleDismiss = async () => {
    try {
      const { isDismissed } = await dismissEthenaLaunchBanner();
      setIsDismissed(isDismissed);
      // Only once the background has recorded it.
      if (isDismissed) {
        emitEthenaLaunchBannerDismissed();
      }
    } catch (error) {
      captureException(error);
    }
  };

  const handleBannerClick = () => {
    navigateTo(ROUTES.ethenaLaunch, navigate);
  };

  // Don't show banner off Mainnet, while loading, or once dismissed
  if (!isLaunchNetwork || isLoading || isDismissed) {
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
