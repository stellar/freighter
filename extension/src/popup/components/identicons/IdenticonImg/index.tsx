import React from "react";
import { useTranslation } from "react-i18next";
import Avatar from "boring-avatars";
import { StrKey } from "stellar-sdk";

import { VARIAL_AVATAR_COLORS } from "./colors";

import "./styles.scss";

interface IdenticonImgProps {
  publicKey: string;
}

// A muxed (M…) address wraps a G… account, so it shows that account's avatar.
// Must match freighter-mobile's avatarSeed.
const avatarSeed = (address: string) =>
  address.startsWith("M") && StrKey.isValidMed25519PublicKey(address)
    ? StrKey.encodeEd25519PublicKey(
        StrKey.decodeMed25519PublicKey(address).subarray(0, 32),
      )
    : address;

export const IdenticonImg = ({ publicKey }: IdenticonImgProps) => {
  const { t } = useTranslation();
  return (
    <Avatar
      className="IdenticonImg"
      name={avatarSeed(publicKey)}
      variant="marble"
      colors={VARIAL_AVATAR_COLORS}
      size="100%"
      aria-label={t("account identicon")}
      data-testid="identicon-img"
    />
  );
};
