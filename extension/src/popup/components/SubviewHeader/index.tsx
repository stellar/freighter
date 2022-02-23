import React from "react";
import { Icon } from "@stellar/design-system";
import { useHistory } from "react-router-dom";

import "./styles.scss";

interface SubviewHeaderProps {
  title: string;
  hasBackButton?: boolean;
}

export const SubviewHeader = ({
  title,
  hasBackButton = true,
}: SubviewHeaderProps) => {
  const history = useHistory();

  return (
    <header className="SubviewHeader">
      {hasBackButton ? (
        <button
          className="SubviewHeader--back-button"
          onClick={() => {
            history.goBack();
          }}
        >
          <Icon.ArrowLeft />
        </button>
      ) : null}

      <div className="SubviewHeader--title">{title}</div>
    </header>
  );
};
