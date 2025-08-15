import { Button, Icon } from "@stellar/design-system";
import React from "react";

interface RemoveButtonProps {
  onClick: () => void;
}

export const RemoveButton = ({ onClick }: RemoveButtonProps) => (
  <Button isRounded size="md" variant="tertiary" onClick={onClick}>
    <Icon.MinusCircle width="18px" height="18px" />
  </Button>
);
