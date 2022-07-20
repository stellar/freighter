import React from "react";
import { useTranslation } from "react-i18next";

import "./styles.scss";

export const PasswordRequirements = () => {
  const { t } = useTranslation();

  return (
    <div className="PasswordRequirements">
      <ul className="PasswordRequirements__list">
        <li>{t("Min 8 characters")}</li>
        <li>{t("At least one uppercase letter")}</li>
      </ul>
    </div>
  );
};
