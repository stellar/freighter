import React from "react";
import { useDispatch } from "react-redux";

import { truncatedPublicKey } from "helpers/stellar";
import { makeAccountActive } from "popup/ducks/accountServices";
import { resetAccountBalanceStatus } from "popup/ducks/transactionSubmission";

import { IdenticonImg } from "../IdenticonImg";

import "./styles.scss";

interface KeyIdenticonProps {
  children?: React.ReactNode;
  accountName: string;
  active?: boolean;
  publicKey: string;
  displayKey?: boolean;
  setIsDropdownOpen?: (IsDropdownOpen: boolean) => void;
  setLoading?: (isLoading: boolean) => void;
}

export const AccountListIdenticon = ({
  children,
  accountName = "",
  active = false,
  publicKey = "",
  displayKey = false,
  setIsDropdownOpen,
  setLoading,
}: KeyIdenticonProps) => {
  const dispatch = useDispatch();
  const shortPublicKey = truncatedPublicKey(publicKey);

  const handleMakeAccountActive = () => {
    // If this account is already active (selected) we don't need to load any
    // more stuff, so let's just collapse the dropdown in this case
    if (!active && setLoading) {
      setLoading(true);
    }

    if (setIsDropdownOpen) {
      setIsDropdownOpen(false);
    }

    if (!active) {
      dispatch(makeAccountActive(publicKey));
      dispatch(resetAccountBalanceStatus());
    }
  };

  return (
    <div className="AccountListIdenticon">
      <div
        className={`AccountListIdenticon__active-wrapper ${
          active ? "active" : ""
        }`}
      >
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
