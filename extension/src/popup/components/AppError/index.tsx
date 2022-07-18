import React from "react";
import { useTranslation } from "react-i18next";

import "./styles.scss";

export const AppError = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();

  return (
    <div className="AppError">
      <div>
        <h1>{t("An error occurred")}</h1>
        <p>{children}</p>
      </div>
    </div>
  );
};
