import React from "react";
import { useTranslation } from "react-i18next";
import createStellarIdenticon from "helpers/stellarIdenticon";

import "./styles.scss";

interface IdenticonImgProps {
  publicKey: string;
}

export const IdenticonImg = ({ publicKey }: IdenticonImgProps) => (
  <img
    className="IdenticonImg"
    alt="account identicon"
    src={createStellarIdenticon(publicKey).toDataURL()}
    data-testid="identicon-img"
  />
);
