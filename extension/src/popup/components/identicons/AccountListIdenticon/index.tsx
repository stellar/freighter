import React from "react";
import { useDispatch } from "react-redux";

import { truncatedPublicKey } from "helpers/stellar";
import { makeAccountActive } from "popup/ducks/accountServices";
import { AppDispatch } from "popup/App";

import { IdenticonImg } from "../IdenticonImg";

import "./styles.scss";

interface KeyIdenticonProps {
  children?: React.ReactNode;
  accountName: string;
  active?: boolean;
  publicKey: string;
  displayKey?: boolean;
  setIsDropdownOpen?: (IsDropdownOpen: boolean) => void;
}

export const AccountListIdenticon = ({
  children,
  accountName = "",
  active = false,
  publicKey = "",
  displayKey = false,
  setIsDropdownOpen,
}: KeyIdenticonProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const shortPublicKey = truncatedPublicKey(publicKey);

  const handleMakeAccountActive = () => {
    if (setIsDropdownOpen) {
      setIsDropdownOpen(false);
    }

    if (!active) {
      dispatch(makeAccountActive(publicKey));
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
