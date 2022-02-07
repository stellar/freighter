import React from "react";
import { useHistory } from "react-router-dom";

import { BackButton } from "popup/basics/Buttons";
import { FullscreenStyle } from "./FullscreenStyle";

export const Onboarding = ({
  goBack,
  children,
}: {
  goBack?: () => void;
  children: React.ReactNode;
}) => {
  const history = useHistory();
  const isNewTabSession = history.length === 1;

  return (
    <>
      <FullscreenStyle />
      {goBack && !isNewTabSession ? <BackButton onClick={goBack} /> : null}
      {children}
    </>
  );
};
