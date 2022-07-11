import React from "react";

import { BackButton } from "popup/basics/buttons/BackButton";

import "./styles.scss";

interface SubviewHeaderProps {
  customBackAction?: () => void;
  customBackIcon?: React.ReactNode;
  title: string;
  hasBackButton?: boolean;
  rightButton?: React.ReactNode;
}

export const SubviewHeader = ({
  customBackAction,
  customBackIcon,
  title,
  hasBackButton = true,
  rightButton,
}: SubviewHeaderProps) => (
  <header className="SubviewHeader">
    {hasBackButton ? (
      <BackButton
        customBackAction={customBackAction}
        customBackIcon={customBackIcon}
      />
    ) : null}
    <div className="SubviewHeader--title">{title}</div>
    {rightButton || <div className="SubviewHeader--spacer"></div>}
  </header>
);
