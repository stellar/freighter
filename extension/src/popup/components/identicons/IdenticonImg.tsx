import React from "react";
import createStellarIdenticon from "stellar-identicon-js";
import styled from "styled-components";

const IdenticonImgEl = styled.img`
  height: 100%;
  width: 100%;
`;

interface IdenticonImgProps {
  publicKey: string;
}

export const IdenticonImg = ({ publicKey }: IdenticonImgProps) => (
  <IdenticonImgEl
    alt="account identicon"
    src={createStellarIdenticon(publicKey).toDataURL()}
  />
);
