import React from "react";
import { Icon } from "@stellar/design-system";
import { useHistory } from "react-router-dom";

import "./styles.scss";

interface BackButtonProps {
  hasBackCopy?: boolean;
}

export const BackButton = ({ hasBackCopy }: BackButtonProps) => {
  const history = useHistory();

  return (
    <button
      className="BackButton"
      onClick={() => {
        history.goBack();
      }}
    >
      <Icon.ArrowLeft />
      {hasBackCopy ? <div className="BackButton--copy">Back</div> : null}
    </button>
  );
};
