import React from "react";

import { View } from "popup/basics/layout/View";

import "./styles.scss";

interface SubviewHeaderProps {
  customBackAction?: () => void;
  customBackIcon?: React.ReactNode;
  title: string | React.ReactNode;
  subtitle?: React.ReactNode;
  hasBackButton?: boolean;
  rightButton?: React.ReactNode;
  /** Sits in the left slot, after the back button if there is one. */
  leftButton?: React.ReactNode;
  /** Forwarded to the back/close button itself, not this header's container. */
  "data-testid"?: string;
  /** See `View.AppHeader`'s `isFloating`. */
  isFloating?: boolean;
}

export const SubviewHeader = ({
  customBackAction,
  customBackIcon,
  title,
  subtitle,
  hasBackButton = true,
  rightButton,
  leftButton,
  "data-testid": dataTestId,
  isFloating,
}: SubviewHeaderProps) => (
  <View.AppHeader
    isFloating={isFloating}
    pageTitle={title}
    pageSubtitle={subtitle}
    leftContent={leftButton}
    rightContent={rightButton}
    hasBackButton={hasBackButton}
    customBackAction={customBackAction}
    customBackIcon={customBackIcon}
    backButtonTestId={dataTestId}
  />
);
