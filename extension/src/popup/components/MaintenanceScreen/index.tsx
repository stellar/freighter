import React from "react";
import { Heading, Icon, Text } from "@stellar/design-system";

import { MaintenanceScreenContent } from "popup/helpers/maintenance/types";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

/**
 * Full-screen blocking overlay displayed when the `maintenance_screen`
 * Amplitude Experiment flag is active.
 *
 * Rendered before `<Router />` in `App.tsx` via `MaintenanceGate`, which
 * prevents all user interaction until the flag is disabled.
 * Returns `null` when `content` is null.
 */
export const MaintenanceScreen: React.FC<{
  content: MaintenanceScreenContent | null;
}> = ({ content }) => {
  if (!content) {
    return null;
  }

  return (
    <View>
      <div
        className="MaintenanceScreen"
        data-testid="maintenance-screen"
        role="alert"
        aria-live="polite"
      >
        <View.Inset>
          <div className="MaintenanceScreen__card">
            <div className="MaintenanceScreen__icon-box">
              <Icon.AlertOctagon
                style={{ color: "var(--sds-clr-lilac-09, #6e56cf)" }}
              />
            </div>
            <Heading as="h2" size="xs" addlClassName="MaintenanceScreen__title">
              {content.title}
            </Heading>
            {content.body.length > 0 && (
              <div className="MaintenanceScreen__body">
                {content.body.map((paragraph, index) => (
                  <Text
                    as="div"
                    size="sm"
                    key={`${index}-${paragraph.slice(0, 20)}`}
                    className="MaintenanceScreen__body-text"
                  >
                    {paragraph}
                  </Text>
                ))}
              </div>
            )}
          </div>
        </View.Inset>
      </div>
    </View>
  );
};
