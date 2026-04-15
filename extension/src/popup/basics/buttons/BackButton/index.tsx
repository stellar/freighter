import React from "react";
import { Icon } from "@stellar/design-system";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "./styles.scss";

interface BackButtonProps {
  customBackAction?: () => void;
  customBackIcon?: React.ReactNode;
  hasBackCopy?: boolean;
  customButtonComponent?: React.ReactElement<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >;
}

export const BackButton = ({
  customBackAction,
  customBackIcon,
  hasBackCopy,
  customButtonComponent,
}: BackButtonProps) => {
  const { t } = useTranslation();
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
    return React.cloneElement(ClonedComponent, { onClick: handleClick });
  }

  return (
    <div
      className={`BackButton ${hasBackCopy ? "BackButton--has-copy" : ""}`}
      data-testid="BackButton"
      onClick={handleClick}
    >
      {customBackIcon || <Icon.ArrowLeft />}
      {hasBackCopy ? <div className="BackButton__copy">{t("Back")}</div> : null}
    </div>
  );
};
