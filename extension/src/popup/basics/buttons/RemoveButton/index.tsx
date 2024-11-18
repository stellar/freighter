import { Button } from "@stellar/design-system";
import React from "react";

import IconXRemove from "popup/assets/icon-x-remove.svg";

interface RemoveButtonProps {
  onClick: () => void;
}

export const RemoveButton = ({ onClick }: RemoveButtonProps) => (
  <Button size="md" variant="tertiary" onClick={onClick}>
    <img src={IconXRemove} alt="icon x remove" />
  </Button>
);
