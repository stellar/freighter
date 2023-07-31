import React from "react";
import { useTranslation } from "react-i18next";

import { ModalWrapper } from "popup/basics/Modal";
import { WarningMessage, WarningMessageVariant } from "../WarningMessages";
import "./index.scss";

export const Blob = () => {
  const { t } = useTranslation();
  return (
    <div className="Blob">
      <ModalWrapper>
        <WarningMessage
          handleCloseClick={() => window.close()}
          isActive
          variant={WarningMessageVariant.warning}
          header={t("SIGNING UNKNOWN DATA")}
        >
          <p>
            You are attempting to sign arbitrary data, please use extreme caution and understand the implications of signing this data. 
          </p>
        </WarningMessage>
      </ModalWrapper>
    </div>
  )
}