import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

import { StrKey } from "stellar-sdk";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";

import { PopupWrapper } from "popup/basics/PopupWrapper";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { BackButton } from "popup/basics/BackButton";
import { BottomNav } from "popup/components/BottomNav";

import { getAccountBalances } from "@shared/api/internal";
// ALEC TODO - move to somewhere else?
import { defaultAccountBalances } from "popup/views/Account";

import { Loader } from "@stellar/design-system";

import "../styles.scss";

export const SendTo = ({
  destination,
  setDestination,
}: {
  destination: string;
  setDestination: (state: string) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [destinationBalances, setDestinationBalances] = useState(
    defaultAccountBalances,
  );
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  // ALEC TODO - add debounce stuff
  useEffect(() => {
    if (destination.startsWith("M")) {
      // TODO: remove when type is added to stellar-sdk
      // @ts-ignore
      if (!StrKey.isValidMed25519PublicKey(destination)) {
        setIsValidAddress(false);
      }
    } else if (!StrKey.isValidEd25519PublicKey(destination)) {
      setIsValidAddress(false);
    }

    const fetchDestinationBalances = async () => {
      try {
        setIsLoading(true);
        const res = await getAccountBalances({
          publicKey: destination,
          networkDetails,
        });
        setDestinationBalances(res);
      } catch (e) {
        console.error(e);
      }

      setIsLoading(false);
    };
    fetchDestinationBalances();
  }, [destination, networkDetails]);

  // ALEC TODO - remove
  console.log(destinationBalances);

  return (
    <PopupWrapper>
      <BackButton hasBackCopy />
      <div className="SendTo">
        <div className="header">Send To</div>
        <input
          className="SendTo__input"
          value={destination}
          onChange={(e: React.ChangeEvent<any>) =>
            setDestination(e.target.value)
          }
        />
        {!isValidAddress && <span>Invalid Stellar Address</span>}
        {isLoading && (
          <div>
            <Loader />
          </div>
        )}
        <button onClick={() => navigateTo(ROUTES.sendPaymentAmount)}>
          continue
        </button>
      </div>
      <BottomNav />
    </PopupWrapper>
  );
};
