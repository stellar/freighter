import React from "react";
import { useSelector } from "react-redux";
import { Heading, Icon, Text } from "@stellar/design-system";

import { maintenanceScreenSelector } from "popup/ducks/remoteConfig";
import { MaintenanceScreenContent } from "popup/helpers/maintenance/types";

import "./styles.scss";

// ---------------------------------------------------------------------------
// Dev override — assign DEV_CONTENT to force the screen on for local testing.
// Set back to null before committing.
// ---------------------------------------------------------------------------
const DEV_CONTENT: MaintenanceScreenContent | null = null;
// const DEV_CONTENT: MaintenanceScreenContent = {
//   title: "[Dev] Freighter is under maintenance",
//   body: [
//     "We are performing important updates to improve your experience.",
//     "Please check back shortly. Thank you for your patience.",
//   ],
// };

/**
 * Full-screen blocking overlay displayed when the `maintenance_screen`
 * Amplitude Experiment flag is active.
 *
 * Rendered before `<Router />` in `App.tsx`, preventing all user interaction
 * until the flag is disabled. Returns `null` when not active.
 */
export const MaintenanceScreen: React.FC = () => {
  const { enabled, content } = useSelector(maintenanceScreenSelector);
  const activeContent = DEV_CONTENT ?? (enabled ? content : null);

  if (!activeContent) {
    return null;
  }

  return (
    <div className="MaintenanceScreen" data-testid="maintenance-screen">
      <div className="MaintenanceScreen__card">
        <div className="MaintenanceScreen__icon-box">
          <Icon.AlertOctagon />
        </div>
        <div className="MaintenanceScreen__text">
          <Heading as="h2" size="md" addlClassName="MaintenanceScreen__title">
            {activeContent.title}
          </Heading>
          {activeContent.body.length > 0 && (
            <div className="MaintenanceScreen__body">
              {activeContent.body.map((paragraph, index) => (
                <Text as="p" size="sm" key={index}>
                  {paragraph}
                </Text>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
