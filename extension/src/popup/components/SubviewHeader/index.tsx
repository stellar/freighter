import React from "react";

import { BackButton } from "popup/basics/BackButton";

import "./styles.scss";

interface SubviewHeaderProps {
  customBackAction?: () => void;
  title: string;
  hasBackButton?: boolean;
}

export const SubviewHeader = ({
  customBackAction,
  title,
  hasBackButton = true,
}: SubviewHeaderProps) => (
  <header className="SubviewHeader">
    {hasBackButton ? <BackButton customBackAction={customBackAction} /> : null}
    <div className="SubviewHeader--title">{title}</div>
    <div className="SubviewHeader--spacer"></div>
  </header>
);
