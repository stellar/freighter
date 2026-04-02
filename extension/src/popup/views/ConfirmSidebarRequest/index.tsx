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
    <View.Content>
      <div className="ConfirmSidebarRequest">
        <div className="ConfirmSidebarRequest__header">
          <div className="ConfirmSidebarRequest__icon">
            <Icon.AlertTriangle />
          </div>
          <h1 className="ConfirmSidebarRequest__title">
            {t("New Signing Request")}
          </h1>
          <div className="ConfirmSidebarRequest__body">
            {t(
              "A new signing request arrived while you were reviewing another. Please review it carefully before approving.",
            )}
          </div>
        </div>
        <div className="ConfirmSidebarRequest__buttons">
          <Button
            size="md"
            variant="tertiary"
            onClick={handleReject}
            isFullWidth
          >
            {t("Reject")}
          </Button>
          <Button
            size="md"
            variant="secondary"
            onClick={handleReview}
            isFullWidth
          >
            {t("Continue to review")}
          </Button>
        </div>
      </div>
    </View.Content>
  );
};
