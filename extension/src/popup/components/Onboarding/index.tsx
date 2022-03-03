import React from "react";
import { useHistory } from "react-router-dom";

import { BackButton } from "popup/basics/BackButton";

import "./styles.scss";

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
    <div className="Onboarding">
      {goBack && !isNewTabSession ? <BackButton hasBackCopy /> : null}
      {children}
    </div>
  );
};
