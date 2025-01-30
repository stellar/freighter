import React from "react";
import { Icon } from "@stellar/design-system";
import { useNavigate } from "react-router-dom";

import "./styles.scss";

interface BackButtonProps {
  customBackAction?: () => void;
  customBackIcon?: React.ReactNode;
  hasBackCopy?: boolean;
  customButtonComponent?: React.ReactElement<HTMLButtonElement>;
}

export const BackButton = ({
  customBackAction,
  customBackIcon,
  hasBackCopy,
  customButtonComponent,
}: BackButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (customBackAction) {
      customBackAction();
    } else {
      navigate(-1);
    }
  };

  if (customButtonComponent) {
    const ClonedComponent = customButtonComponent;
    return React.cloneElement(ClonedComponent, { onclick: handleClick });
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
