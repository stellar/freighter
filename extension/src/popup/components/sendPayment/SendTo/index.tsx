import React from "react";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";

import { PopupWrapper } from "popup/basics/PopupWrapper";

import { BackButton } from "popup/basics/Buttons";

import "../styles.scss";

export const SendTo = ({
  destination,
  setDestination,
}: {
  destination: string;
  setDestination: (state: string) => void;
}) => (
  <PopupWrapper>
    <div className="SendTo">
      <BackButton isPopup onClick={() => navigateTo(ROUTES.account)} />
      <div className="header">Send To</div>
      <input
        className="SendTo__input"
        value={destination}
        onChange={(e: React.ChangeEvent<any>) => setDestination(e.target.value)}
      />
      <div>Recent</div>
      <button onClick={() => navigateTo(ROUTES.sendPaymentAmount)}>
        continue
      </button>
    </div>
  </PopupWrapper>
);
