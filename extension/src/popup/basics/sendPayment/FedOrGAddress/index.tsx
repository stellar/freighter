import React from "react";
import { truncatedPublicKey } from "helpers/stellar";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";

export const FedOrGAddress = ({
  fedAddress,
  gAddress,
}: {
  fedAddress: string;
  gAddress: string;
}) => {
  if (fedAddress) {
    return <span>{fedAddress}</span>;
  }
  return (
    <>
      <IdenticonImg publicKey={gAddress} />
      <span>{truncatedPublicKey(gAddress)}</span>
    </>
  );
};
