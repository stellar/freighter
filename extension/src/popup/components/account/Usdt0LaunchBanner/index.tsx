import React, { useState, useEffect } from "react";
import { Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { captureException } from "@sentry/browser";

import {
  getUsdt0LaunchBannerDismissed,
  dismissUsdt0LaunchBanner,
} from "@shared/api/internal";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  ScreenReaderOnly,
} from "popup/basics/shadcn/Sheet";
import Usdt0Logo from "popup/assets/logo-usdt0.png";
import { Usdt0LaunchSheet } from "./Usdt0LaunchSheet";

import "./styles.scss";

export const Usdt0LaunchBanner = () => {
  const { t } = useTranslation();
  const [isDismissed, setIsDismissed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    const checkDismissedStatus = async () => {
      try {
        const dismissed = await getUsdt0LaunchBannerDismissed();
        setIsDismissed(dismissed);
      } catch (error) {
        captureException(error);
        setIsDismissed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkDismissedStatus();
  }, []);

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { isDismissed } = await dismissUsdt0LaunchBanner();
      setIsDismissed(isDismissed);
    } catch (error) {
      captureException(error);
    }
  };

  const handleBannerClick = () => {
    setIsSheetOpen(true);
  };

  // Don't show banner if loading or if dismissed
  if (isLoading || isDismissed) {
    return null;
  }

  return (
    <>
      <div
        className="Usdt0LaunchBanner"
        data-testid="usdt0-launch-banner"
        onClick={handleBannerClick}
      >
        <div className="Usdt0LaunchBanner__content">
          <div className="Usdt0LaunchBanner__logo">
            <img src={Usdt0Logo} alt="USDT0 logo" />
          </div>
          <div className="Usdt0LaunchBanner__text">
            <Text
              as="div"
              size="sm"
              weight="medium"
              className="Usdt0LaunchBanner__title"
            >
              {t("USDT0 is live on Stellar")}
            </Text>
            <Text
              as="div"
              size="xs"
              weight="medium"
              className="Usdt0LaunchBanner__subtitle"
            >
              {t("Cross-chain access to USDT")}
            </Text>
          </div>
        </div>
        <button
          type="button"
          className="Usdt0LaunchBanner__dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          data-testid="usdt0-launch-banner-dismiss"
        >
          <Icon.X />
        </button>
      </div>
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => !open && setIsSheetOpen(false)}
      >
        <SheetContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
          side="bottom"
          className="Usdt0LaunchBanner__sheet"
        >
          <ScreenReaderOnly>
            <SheetTitle>{t("USDT0 is now on Stellar")}</SheetTitle>
          </ScreenReaderOnly>
          <Usdt0LaunchSheet onClose={() => setIsSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};
