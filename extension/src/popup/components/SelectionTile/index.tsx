import React from "react";
import { Button, Icon } from "@stellar/design-system";

import "./styles.scss";

interface SelectionTileProps {
  icon: React.ReactNode;
  primaryText: string;
  secondaryText?: string;
  onClick: () => void;
  isEmpty?: boolean;
  useIconWrapper?: boolean;
  testId?: string;
}

export const SelectionTile = ({
  icon,
  primaryText,
  secondaryText,
  onClick,
  isEmpty = false,
  useIconWrapper = true,
  testId,
}: SelectionTileProps) => {
  return (
    <div
      className={`SelectionTile ${isEmpty ? "SelectionTile--empty" : ""}`}
      onClick={onClick}
      data-testid={testId}
    >
      <div className="SelectionTile__content">
        {useIconWrapper ? (
          <div className="SelectionTile__icon">{icon}</div>
        ) : (
          icon
        )}
        <div className="SelectionTile__text">
          <div className="SelectionTile__primary">{primaryText}</div>
          {secondaryText && (
            <div className="SelectionTile__secondary">{secondaryText}</div>
          )}
        </div>
      </div>
      <Button isRounded size="sm" variant="tertiary">
        <Icon.ChevronRight />
      </Button>
    </div>
  );
};
