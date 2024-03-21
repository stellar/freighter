import React, { useRef } from "react";

import { TruncateMiddle } from "popup/components/TruncateMiddle";
import { IdenticonImg } from "../IdenticonImg";

import "./styles.scss";

interface IdenticonWrapperElProps {
  customSize?: {
    dimension: string;
    padding: string;
  };
  isSmall?: boolean;
}

interface KeyIdenticonProps extends IdenticonWrapperElProps {
  publicKey: string;
}

export const KeyIdenticon = ({
  publicKey = "",
  isSmall = false,
  customSize,
  ...props
}: KeyIdenticonProps) => {
  const customStyle = {
    ...(isSmall
      ? {
          // eslint-disable-next-line
          "--Icon-padding": "0.2rem",
          // eslint-disable-next-line
          "--Icon-dimension": "1.5rem",
        }
      : {}),
    ...(customSize
      ? {
          // eslint-disable-next-line
          "--Icon-padding": customSize.padding,
          // eslint-disable-next-line
          "--Icon-dimension": customSize.dimension,
        }
      : {}),
  } as React.CSSProperties;

  const pubKeyParentRef = useRef<HTMLSpanElement>(null);
  const fontSize = isSmall
    ? "12px Inter, sans-serif"
    : "16px Inter, sans-serif";

  return (
    <div className="KeyIdenticon">
      <div className="KeyIdenticon--icon" style={customStyle}>
        <IdenticonImg publicKey={publicKey} />
      </div>
      <span {...props} ref={pubKeyParentRef} className="KeyIdenticon--key">
        <TruncateMiddle
          parentRef={pubKeyParentRef}
          value={publicKey}
          font={fontSize}
        />
      </span>
    </div>
  );
};
