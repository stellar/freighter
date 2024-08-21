import React from "react";
import { Icon } from "@stellar/design-system";
import { useHistory } from "react-router-dom";

import "./styles.scss";

interface BackButtonProps {
  customBackAction?: () => void;
  customBackIcon?: React.ReactNode;
  hasBackCopy?: boolean;
  customButtonComponent?: React.ReactElement;
}

export const BackButton = ({
  customBackAction,
  customBackIcon,
  hasBackCopy,
  customButtonComponent,
}: BackButtonProps) => {
  const history = useHistory();

  const handleClick = () => {
    if (customBackAction) {
      customBackAction();
    } else {
      history.goBack();
    }
  };

  if (customButtonComponent) {
    return React.cloneElement(customButtonComponent, { onClick: handleClick });
  }

  return (
    <div
      className={`BackButton ${hasBackCopy ? "BackButton--has-copy" : ""}`}
      data-testid="BackButton"
      onClick={handleClick}
    >
      {customBackIcon || <Icon.ArrowLeft />}
      {hasBackCopy ? <div className="BackButton__copy">Back</div> : null}
    </div>
  );
};
