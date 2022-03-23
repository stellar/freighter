import React from "react";
import { Icon } from "@stellar/design-system";
import { useHistory } from "react-router-dom";

import "./styles.scss";

interface BackButtonProps {
  customBackAction?: () => void;
  hasBackCopy?: boolean;
}

export const BackButton = ({
  customBackAction,
  hasBackCopy,
}: BackButtonProps) => {
  const history = useHistory();

  return (
    <button
      className={`BackButton ${hasBackCopy ? "BackButton--has-copy" : ""}`}
      onClick={() => {
        if (customBackAction) {
          customBackAction();
        } else {
          history.goBack();
        }
      }}
    >
      <Icon.ArrowLeft />
      {hasBackCopy ? <div className="BackButton__copy">Back</div> : null}
    </button>
  );
};
