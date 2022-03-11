import React, { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import debounce from "lodash/debounce";
import { StrKey } from "stellar-sdk";
import { Formik, Form, Field, FieldProps } from "formik";

import { getAccountBalances } from "@shared/api/internal";
import { truncatedPublicKey } from "helpers/stellar";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { FormRows } from "popup/basics/Forms";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { BackButton } from "popup/basics/BackButton";
import { BottomNav } from "popup/components/BottomNav";
import { defaultAccountBalances } from "popup/views/Account";

import {
  Input,
  Loader,
  Button,
  TextLink,
  InfoBlock,
} from "@stellar/design-system";

// ALEC TODO - split up, or not?
import "../styles.scss";

export const SendTo = ({
  destination,
  setDestination,
}: {
  destination: string;
  setDestination: (state: string) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isValidKey, setIsValidKey] = useState(false);
  const [destinationBalances, setDestinationBalances] = useState(
    defaultAccountBalances,
  );
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const validPublicKey = (publicKey: string) => {
    // ALEC TODO - remove
    console.log("validating pubkey");

    if (publicKey.startsWith("M")) {
      // TODO: remove when type is added to stellar-sdk
      // @ts-ignore
      if (!StrKey.isValidMed25519PublicKey(publicKey)) {
        // return false;
        setIsValidKey(false);
      }
    } else if (!StrKey.isValidEd25519PublicKey(publicKey)) {
      // ALEC TODO - remove
      console.log("invalid key");
      // return false;
      setIsValidKey(false);
    } else {
      setIsValidKey(true);
    }
    // return true;
  };

  const debounceValidate = useCallback(
    debounce(async (addressInput: string) => {
      validPublicKey(addressInput);
      // if (!validPublicKey(addressInput)) {
      //   return "invalid public key";
      // }

      try {
        const res = await getAccountBalances({
          publicKey: addressInput,
          networkDetails,
        });
        // ALEC TODO - need?
        setDestinationBalances(res);
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
      return undefined;
    }, 2000),
    [],
  );
  // ALEC TODO - uncomment
  useEffect(() => {
    // ALEC TODO - remove
    console.log("in useEffect");
    setIsLoading(true);
    debounceValidate(destination);
  }, [destination, networkDetails, debounceValidate]);

  // // ALEC TODO - keep?
  // const tryValidate = (destinationInput: any) => {
  //   setIsLoading(true);
  //   const ret = debounceValidate(destinationInput);
  //   // ALEC TODO - remove
  //   console.log("return of debounceValidate:", ret);
  //   return ret;
  // };

  // ALEC TODO - dont hardcode
  const recentAccounts = [
    "GBMPTWD752SEBXPN4OF6A6WEDVNB4CJY4PR63J5L6OOYR3ISMG3TA6JZ",
    "GD4PLJJJK4PN7BETZLVQBXMU6JQJADKHSAELZZVFBPLNRIXRQSM433II",
    "GB4SFZUZIWKAUAJW2JR7CMBHZ2KNKGF3FMGMO7IF5P3EYXFA6NHI352W",
  ];

  const InvalidAddressWarning = () => (
    <div className="SendTo__info-block">
      <InfoBlock variant={InfoBlock.variant.warning}>
        <strong>INVALID STELLAR ADDRESS</strong>
        <p>Addresses are uppercase and begin with letters "G" or "M".</p>
      </InfoBlock>
    </div>
  );

  const AccountDoesntExistWarning = () => (
    <div className="SendTo__info-block">
      <InfoBlock className="SendTo__info-block">
        The destination account doesn't exist. Send at least 1 XLM to create
        account.{" "}
        <TextLink
          variant={TextLink.variant.secondary}
          href="https://developers.stellar.org/docs/tutorials/create-account/#create-account"
          rel="noreferrer"
          target="_blank"
        >
          Learn more about account creation
        </TextLink>
      </InfoBlock>
    </div>
  );

  return (
    <PopupWrapper>
      <BackButton />
      <div className="SendTo">
        <div className="SendTo__header">Send To</div>
        <Formik initialValues={{ destination: "" }} onSubmit={() => {}}>
          {({ dirty }) => (
            <>
              <Form>
                <FormRows>
                  <Field name="destination">
                    {({ field }: FieldProps) => (
                      <Input
                        id="destination-input"
                        name="destination"
                        value={destination}
                        onChange={(e: React.ChangeEvent<any>) => {
                          setDestination(e.target.value);
                          field.onChange(e);
                          // tryValidate(e.target.value);
                        }}
                        placeholder="Recipient Stellar address"
                      />
                    )}
                  </Field>
                </FormRows>
              </Form>
              {/* ALEC TODO - fix condition tree below: */}
              {isLoading && (
                <div className="SendTo__loader">
                  <Loader />
                </div>
              )}
              {dirty ? (
                <div>
                  {isValidKey ? (
                    <>
                      {!destinationBalances.isFunded && (
                        <AccountDoesntExistWarning />
                      )}
                      <div>Address: {truncatedPublicKey(destination)}</div>
                    </>
                  ) : (
                    <InvalidAddressWarning />
                  )}
                </div>
              ) : (
                <div className="SendTo__recent-accts-wrapper">
                  <div className="SendTo__recent-accts-header">RECENT</div>
                  <ul className="SendTo__recent-accts-ul">
                    {recentAccounts.map((pubKey) => (
                      <li>
                        <button
                          onClick={() => setDestination(pubKey)}
                          className="SendTo__recent-accts-btn"
                        >
                          <IdenticonImg publicKey={pubKey} />
                          <span>{truncatedPublicKey(pubKey)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* ALEC TODO - remove */}
              <div>{dirty && "dirty"}</div>
              <div>{isLoading && "isLoading"}</div>
              <div>{isValidKey && "isValidKey"}</div>
            </>
          )}
        </Formik>
        {isValidKey && (
          <Button
            fullWidth
            variant={Button.variant.tertiary}
            onClick={() => navigateTo(ROUTES.sendPaymentAmount)}
          >
            continue
          </Button>
        )}
      </div>
      <BottomNav />
    </PopupWrapper>
  );
};
