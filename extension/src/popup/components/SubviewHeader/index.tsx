import React from "react";

import { BackButton } from "popup/basics/BackButton";

import "./styles.scss";

interface SubviewHeaderProps {
  title: string;
  hasBackButton?: boolean;
}

export const SubviewHeader = ({
  title,
  hasBackButton = true,
}: SubviewHeaderProps) => (
  <header className="SubviewHeader">
    {hasBackButton ? <BackButton /> : null}

    <div className="SubviewHeader--title">{title}</div>
  </header>
);
