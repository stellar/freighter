import React from "react";
import { useDispatch } from "react-redux";

import { truncatedPublicKey } from "helpers/stellar";
import { makeAccountActive } from "popup/ducks/accountServices";

import { IdenticonImg } from "../IdenticonImg";

import "./styles.scss";

interface KeyIdenticonProps {
  accountName: string;
  active?: boolean;
  publicKey: string;
  displayKey?: boolean;
  setIsDropdownOpen?: (IsDropdownOpen: boolean) => void;
}

export const AccountListIdenticon = ({
  accountName = "",
  active = false,
  publicKey = "",
  displayKey = false,
  setIsDropdownOpen,
}: KeyIdenticonProps) => {
  const dispatch = useDispatch();
  const shortPublicKey = truncatedPublicKey(publicKey);

  const handleMakeAccountActive = () => {
    if (!active) {
      dispatch(makeAccountActive(publicKey));
    }
    if (setIsDropdownOpen) {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="AccountListIdenticon">
      <div
        className={`AccountListIdenticon__active-wrapper ${
          active ? "active" : null
        }`}
      >
        <div className="AccountListIdenticon__identicon-wrapper">
          <IdenticonImg publicKey={publicKey} />
        </div>
      </div>
      <button
        className="AccountListIdenticon__identicon-button"
        onClick={handleMakeAccountActive}
      >
        {displayKey && (
          <>
            <div className="AccountListIdenticon__account-name">
              {accountName}
            </div>
            <div className="AccountListIdenticon__account-num">
              {shortPublicKey}
            </div>{" "}
          </>
        )}
      </button>
    </div>
  );
};
