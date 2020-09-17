import React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import QrCode from "qrcode.react";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import { publicKeySelector } from "popup/ducks/authServices";

const QrEl = styled.div`
  padding: 2.25rem 2.5rem;
`;
const QrCodeContainerEl = styled.div`
  display: flex;
  justify-content: center;
  padding: 2.75rem 0 0.5rem;
`;
const QrCodeEl = styled(QrCode)`
  padding: 15px;
  background: white;
  border-radius: 4px;
  border: 1px solid ${COLOR_PALETTE.primaryMuted};
  margin-bottom: 8px;
`;
const HeaderEl = styled.h1`
  color: ${COLOR_PALETTE.primary}};
  font-weight: ${FONT_WEIGHT.light};
  margin: 1rem 0 0.75rem;
  text-align: center;
`;
const PublicKeyText = styled.p`
  font-family: "Roboto Mono", monospace;
  font-size: 1rem;
  text-align: center;
  line-height: 1;
  padding: 1rem 2rem;
  margin: 0;
  word-break: break-all;
`;

export const QR = () => {
  const publicKey = useSelector(publicKeySelector);

  return (
    <QrEl>
      <HeaderEl>Your Account</HeaderEl>
      <QrCodeContainerEl>
        <QrCodeEl
          style={{
            width: "150px",
            height: "150px",
          }}
          value={publicKey}
        />
      </QrCodeContainerEl>
      <PublicKeyText>{publicKey}</PublicKeyText>
    </QrEl>
  );
};
