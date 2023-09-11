import React from "react";
import { Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { LoadingBackground } from "popup/basics/LoadingBackground";

import "./styles.scss";

interface NetworkModalProps {
  children: React.ReactElement;
  buttonComponent: React.ReactElement;
  isConfirmation?: boolean;
}

export const NetworkModal = ({
  children,
  buttonComponent,
  isConfirmation,
}: NetworkModalProps) => {
  const { t } = useTranslation();

  return (
    <div className="NetworkModal">
      <LoadingBackground isActive />
      <div className="NetworkModal__content">
        <Notification
          variant={isConfirmation ? "warning" : "error"}
          title={t("Network")}
        >
          {children}
        </Notification>
        <div className="NetworkModal__button-row">{buttonComponent}</div>
      </div>
    </div>
  );
};
