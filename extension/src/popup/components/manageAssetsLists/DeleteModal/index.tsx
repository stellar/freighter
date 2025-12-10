import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@stellar/design-system";

import { LoadingBackground } from "popup/basics/LoadingBackground";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

interface DeleteModalProps {
  handleCancel: () => void;
  handleSubmit: () => void;
}

export const DeleteModal = ({
  handleCancel,
  handleSubmit,
}: DeleteModalProps) => {
  const { t } = useTranslation();

  return (
    <div className="DeleteModal">
      <View.Content>
        <div className="DeleteModal__content">
          <div className="DeleteModal__title">
            {t("Are you sure you want to delete this list?")}
          </div>
          <div className="DeleteModal__body">
            {`${t("Are you sure you want to delete this list?")} `}
            {t("If you delete this list, you will have to re-add it manually.")}
          </div>
          <div className="DeleteModal__button-row">
            <Button
              size="md"
              type="button"
              isFullWidth
              variant="secondary"
              onClick={handleCancel}
            >
              {t("Cancel")}
            </Button>
            <Button
              size="md"
              type="button"
              isFullWidth
              variant="error"
              onClick={handleSubmit}
            >
              {t("Confirm delete")}
            </Button>
          </div>
        </div>
      </View.Content>
      <LoadingBackground isActive />
    </div>
  );
};
