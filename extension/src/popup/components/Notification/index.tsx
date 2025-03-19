import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";
import classNames from "classnames";

import "./styles.scss";

type NotificationType = "warning" | "info";

export const Notification = (props: {
  description: string;
  type: NotificationType;
}) => {
  const { t } = useTranslation();

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "warning":
        return <Icon.AlertTriangle className="warning" />;
      case "info":
      default:
        return <Icon.AlertOctagon className="info" />;
    }
  };

  const classes = classNames("NotificationModal__box", {
    "NotificationModal__box--isWarning": props.type === "warning",
    "NotificationModal__box--isInfo": props.type === "info",
  });

  return (
    <div className={classes} data-testid="NotificationModal">
      <div className="NotificationModal__box__content">
        <div className="NotificationModal__Icon">{getIcon(props.type)}</div>
        <div className="NotificationModal__alert">
          <div className="NotificationModal__description">
            {t(props.description)}
          </div>
        </div>
      </div>
    </div>
  );
};
