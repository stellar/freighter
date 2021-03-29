import React from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";

import { COLOR_PALETTE } from "popup/constants/styles";

import { BasicButton } from "popup/basics/Buttons";

import { truncatedPublicKey } from "helpers/stellar";

import { makeAccountActive } from "popup/ducks/authServices";

import WhiteCheckIcon from "popup/assets/icon-white-check.svg";

import { IdenticonImg } from "./IdenticonImg";

const KeyIdenticonWrapperEl = styled.div`
  align-items: center;
  display: flex;
`;

interface CheckedProps {
  checked: boolean;
}

interface ActiveProps {
  active: boolean;
}

const CheckedIconEl = styled.div`
  align-items: center;
  background: ${COLOR_PALETTE.primary};
  border-radius: 5rem;
  display: ${({ checked }: CheckedProps) => (checked ? "flex" : "none")};
  height: 0.8125rem;
  justify-content: center;
  margin: -0.3125rem 0 0 0.875rem;
  padding: 0.0625rem;
  text-align: center;
  width: 0.8125rem;

  img {
    height: 0.3125rem;
    width: 0.4375rem;
  }
`;

const IdenticonWrapperEl = styled.div`
  background: ${COLOR_PALETTE.white};
  border: 0.125rem solid #d2d5db;
  border-radius: 2rem;
  padding: 0.5rem;
  height: 2.1875rem;
  width: 2.1875rem;
`;

const AccountKeyButtonEl = styled(BasicButton)`
  background: none;
  border: 0;
  margin-left: 0.9375rem;
  text-align: left;
  width: 6.0625rem;
`;

const AccountNumberEl = styled.h3`
  font-size: 0.8125rem;
  color: ${({ active }: ActiveProps) =>
    active ? COLOR_PALETTE.primary : COLOR_PALETTE.text};
  margin: 0 0 0.1875rem 0;
  max-height: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PublicKeyEl = styled.span`
  font-size: 0.8125rem;
  color: ${COLOR_PALETTE.grey};
`;

interface KeyIdenticonProps {
  accountName: string;
  active?: boolean;
  checked?: boolean;
  publicKey: string;
  setIsDropdownOpen?: (IsDropdownOpen: boolean) => void;
}

export const AccountListIdenticon = ({
  accountName,
  active = false,
  checked = false,
  publicKey = "",
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
      <IdenticonWrapperEl>
        <IdenticonImg publicKey={publicKey} />
        <CheckedIconEl checked={checked}>
          <img src={WhiteCheckIcon} alt="checked icon" />
        </CheckedIconEl>
      </IdenticonWrapperEl>
      <AccountKeyButtonEl onClick={handleMakeAccountActive}>
        <AccountNumberEl active={active}>{accountName}</AccountNumberEl>
        <PublicKeyEl>{shortPublicKey}</PublicKeyEl>
      </AccountKeyButtonEl>
    </KeyIdenticonWrapperEl>
  );
};
