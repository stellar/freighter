import React from "react";
import { useTranslation } from "react-i18next";

import type { FeeAssetOption } from "popup/helpers/reserve";

import "./styles.scss";

export const FeeAssetSelect = ({
  options,
  value,
  onChange,
  className,
}: {
  options: FeeAssetOption[];
  value: string;
  onChange: (asset: string) => void;
  className?: string;
}) => {
  const { t } = useTranslation();

  return (
    <select
      aria-label={t("Fee asset")}
      data-testid="send-amount-fee-asset"
      className={["FeeAssetSelect", className].filter(Boolean).join(" ")}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.asset} value={option.asset}>
          {option.code}
        </option>
      ))}
    </select>
  );
};
