import React from "react";
import { useTranslation } from "react-i18next";

import "./styles.scss";

const PERCENTAGE_OPTIONS = [
  ["25%", 25],
  ["50%", 50],
  ["75%", 75],
] as const;

export interface PercentageButtonsProps {
  onSelect: (pct: number) => void;
}

export const PercentageButtons = ({ onSelect }: PercentageButtonsProps) => {
  const { t } = useTranslation();
  return (
    <div className="PercentageButtons">
      {PERCENTAGE_OPTIONS.map(([label, pct]) => (
        <button
          key={label}
          className="PercentageButtons__btn"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onSelect(pct);
          }}
        >
          {label}
        </button>
      ))}
      <button
        className="PercentageButtons__btn"
        type="button"
        data-testid="SendAmountSetMax"
        onClick={(e) => {
          e.preventDefault();
          onSelect(100);
        }}
      >
        {t("Max")}
      </button>
    </div>
  );
};
