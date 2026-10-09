import React from "react";
import { useTranslation } from "react-i18next";
import Avatar from "boring-avatars";

import { VARIAL_AVATAR_COLORS } from "./colors";

import "./styles.scss";

interface IdenticonImgProps {
  publicKey: string;
}

export const IdenticonImg = ({ publicKey }: IdenticonImgProps) => {
  const { t } = useTranslation();
  return (
    <Avatar
      className="IdenticonImg"
      name={publicKey}
      variant="marble"
      colors={VARIAL_AVATAR_COLORS}
      size="100%"
      aria-label={t("account identicon")}
      data-testid="identicon-img"
    />
  );
};
