import React from "react";
import { Icon } from "@stellar/design-system";
import { useHistory } from "react-router-dom";

import "./styles.scss";

interface BackButtonProps {
  customBackAction?: () => void;
  customBackIcon?: React.ReactNode;
  hasBackCopy?: boolean;
}

export const BackButton = ({
  customBackAction,
  customBackIcon,
  hasBackCopy,
}: BackButtonProps) => {
  const history = useHistory();

  return (
    <div
      className={`BackButton ${hasBackCopy ? "BackButton--has-copy" : ""}`}
      onClick={() => {
        if (customBackAction) {
          customBackAction();
        } else {
          history.goBack();
        }
      }}
    >
      {customBackIcon || <Icon.ArrowLeft />}
      {hasBackCopy ? <div className="BackButton__copy">Back</div> : null}
    </div>
  );
};
