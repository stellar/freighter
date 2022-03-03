import React from "react";
import { Card } from "@stellar/design-system";

import "./styles.scss";

interface MnemonicDisplayProps {
  mnemonicPhrase: string;
  isPopupView?: boolean;
}

export const MnemonicDisplay = ({
  mnemonicPhrase,
  isPopupView,
}: MnemonicDisplayProps) => (
  <div className="MnemonicDisplay">
    <Card variant={Card.variant.highlight}>
      <ol
        className={`MnemonicDisplay--ordered-list ${
          isPopupView ? "MnemonicDisplay--ordered-list--popup-view" : ""
        }`}
      >
        {mnemonicPhrase.split(" ").map((word: string) => (
          <li key={word}>
            <strong>{word}</strong>
          </li>
        ))}
      </ol>
    </Card>
  </div>
);
