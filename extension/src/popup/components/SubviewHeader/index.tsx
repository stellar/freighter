import React from "react";

import { View } from "popup/basics/layout/View";

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
  <View.AppHeader
    pageTitle={title}
    rightContent={rightButton}
    hasBackButton={hasBackButton}
    customBackAction={customBackAction}
    customBackIcon={customBackIcon}
  />
);
