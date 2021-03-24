import React from "react";
import styled from "styled-components";

import { COLOR_PALETTE } from "popup/constants/styles";

import { truncatedPublicKey } from "helpers/stellar";

import { IdenticonImg } from "./IdenticonImg";

const KeyIdenticonWrapperEl = styled.div`
  align-items: center;
  display: flex;
`;

interface IdenticonWrapperElProps {
  isSmall?: boolean;
}

const IdenticonWrapperEl = styled.div`
  background: ${COLOR_PALETTE.white};
  border: 0.125rem solid #d2d5db;
  border-radius: 2rem;
  display: flex;
  padding: ${({ isSmall }: IdenticonWrapperElProps) =>
    isSmall ? "0.2rem" : "0.5rem"};
  height: ${({ isSmall }: IdenticonWrapperElProps) =>
    isSmall ? "1.375rem" : "2.1875rem"};
  margin-right: 0.5rem;
  width: ${({ isSmall }: IdenticonWrapperElProps) =>
    isSmall ? "1.375rem" : "2.1875rem"};
`;

const PublicKeyEl = styled.span`
  font-size: 0.875rem;
  color: ${({ color }) => color || COLOR_PALETTE.secondaryText};
  margin-right: 1rem;
  opacity: 0.7;
`;

interface KeyIdenticonProps extends IdenticonWrapperElProps {
  color?: string;
  publicKey: string;
}

export const KeyIdenticon = ({
  color = "",
  publicKey = "",
  isSmall = false,
  ...props
}: KeyIdenticonProps) => {
  const shortPublicKey = truncatedPublicKey(publicKey);
  return (
    <KeyIdenticonWrapperEl>
      <IdenticonWrapperEl isSmall={isSmall}>
        <IdenticonImg publicKey={publicKey} />
      </IdenticonWrapperEl>
      <PublicKeyEl color={color} {...props}>
        {shortPublicKey}
      </PublicKeyEl>
    </KeyIdenticonWrapperEl>
  );
};
