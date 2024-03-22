import React from "react";
import { CopyText, Icon } from "@stellar/design-system";

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
  allowCopy?: boolean;
  publicKey: string;
  iconSide?: "left" | "right";
  keyTruncationAmount?: number;
}

export const KeyIdenticon = ({
  allowCopy = false,
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
          // eslint-disable-next-line
          "--Icon-padding": "0.2rem",
          // eslint-disable-next-line
          "--Icon-dimension": "1.5rem",
          marginRight: iconSide === "left" ? "0.5rem" : 0,
          marginLeft: iconSide === "right" ? "0.5rem" : 0,
        }
      : {
          marginRight: !allowCopy ? "0.5rem" : 0,
        }),
    ...(customSize
      ? {
          // eslint-disable-next-line
          "--Icon-padding": customSize.padding,
          // eslint-disable-next-line
          "--Icon-dimension": customSize.dimension,
          marginRight: iconSide === "left" ? "0.5rem" : 0,
          marginLeft: iconSide === "right" ? "0.5rem" : 0,
        }
      : {
          marginRight: !allowCopy ? "0.5rem" : 0,
        }),
  } as React.CSSProperties;

  return (
    <div className="KeyIdenticon">
      {iconSide === "left" && (
        <div className="KeyIdenticon--icon" style={customStyle}>
          <IdenticonImg publicKey={publicKey} />
        </div>
      )}
      {allowCopy ? (
        <CopyText textToCopy={publicKey}>
          <span {...props} className="KeyIdenticon--key">
            <div className="CopyContractId">
              <Icon.ContentCopy />
              <span className="Value">
                {truncateString(publicKey, keyTruncationAmount)}
              </span>
            </div>
          </span>
        </CopyText>
      ) : (
        <span {...props} className="KeyIdenticon--key">
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
