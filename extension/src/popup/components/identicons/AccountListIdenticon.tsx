import React from "react";
import Identicon from "react-identicons";
import { useDispatch } from "react-redux";
import styled from "styled-components";

import { COLOR_PALETTE } from "popup/constants/styles";

import { BasicButton } from "popup/basics/Buttons";

import { truncatedPublicKey } from "helpers/stellar";

import { makeAccountActive } from "popup/ducks/authServices";

const KeyIdenticonWrapperEl = styled.div`
  align-items: center;
  display: flex;
`;

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

  ${({ active }: ActiveProps) =>
    active &&
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

const IdenticonEl = styled(Identicon)`
  height: 100% !important;
  width: 100% !important;
`;

const AccountKeyButtonEl = styled(BasicButton)`
  background: none;
  border: 0;
  cursor: ${({ active }: ActiveProps) => (active ? "cursor" : "pointer")};
  margin-left: 0.9375rem;
  text-align: left;
`;

const AccountNumberEl = styled.h3`
  font-size: 0.8125rem;
  color: ${({ active }: ActiveProps) =>
    active ? COLOR_PALETTE.primary : COLOR_PALETTE.text};
  margin: 0 0 0.1875rem 0;
`;

const PublicKeyEl = styled.span`
  font-size: 0.8125rem;
  color: ${COLOR_PALETTE.grey};
`;

interface KeyIdenticonProps {
  accountNumber: number;
  active?: boolean;
  publicKey: string;
}

export const AccountListIdenticon = ({
  accountNumber,
  active = false,
  publicKey = "",
  ...props
}: KeyIdenticonProps) => {
  const dispatch = useDispatch();
  const shortPublicKey = truncatedPublicKey(publicKey);

  const handleMakeAccountActive = () => {
    if (!active) {
      dispatch(makeAccountActive(publicKey));
    }
  };

  return (
    <KeyIdenticonWrapperEl>
      <IdenticonWrapperEl active={active}>
        <IdenticonEl string={shortPublicKey} />
      </IdenticonWrapperEl>
      <AccountKeyButtonEl active={active} onClick={handleMakeAccountActive}>
        <AccountNumberEl active={active}>
          Account {accountNumber}
        </AccountNumberEl>
        <PublicKeyEl {...props}>{shortPublicKey}</PublicKeyEl>
      </AccountKeyButtonEl>
    </KeyIdenticonWrapperEl>
  );
};
