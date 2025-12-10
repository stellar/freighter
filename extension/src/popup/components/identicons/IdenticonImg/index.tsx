import React from "react";
import { useTranslation } from "react-i18next";
import createStellarIdenticon from "helpers/stellarIdenticon";

import "./styles.scss";

interface IdenticonImgProps {
  publicKey: string;
}

export const IdenticonImg = ({ publicKey }: IdenticonImgProps) => {
  const { t } = useTranslation();
  return (
    <img
      className="IdenticonImg"
      alt={t("account identicon")}
      src={createStellarIdenticon(publicKey).toDataURL()}
      data-testid="identicon-img"
    />
  );
};
