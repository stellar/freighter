import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Icon } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

export const ConfirmSidebarRequest = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const next = params.get("next") || "";

  const handleReview = () => {
    if (next) {
      navigate(next);
    }
  };

  const handleReject = () => {
    navigate(ROUTES.account);
  };

  return (
    <View.Content alignment="center">
      <div className="ConfirmSidebarRequest">
        <div className="ConfirmSidebarRequest__icon">
          <Icon.AlertTriangle />
        </div>
        <h1 className="ConfirmSidebarRequest__title">
          {t("New Signing Request")}
        </h1>
        <p className="ConfirmSidebarRequest__body">
          {t(
            "A new signing request arrived while you were reviewing another. Please review it carefully before approving.",
          )}
        </p>
        <div className="ConfirmSidebarRequest__buttons">
          <Button
            size="md"
            variant="secondary"
            onClick={handleReject}
            isFullWidth
          >
            {t("Reject")}
          </Button>
          <Button
            size="md"
            variant="primary"
            onClick={handleReview}
            isFullWidth
          >
            {t("Review Request")}
          </Button>
        </div>
      </div>
    </View.Content>
  );
};
