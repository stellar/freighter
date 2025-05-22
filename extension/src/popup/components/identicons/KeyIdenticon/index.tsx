import React from "react";
import { CopyText } from "@stellar/design-system";

import { CopyValue } from "popup/components/CopyValue";
import { truncateString } from "helpers/stellar";
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
  isCopyAllowed?: boolean;
  publicKey: string;
  iconSide?: "left" | "right";
  keyTruncationAmount?: number;
}

export const KeyIdenticon = ({
  isCopyAllowed = false,
  publicKey = "",
  isSmall = false,
  customSize,
  keyTruncationAmount,
  iconSide = "left",
  ...props
}: KeyIdenticonProps) => {
  const customStyle = {
    ...(isSmall
      ? {
          "--Icon-padding": "0.2rem",

          "--Icon-dimension": "1.5rem",
          marginRight: iconSide === "left" ? "0.5rem" : 0,
          marginLeft: iconSide === "right" ? "0.5rem" : 0,
        }
      : {
          marginRight: !isCopyAllowed ? "0.5rem" : 0,
        }),
    ...(customSize
      ? {
          "--Icon-padding": customSize.padding,

          "--Icon-dimension": customSize.dimension,
          marginRight: iconSide === "left" ? "0.5rem" : 0,
          marginLeft: iconSide === "right" ? "0.5rem" : 0,
        }
      : {
          marginRight: !isCopyAllowed ? "0.5rem" : 0,
        }),
  } as React.CSSProperties;

  return (
    <div className="KeyIdenticon">
      {iconSide === "left" && (
        <div className="KeyIdenticon--icon" style={customStyle}>
          <IdenticonImg publicKey={publicKey} />
        </div>
      )}
      {isCopyAllowed ? (
        <CopyText textToCopy={publicKey}>
          <span {...props} className="KeyIdenticon--key">
            <CopyValue
              value={publicKey}
              displayValue={truncateString(publicKey, keyTruncationAmount)}
            />
          </span>
        </CopyText>
      ) : (
        <span
          {...props}
          className="KeyIdenticon--key"
          data-testid="KeyIdenticonKey"
        >
          {truncateString(publicKey, keyTruncationAmount)}
        </span>
      )}
      {iconSide === "right" && (
        <div className="KeyIdenticon--icon" style={customStyle}>
          <IdenticonImg publicKey={publicKey} />
        </div>
      )}
    </div>
  );
};
