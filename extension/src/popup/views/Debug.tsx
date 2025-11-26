import React from "react";
import { useTranslation } from "react-i18next";

// Remove when not needed! 👇

export const Debug = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t("Debug")}</h1>
      <p>{t("Use this page for development helpers")}</p>
      <ul>
        <li>{t("dummy entry")}</li>
      </ul>
    </div>
  );
};
