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
      <div className="Usdt0LaunchBanner" data-testid="usdt0-launch-banner">
        {/* The sheet this opens is a Radix dialog whose Root is a sibling
          of this button, so Radix's own Sheet.Trigger can't reach it from
          here. These mirror what that trigger would emit; aria-controls is
          omitted because the id is generated inside the portal and isn't
          knowable at this level. */}
        <button
          type="button"
          className="Usdt0LaunchBanner__content"
          onClick={handleBannerClick}
          aria-haspopup="dialog"
          aria-expanded={isSheetOpen}
          data-testid="usdt0-launch-banner-open"
        >
          <div className="Usdt0LaunchBanner__logo">
            {/* Decorative inside the labeled launch button — the title text
                already names USDT0, so a non-empty alt would only add noise
                to the button's accessible name */}
            <img src={Usdt0Logo} alt="" />
          </div>
          <div className="Usdt0LaunchBanner__text">
            <Text
              as="div"
              size="sm"
              weight="medium"
              addlClassName="Usdt0LaunchBanner__title"
            >
              {t("USDT0 is live on Stellar")}
            </Text>
            <Text
              as="div"
              size="xs"
              weight="medium"
              addlClassName="Usdt0LaunchBanner__subtitle"
            >
              {t("Cross-chain access to USDT")}
            </Text>
          </div>
        </button>
        <button
          type="button"
          className="Usdt0LaunchBanner__dismiss"
          onClick={handleDismiss}
          aria-label={t("Dismiss banner")}
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
