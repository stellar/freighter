import React, { useCallback, useEffect, useRef } from "react";
import { Button, Heading } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import get from "lodash/get";

import { ROUTES } from "popup/constants/routes";
import { View } from "popup/basics/layout/View";
import {
  emitRebrandAnnouncementDismissed,
  emitRebrandAnnouncementViewed,
} from "popup/metrics/rebrand";

import Sparkles from "popup/assets/rebrand-announcement-sparkles.svg";
import Tile from "popup/assets/rebrand-announcement-tile.svg?react";

import "./styles.scss";

/**
 * One-time "Freighter is now Varial" announcement for wallets that pre-date
 * the rebrand. UnlockAccount routes here after the first unlock on a Varial
 * build, with the original destination in location state. The background has
 * already marked the wallet seen by then, so it never shows again.
 */
export const RebrandAnnouncement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = get(
    location,
    "state.destination",
    ROUTES.account,
  ) as string;
  const hasDismissed = useRef(false);

  useEffect(() => {
    emitRebrandAnnouncementViewed();
  }, []);

  const handleDismiss = useCallback(() => {
    if (hasDismissed.current) {
      return;
    }
    hasDismissed.current = true;

    emitRebrandAnnouncementDismissed();
    navigate(destination, { replace: true });
  }, [destination, navigate]);

  return (
    <React.Fragment>
      <View.Content>
        <div className="RebrandAnnouncement__column">
          <div
            className="RebrandAnnouncement__illustration"
            role="img"
            aria-label={t("The Varial logo")}
          >
            {/* The glow is a progressive blur in the design: hard-edged above
                the disc's centre line, blurring toward the bottom. Two discs
                cross-faded through a vertical mask reproduce it. */}
            <div className="RebrandAnnouncement__glow">
              <div className="RebrandAnnouncement__glow-disc RebrandAnnouncement__glow-disc--soft" />
              <div className="RebrandAnnouncement__glow-disc RebrandAnnouncement__glow-disc--hard" />
            </div>
            <img
              className="RebrandAnnouncement__sparkles"
              src={Sparkles}
              alt=""
            />
            <span className="RebrandAnnouncement__tile" aria-hidden="true">
              <Tile />
            </span>
          </div>

          <Heading
            as="h1"
            size="sm"
            weight="semi-bold"
            addlClassName="RebrandAnnouncement__title"
          >
            {t("Freighter is now Varial")}
          </Heading>
          <p className="RebrandAnnouncement__description">
            {t("Your Freighter wallet, now with a new name and look.")}
          </p>
        </div>
      </View.Content>

      <View.Footer>
        <Button
          size="lg"
          isFullWidth
          isRounded
          variant="secondary"
          data-testid="rebrand-announcement-continue"
          onClick={handleDismiss}
        >
          {t("Continue to Varial")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
