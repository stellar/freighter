import React from "react";

import { truncatedPublicKey } from "helpers/stellar";

import { IdenticonImg } from "../IdenticonImg";

import "./styles.scss";

interface IdenticonWrapperElProps {
  isSmall?: boolean;
}

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
  const customStyle = {
    ...(isSmall
      ? {
          "--Icon-padding": "0.2rem",
          "--Icon-dimension": "1.5rem",
        }
      : {}),
  } as React.CSSProperties;

  return (
    <div className="KeyIdenticon">
      <div
        className="KeyIdenticon--icon KeyIdenticon--icon"
        style={customStyle}
      >
        <IdenticonImg publicKey={publicKey} />
      </div>
      <span {...props}>{shortPublicKey}</span>
    </div>
  );
};
