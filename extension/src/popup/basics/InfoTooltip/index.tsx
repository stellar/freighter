import React from "react";
import { FloaterPlacement, Icon, Tooltip } from "@stellar/design-system";
import "./styles.scss";

interface InfoTooltipProps {
  children: React.ReactNode;
  infoText: React.ReactNode;
  placement?: FloaterPlacement;
}

export const InfoTooltip = ({
  children,
  infoText,
  placement = "right",
}: InfoTooltipProps) => (
  <div className="InfoTooltip">
    {children}
    <Tooltip
      triggerEl={
        <div className="InfoTooltip__button">
          <Icon.InfoCircle />
        </div>
      }
      placement={placement}
    >
      {infoText}
    </Tooltip>
  </div>
);
