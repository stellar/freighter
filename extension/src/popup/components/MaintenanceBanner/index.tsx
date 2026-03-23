import React, { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Button, Heading, Notification, Text } from "@stellar/design-system";

import { maintenanceBannerSelector } from "popup/ducks/remoteConfig";
import { BannerTheme } from "popup/helpers/maintenance/types";
import { SlideupModal } from "popup/components/SlideupModal";

import "./styles.scss";

type NotificationVariant = "primary" | "secondary" | "error" | "warning";

/**
 * Maps the Amplitude `BannerTheme` to the nearest SDS `Notification` variant.
 * SDS does not have a "tertiary" variant, so we fall back to "primary".
 *
 * @param theme - The theme from the Amplitude payload
 * @returns A valid SDS Notification variant
 */
function mapThemeToVariant(theme: BannerTheme): NotificationVariant {
  switch (theme) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "secondary":
      return "secondary";
    case "primary":
    case "tertiary":
    default:
      return "primary";
  }
}

/**
 * Non-blocking maintenance banner displayed on the Account (home) view when
 * the `maintenance_banner` Amplitude Experiment flag is active.
 *
 * - If the payload includes a `url`, tapping the banner opens it externally.
 * - If the payload includes a `modal`, tapping the banner opens a detail sheet.
 * - If neither, the banner is purely informational (not tappable).
 *
 * Returns `null` when the flag is disabled or content is unavailable.
 */
export const MaintenanceBanner: React.FC = () => {
  const { t } = useTranslation();
  const { enabled, content } = useSelector(maintenanceBannerSelector);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = useCallback(() => {
    if (!content) return;

    if (content.url) {
      window.open(content.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (content.modal) {
      setIsModalOpen(true);
    }
  }, [content]);

  if (!enabled || !content) {
    return null;
  }

  const isClickable = Boolean(content.url || content.modal);
  const variant = mapThemeToVariant(content.theme);

  return (
    <>
      <div
        className="MaintenanceBanner"
        data-testid="maintenance-banner"
        onClick={isClickable ? handleClick : undefined}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") handleClick();
              }
            : undefined
        }
      >
        <Notification variant={variant} title={content.bannerTitle} />
      </div>

      {content.modal && (
        <SlideupModal isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}>
          <div
            className="MaintenanceBanner__modal"
            data-testid="maintenance-banner-modal"
          >
            <Heading
              as="h3"
              size="sm"
              addlClassName="MaintenanceBanner__modal-title"
            >
              {content.modal.title}
            </Heading>
            {content.modal.body.length > 0 && (
              <div className="MaintenanceBanner__modal-body">
                {content.modal.body.map((paragraph, index) => (
                  <Text as="p" size="sm" key={index}>
                    {paragraph}
                  </Text>
                ))}
              </div>
            )}
            <Button
              variant="tertiary"
              size="md"
              isFullWidth
              onClick={() => setIsModalOpen(false)}
            >
              {t("Close")}
            </Button>
          </div>
        </SlideupModal>
      )}
    </>
  );
};
