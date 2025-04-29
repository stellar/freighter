import React from "react";

import { truncatedPublicKey } from "helpers/stellar";
import { IdenticonImg } from "../IdenticonImg";

import "./styles.scss";

interface KeyIdenticonProps {
  children?: React.ReactNode;
  accountName: string;
  active?: boolean;
  publicKey: string;
  displayKey?: boolean;
  onClickAccount?: (publicKey: string) => Promise<void>;
}

export const AccountListIdenticon = ({
  children,
  accountName = "",
  publicKey = "",
  displayKey = false,
  onClickAccount,
}: KeyIdenticonProps) => {
  const shortPublicKey = truncatedPublicKey(publicKey);

  const handleMakeAccountActive = () => {
    if (onClickAccount) {
      onClickAccount(publicKey);
    }
  };

  return (
    <div className="AccountListIdenticon">
      <div className="AccountListIdenticon__active-wrapper">
        <div className="AccountListIdenticon__identicon-wrapper">
          <IdenticonImg publicKey={publicKey} />
        </div>
      </div>
      <button
        data-testid="account-list-identicon-button"
        className="AccountListIdenticon__identicon-button"
        onClick={handleMakeAccountActive}
      >
        {displayKey && (
          <>
            <div className="AccountListIdenticon__account-name">
              {accountName}
            </div>
            <div className="AccountListIdenticon__account-num">
              {shortPublicKey} {children}
            </div>{" "}
          </>
        )}
      </button>
    </div>
  );
};
