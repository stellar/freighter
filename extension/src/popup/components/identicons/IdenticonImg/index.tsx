import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";
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

  // Same fallback as mobile's Avatar: a generic user icon, never an avatar
  // that looks like a real account.
  if (!publicKey) {
    return (
      <div
        className="IdenticonImg IdenticonImg--placeholder"
        role="img"
        aria-label={t("account identicon")}
        data-testid="identicon-img"
      >
        <Icon.User01 />
      </div>
    );
  }

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
