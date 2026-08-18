import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { truncatedFedAddress, truncatedPublicKey } from "helpers/stellar";
import { SelectionTile } from "popup/components/SelectionTile";

import "./styles.scss";

interface AddressTileProps {
  address: string;
  federationAddress?: string;
  recipientName?: string;
  onClick: () => void;
}

export const AddressTile = ({
  address,
  federationAddress,
  recipientName,
  onClick,
}: AddressTileProps) => {
  const { t } = useTranslation();

  if (address) {
    return (
      <SelectionTile
        icon={<IdenticonImg publicKey={address} />}
        primaryText={
          recipientName ||
          (federationAddress
            ? truncatedFedAddress(federationAddress)
            : truncatedPublicKey(address))
        }
        secondaryText={
          recipientName
            ? federationAddress
              ? truncatedFedAddress(federationAddress)
              : truncatedPublicKey(address)
            : undefined
        }
        title={address}
        onClick={onClick}
        testId="address-tile"
      />
    );
  }

  return (
    <SelectionTile
      icon={<Icon.Plus className="TileIcon" />}
      primaryText={t("Send to")}
      secondaryText={t("Choose Recipient")}
      onClick={onClick}
      isEmpty
      testId="address-tile"
    />
  );
};
