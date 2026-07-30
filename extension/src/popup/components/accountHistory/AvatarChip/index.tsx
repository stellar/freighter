import React from "react";

import { Account } from "@shared/api/types/types";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { truncateString } from "helpers/stellar";

import "./styles.scss";

/**
 * Renders a counterparty (to/from) address as an identicon + label. When the
 * address belongs to one of the user's own accounts the account name is shown
 * ("Account 1"); otherwise the address is truncated ("GCTU…FCAN").
 */
export const AvatarChip = ({
  address,
  allAccounts = [],
}: {
  address: string;
  allAccounts?: Account[];
}) => {
  const named = allAccounts.find((account) => account.publicKey === address);

  return (
    <div className="AvatarChip" data-testid="avatar-chip">
      <div className="AvatarChip__icon">
        <IdenticonImg publicKey={address} />
      </div>
      <span className="AvatarChip__label" data-testid="avatar-chip-label">
        {named ? named.name : truncateString(address)}
      </span>
    </div>
  );
};
