import React from "react";
import { useSelector } from "react-redux";
import { Heading, Icon, Text } from "@stellar/design-system";

import { maintenanceScreenSelector } from "popup/ducks/remoteConfig";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

/**
 * Full-screen blocking overlay displayed when the `maintenance_screen`
 * Amplitude Experiment flag is active.
 *
 * Rendered before `<Router />` in `App.tsx`, preventing all user interaction
 * until the flag is disabled. Returns `null` when not active.
 */
export const MaintenanceScreen: React.FC = () => {
  const { enabled, content } = useSelector(maintenanceScreenSelector);
  const activeContent = enabled ? content : null;

  if (!activeContent) {
    return null;
  }

  return (
    <div className="MaintenanceScreen" data-testid="maintenance-screen">
      <View.Inset>
        <div className="MaintenanceScreen__card">
          <div className="MaintenanceScreen__icon-box">
            <Icon.AlertOctagon
              style={{ color: "var(--sds-clr-lilac-09, #6e56cf)" }}
            />
          </div>
          <Heading as="h2" size="xs" addlClassName="MaintenanceScreen__title">
            {activeContent.title}
          </Heading>
          {activeContent.body.length > 0 && (
            <div className="MaintenanceScreen__body">
              {activeContent.body.map((paragraph, index) => (
                <Text
                  as="div"
                  size="sm"
                  key={index}
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
  );
};
