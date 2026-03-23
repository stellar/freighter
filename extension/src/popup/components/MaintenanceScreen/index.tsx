import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Heading, Icon, Text } from "@stellar/design-system";

import { maintenanceScreenSelector } from "popup/ducks/remoteConfig";
import FreighterLogo from "popup/assets/logo-freighter-welcome-2.svg";

import "./styles.scss";

/**
 * Full-screen blocking overlay displayed when the `maintenance_screen`
 * Amplitude Experiment flag is active.
 *
 * Rendered before `<Router />` in `App.tsx`, preventing all user interaction
 * until the flag is disabled. Returns `null` when not active.
 */
export const MaintenanceScreen: React.FC = () => {
  const { t } = useTranslation();
  const { enabled, content } = useSelector(maintenanceScreenSelector);

  if (!enabled || !content) {
    return null;
  }

  return (
    <div className="MaintenanceScreen" data-testid="maintenance-screen">
      <img
        className="MaintenanceScreen__logo"
        src={FreighterLogo}
        alt={t("Freighter logo")}
      />
      <div className="MaintenanceScreen__card">
        <div className="MaintenanceScreen__icon-wrapper">
          <Icon.AlertOctagon />
        </div>
        <Heading as="h2" size="md" addlClassName="MaintenanceScreen__title">
          {content.title}
        </Heading>
        {content.body.length > 0 && (
          <div className="MaintenanceScreen__body">
            {content.body.map((paragraph, index) => (
              <Text as="p" size="sm" key={index}>
                {paragraph}
              </Text>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
