import React from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";

import { BasicButton } from "popup/basics/Buttons";

import { truncatedPublicKey } from "helpers/stellar";

import { makeAccountActive } from "popup/ducks/accountServices";

import { IdenticonImg } from "./IdenticonImg";

const KeyIdenticonWrapperEl = styled.div`
  align-items: center;
  display: flex;
`;

interface ActiveProps {
  active: boolean;
}

const IdenticonWrapperEl = styled.div`
  background: var(--pal-brand-primary-on);
  border-radius: 2rem;
  height: 2rem;
  width: 2rem;
  margin: 0.125rem;
  padding: 0.25rem;
`;

const ActiveWrapperEl = styled.div`
  background: none;
  border: ${({ active }: ActiveProps) =>
    active ? "0.125rem solid var(--pal-success-border)" : "none"};
  border-radius: 2rem;
`;

const AccountKeyButtonEl = styled(BasicButton)`
  background: none;
  border: 0;
  margin-left: 1rem;
  text-align: left;
  width: 100%;
  font-size: 0.875rem;
  line-height: 1.375rem;
  display: flex;
  flex-flow: row wrap;
`;

const AccountNameEl = styled.div`
  color: var(--pal-text-primary);
  margin: 0 0 0.1875rem 0;
  max-height: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

const AccountNumEl = styled.div`
  color: var(--pay-text-tertiary);
  width: 100%;
`;

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

      if (setIsDropdownOpen) {
        setIsDropdownOpen(false);
      }
    }
  };

  return (
    <KeyIdenticonWrapperEl>
      <ActiveWrapperEl active={active}>
        <IdenticonWrapperEl>
          <IdenticonImg publicKey={publicKey} />
        </IdenticonWrapperEl>
      </ActiveWrapperEl>
      <AccountKeyButtonEl onClick={handleMakeAccountActive}>
        {displayKey && (
          <>
            <AccountNameEl>{accountName}</AccountNameEl>
            <AccountNumEl>{shortPublicKey}</AccountNumEl>{" "}
          </>
        )}
      </AccountKeyButtonEl>
    </KeyIdenticonWrapperEl>
  );
};
