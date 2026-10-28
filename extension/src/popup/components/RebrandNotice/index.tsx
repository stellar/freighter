import React from "react";
import { Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import IconKeySwap from "popup/assets/icon-key-swap.svg?react";

import "./styles.scss";

interface RebrandNoticeProps {
  size: "sm" | "md";
}

export const RebrandNotice = ({ size }: RebrandNoticeProps) => {
  const { t } = useTranslation();

  return (
    <div className={`RebrandNotice RebrandNotice--${size}`}>
      <IconKeySwap className="RebrandNotice__icon" aria-hidden="true" />
      <Text as="span" size={size} weight="medium">
        {t("Freighter is now Varial")}
      </Text>
    </div>
  );
};
