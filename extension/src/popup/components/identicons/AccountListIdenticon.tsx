import React from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";

import { COLOR_PALETTE } from "popup/constants/styles";

import { BasicButton } from "popup/basics/Buttons";

import { truncatedPublicKey } from "helpers/stellar";

import { makeAccountActive } from "popup/ducks/authServices";

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

const IdenticonWrapperEl = styled.div`
  background: ${COLOR_PALETTE.white};
  border: 0.125rem solid #d2d5db;
  border-radius: 2rem;
  padding: 0.5rem;
  height: 2.1875rem;
  width: 2.1875rem;

  ${({ checked }: CheckedProps) =>
    checked &&
    `
  {
    &:after {
      background: ${COLOR_PALETTE.primary};
      border-radius: 5rem;
      color: ${COLOR_PALETTE.white};
      content: "✓";
      display: block;
      font-size: .5rem;
      font-weight: 800;
      margin: -0.3125rem 0 0 0.875rem;
      padding: .0625rem;
      text-align: center;
      width: .6875rem;
    }
  }
  `}
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
      <IdenticonWrapperEl checked={checked}>
        <IdenticonImg publicKey={publicKey} />
      </IdenticonWrapperEl>
      <AccountKeyButtonEl onClick={handleMakeAccountActive}>
        <AccountNumberEl active={active}>{accountName}</AccountNumberEl>
        <PublicKeyEl>{shortPublicKey}</PublicKeyEl>
      </AccountKeyButtonEl>
    </KeyIdenticonWrapperEl>
  );
};
