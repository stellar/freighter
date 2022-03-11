import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import debounce from "lodash/debounce";
import { StrKey } from "stellar-sdk";

import { getAccountBalances } from "@shared/api/internal";
import { truncatedPublicKey } from "helpers/stellar";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { BackButton } from "popup/basics/BackButton";
import { BottomNav } from "popup/components/BottomNav";
import { defaultAccountBalances } from "popup/views/Account";
import { saveDestination } from "popup/ducks/transactionData";

import { Loader } from "@stellar/design-system";

import "../styles.scss";

export const SendTo = ({ destination }: { destination: string }) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [destinationBalances, setDestinationBalances] = useState(
    defaultAccountBalances,
  );
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const validatePublicKey = (publicKey: string) => {
    if (publicKey.startsWith("M")) {
      // TODO: remove when type is added to stellar-sdk
      // @ts-ignore
      if (!StrKey.isValidMed25519PublicKey(publicKey)) {
        setIsValidAddress(false);
      }
    } else if (!StrKey.isValidEd25519PublicKey(publicKey)) {
      setIsValidAddress(false);
    } else {
      setIsValidAddress(true);
    }
  };

  const debounceValidate = useCallback(
    debounce(async (addressInput: string) => {
      validatePublicKey(addressInput);

      try {
        const res = await getAccountBalances({
          publicKey: addressInput,
          networkDetails,
        });
        setDestinationBalances(res);
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    }, 2000),
    [],
  );

  useEffect(() => {
    setIsLoading(true);
    debounceValidate(destination);
  }, [destination, networkDetails, debounceValidate]);

  const handleContinue = () => {
    dispatch(saveDestination(destination));
    navigateTo(ROUTES.sendPaymentAmount);
  };

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
        {/* TODO - use form validation */}
        {!isValidAddress && !isLoading && destination !== "" && (
          <span>Invalid Stellar Address</span>
        )}
        {isLoading && destination !== "" && (
          <div>
            <Loader />
          </div>
        )}
        {!isLoading && destination !== "" && !destinationBalances.isFunded && (
          <span>Account doesn't exist</span>
        )}
        {!isLoading && destination !== "" && destinationBalances.isFunded && (
          <div>Address: {truncatedPublicKey(destination)}</div>
        )}
        <button onClick={() => handleContinue()}>continue</button>
      </div>
      <BottomNav />
    </PopupWrapper>
  );
};
