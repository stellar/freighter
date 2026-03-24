import React, { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Button, Heading, Icon, Text } from "@stellar/design-system";

import { maintenanceBannerSelector } from "popup/ducks/remoteConfig";
import { BannerTheme } from "popup/helpers/maintenance/types";
import { View } from "popup/basics/layout/View";
import { SlideupModal } from "popup/components/SlideupModal";

import "./styles.scss";


/**
 * Maps a `BannerTheme` to the banner-strip icon (small, inline).
 *
 * @param theme - The theme from the Amplitude payload
 * @returns An SDS Icon element
 */
function getBannerIcon(theme: BannerTheme): React.ReactElement {
  switch (theme) {
    case "warning":
    case "error":
      return <Icon.AlertOctagon />;
    case "primary":
    case "secondary":
    case "tertiary":
    default:
      return <Icon.InfoCircle />;
  }
}

/** CSS color value for each modal icon theme, applied as inline style to override SDS defaults. */
const MODAL_ICON_COLOR: Record<BannerTheme, string> = {
  warning: "var(--sds-clr-amber-09, #ffb224)",
  error: "var(--sds-clr-red-09, #e5484d)",
  primary: "var(--sds-clr-lilac-09, #6e56cf)",
  secondary: "var(--sds-clr-lilac-09, #6e56cf)",
  tertiary: "var(--sds-clr-gray-09, #707070)",
};

/**
 * Maps a `BannerTheme` to the modal header icon (larger, inside the sheet).
 * Matches mobile: AlertOctagon for high-severity, InfoCircle otherwise.
 * Color is applied via inline style to guarantee it overrides any SDS stylesheet.
 *
 * @param theme - The theme from the Amplitude payload
 * @returns An SDS Icon element
 */
function getModalIcon(theme: BannerTheme): React.ReactElement {
  const iconStyle = { color: MODAL_ICON_COLOR[theme] };
  switch (theme) {
    case "warning":
    case "error":
      return <Icon.AlertOctagon style={iconStyle} />;
    case "primary":
    case "secondary":
    case "tertiary":
    default:
      return <Icon.InfoCircle style={iconStyle} />;
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
  const activeContent = enabled ? content : null;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = useCallback(() => {
    if (!activeContent) return;

    if (activeContent.url) {
      window.open(activeContent.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (activeContent.modal) {
      setIsModalOpen(true);
    }
  }, [activeContent]);

  if (!activeContent) {
    return null;
  }

  const isClickable = Boolean(activeContent.url || activeContent.modal);

  return (
    <>
      <div
        className={`MaintenanceBanner__alert MaintenanceBanner__alert--${activeContent.theme}`}
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
        <span className="MaintenanceBanner__alert-icon">
          {getBannerIcon(activeContent.theme)}
        </span>
        <Text as="h6" size="xs" className="MaintenanceBanner__alert-text">
          {activeContent.bannerTitle}
        </Text>
      </div>

      {activeContent.modal && (
        <SlideupModal
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          hasBackdrop
        >
          <View.Inset>
            <div
              className="MaintenanceBanner__modal"
              data-testid="maintenance-banner-modal"
            >
              <div className="MaintenanceBanner__modal-header">
                <div
                  className={`MaintenanceBanner__modal-icon MaintenanceBanner__modal-icon--${activeContent.theme}`}
                >
                  {getModalIcon(activeContent.theme)}
                </div>
                <button
                  className="MaintenanceBanner__modal-close"
                  onClick={() => setIsModalOpen(false)}
                  aria-label={t("Close")}
                >
                  <Icon.X />
                </button>
              </div>
              <Heading
                as="h3"
                size="xs"
                addlClassName="MaintenanceBanner__modal-title"
              >
                {activeContent.modal.title}
              </Heading>
              {activeContent.modal.body.length > 0 && (
                <div className="MaintenanceBanner__modal-body">
                  {activeContent.modal.body.map((paragraph, index) => (
                    <Text
                      as="div"
                      size="sm"
                      key={index}
                      className="MaintenanceBanner__modal-bodyText"
                    >
                      {paragraph}
                    </Text>
                  ))}
                </div>
              )}
              <Button
                variant="secondary"
                size="md"
                isFullWidth
                isRounded
                onClick={() => setIsModalOpen(false)}
              >
                {t("Done")}
              </Button>
            </div>
          </View.Inset>
        </SlideupModal>
      )}
    </>
  );
};
