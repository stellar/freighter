import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import debounce from "lodash/debounce";
import { Asset, StrKey, MuxedAccount, FederationServer } from "stellar-sdk";
import { useFormik } from "formik";
import BigNumber from "bignumber.js";
import { Input, Loader, TextLink } from "@stellar/design-system";

import { truncatedPublicKey } from "helpers/stellar";

import { AppDispatch } from "popup/App";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { InfoBlock } from "popup/basics/InfoBlock";
import { FormRows } from "popup/basics/Forms";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { Button } from "popup/basics/buttons/Button";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  saveDestination,
  saveFederationAddress,
  transactionDataSelector,
  loadRecentAddresses,
  transactionSubmissionSelector,
  getDestinationBalances,
} from "popup/ducks/transactionSubmission";

import "../styles.scss";

const baseReserve = new BigNumber(1);

export const shouldAccountDoesntExistWarning = (
  isFunded: boolean,
  assetID: string,
  amount: string,
) =>
  !isFunded &&
  (new BigNumber(amount).lt(baseReserve) ||
    assetID !== Asset.native().toString());

export const AccountDoesntExistWarning = () => (
  <div className="SendTo__info-block">
    <InfoBlock className="SendTo__info-block">
      <div>
        The destination account doesn’t exist. Send at least 1 XLM to create
        account.{" "}
        <TextLink
          variant={TextLink.variant.secondary}
          href="https://developers.stellar.org/docs/tutorials/create-account/#create-account"
          rel="noreferrer"
          target="_blank"
        >
          Learn more about account creation
        </TextLink>
      </div>
    </InfoBlock>
  </div>
);

const InvalidAddressWarning = () => (
  <div className="SendTo__info-block">
    <InfoBlock variant={InfoBlock.variant.warning}>
      <div>
        <strong>INVALID STELLAR ADDRESS</strong>
        <p>Addresses are uppercase and begin with letters “G“ or “M“.</p>
      </div>
    </InfoBlock>
  </div>
);

