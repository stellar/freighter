import React from "react";
import { Icon } from "@stellar/design-system";
import { useHistory } from "react-router-dom";

import "./styles.scss";

interface BackButtonProps {
  goBack?: () => void;
  hasBackCopy?: boolean;
}

export const BackButton = ({ goBack, hasBackCopy }: BackButtonProps) => {
  const history = useHistory();
  const handleClick = goBack || history.goBack;

  return (
    <button className="BackButton" onClick={handleClick}>
      <Icon.ArrowLeft />
      {hasBackCopy ? <div className="BackButton--copy">Back</div> : null}
    </button>
  );
};
