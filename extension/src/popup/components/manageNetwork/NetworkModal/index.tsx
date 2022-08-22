import React from "react";

import { InfoBlock } from "popup/basics/InfoBlock";
import { LoadingBackground } from "popup/basics/LoadingBackground";

import "./styles.scss";

interface NetworkModalProps {
  children: React.ReactElement;
  buttonComponent: React.ReactElement;
}

export const NetworkModal = ({
  children,
  buttonComponent,
}: NetworkModalProps) => (
  <div className="NetworkModal">
    <LoadingBackground isActive />
    <div className="NetworkModal__content">
      <InfoBlock
        variant={InfoBlock.variant.warning}
        className="NetworkModal__infoBlock"
      >
        {children}
      </InfoBlock>
      <div className="NetworkModal__button-row">{buttonComponent}</div>
    </div>
  </div>
);