export const SendTo = ({ previous }: { previous: ROUTES }) => {
  const dispatch: AppDispatch = useDispatch();
  const { destination, federationAddress } = useSelector(
    transactionDataSelector,
  );
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { destinationBalances } = useSelector(transactionSubmissionSelector);

  const [recentAddresses, setRecentAddresses] = useState<Array<string>>([]);
  const [validatedPubKey, setValidatedPubKey] = useState("");
  const [fedAddress, setFedAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = (
    validatedDestination: string,
    validatedFedAdress?: string,
  ) => {
    dispatch(saveDestination(validatedDestination));
    dispatch(saveFederationAddress(validatedFedAdress || ""));
    navigateTo(ROUTES.sendPaymentAmount);
  };

  const formik = useFormik({
    initialValues: { destination: federationAddress || destination },
    onSubmit: () => {
      handleContinue(validatedPubKey, fedAddress);
    },
    validateOnChange: false,
    validate: (values) => {
      if (isValidPublicKey(values.destination)) {
        return {};
      }
      return { destination: "invalid public key" };
    },
  });

  const isFederationAddress = (address: string) => address.includes("*");

  const isValidPublicKey = (publicKey: string) => {
    if (StrKey.isValidMed25519PublicKey(publicKey)) {
      return true;
    }
    if (isFederationAddress(publicKey)) {
      return true;
    }
    if (StrKey.isValidEd25519PublicKey(publicKey)) {
      return true;
    }
    return false;
  };

  // calls form validation and then saves destination
  const db = useCallback(
    debounce(async (inputDest) => {
      const errors = await formik.validateForm();
      if (Object.keys(errors).length !== 0) {
        setIsLoading(false);
        return;
      }
      // muxed account
      if (inputDest.startsWith("M")) {
        setValidatedPubKey(inputDest);
      }
      // federation address
      else if (isFederationAddress(inputDest)) {
        try {
          const fedResp = await FederationServer.resolve(inputDest);
          setValidatedPubKey(fedResp.account_id);
          setFedAddress(inputDest);
        } catch (e) {
          formik.setErrors({ destination: "invalid federation address" });
        }
      }
      // else, a regular account
      else {
        setValidatedPubKey(inputDest);
      }
      setIsLoading(false);
    }, 2000),
    [],
  );

  // load recent addresses
  useEffect(() => {
    (async () => {
      const res = await dispatch(loadRecentAddresses());
      if (loadRecentAddresses.fulfilled.match(res)) {
        setRecentAddresses(res.payload.recentAddresses);
      }
    })();
  }, [dispatch]);

  // on input reset destination and trigger debounce
  useEffect(() => {
    if (formik.values.destination !== "") {
      setIsLoading(true);
    }
    // reset
    setValidatedPubKey("");
    setFedAddress("");
    db(formik.values.destination);
  }, [db, formik.values.destination]);

  // on valid input get destination balances
  useEffect(() => {
    if (!validatedPubKey) return;

    // TODO - remove once wallet-sdk can handle muxed
    let publicKey = validatedPubKey;
    if (validatedPubKey.startsWith("M")) {
      const mAccount = MuxedAccount.fromAddress(validatedPubKey, "0");
      publicKey = mAccount.baseAccount().accountId();
    }
    dispatch(
      getDestinationBalances({
        publicKey,
        networkDetails,
      }),
    );
  }, [dispatch, validatedPubKey, networkDetails]);

  return (
    <PopupWrapper>
      <SubviewHeader
        title="Send To"
        customBackAction={() => navigateTo(previous)}
      />
      <FormRows>
        <Input
          autoComplete="off"
          id="destination-input"
          name="destination"
          placeholder="Recipient Stellar address"
          onChange={formik.handleChange}
          value={formik.values.destination}
        />
      </FormRows>
      <div className="SendTo__address-wrapper">
        {isLoading ? (
          <div className="SendTo__loader">
            <Loader />
          </div>
        ) : (
          <div>
            {formik.values.destination === "" ? (
              <>
                {recentAddresses.length > 0 && (
                  <div className="SendTo__subheading">RECENT</div>
                )}
                <ul className="SendTo__recent-accts-ul">
                  {recentAddresses.map((pubKey) => (
                    <li key={pubKey}>
                      <button
                        onClick={async () => {
                          setIsLoading(true);
                          setValidatedPubKey(pubKey);
                          // recentAddresses already validated so safe to dispatch
                          if (isFederationAddress(pubKey)) {
                            const fedResp = await FederationServer.resolve(
                              pubKey,
                            );
                            handleContinue(pubKey, fedResp.account_id);
                          } else {
                            handleContinue(pubKey);
                          }
                        }}
                        className="SendTo__subheading-identicon"
                      >
                        <IdenticonImg publicKey={pubKey} />
                        <span>
                          {isFederationAddress(pubKey)
                            ? pubKey
                            : truncatedPublicKey(pubKey)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div>
                {formik.isValid ? (
                  <>
                    {!destinationBalances.isFunded && (
                      <AccountDoesntExistWarning />
                    )}
                    {isFederationAddress(formik.values.destination) && (
                      <>
                        <div className="SendTo__subheading">
                          FEDERATION ADDRESS
                        </div>
                        <div className="SendTo__subsection-copy">
                          {formik.values.destination}
                        </div>
                      </>
                    )}
                    <div className="SendTo__subheading">Address</div>
                    <div className="SendTo__subheading-identicon">
                      <IdenticonImg publicKey={validatedPubKey} />
                      <span>{truncatedPublicKey(validatedPubKey)}</span>
                    </div>

                    <div className="SendPayment__btn-continue">
                      <Button
                        fullWidth
                        variant={Button.variant.tertiary}
                        onClick={() => formik.submitForm()}
                      >
                        Continue
                      </Button>
                    </div>
                  </>
                ) : (
                  <InvalidAddressWarning />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PopupWrapper>
  );
};
