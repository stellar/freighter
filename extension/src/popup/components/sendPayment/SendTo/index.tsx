import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import debounce from "lodash/debounce";
import { Asset, StrKey, MuxedAccount, FederationServer } from "stellar-sdk";
import { useFormik } from "formik";
import BigNumber from "bignumber.js";

import { truncatedPublicKey } from "helpers/stellar";

import { AppDispatch } from "popup/App";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { FormRows } from "popup/basics/Forms";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { BackButton } from "popup/basics/BackButton";
import {
  saveDestination,
  transactionDataSelector,
  loadRecentAddresses,
  transactionSubmissionSelector,
  getDestinationBalances,
} from "popup/ducks/transactionSubmission";

import {
  Input,
  Loader,
  Button,
  TextLink,
  InfoBlock,
} from "@stellar/design-system";

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
    </InfoBlock>
  </div>
);

const InvalidAddressWarning = () => (
  <div className="SendTo__info-block">
    <InfoBlock variant={InfoBlock.variant.warning}>
      <strong>INVALID STELLAR ADDRESS</strong>
      <p>Addresses are uppercase and begin with letters “G“ or “M“.</p>
    </InfoBlock>
  </div>
);

export const SendTo = ({ previous }: { previous: ROUTES }) => {
  const dispatch: AppDispatch = useDispatch();
  const { destination } = useSelector(transactionDataSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { destinationBalances } = useSelector(transactionSubmissionSelector);

  const [recentAddresses, setRecentAddresses] = useState<Array<string>>([]);
  const [validatedPubKey, setValidatedPubKey] = useState("");
  const [muxedID, setMuxedID] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = (values: { destination: string }) => {
    dispatch(saveDestination(validatedPubKey));
    formik.resetForm({ values });
    navigateTo(ROUTES.sendPaymentAmount);
  };

  const formik = useFormik({
    initialValues: { destination },
    onSubmit: handleContinue,
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
    if (publicKey.startsWith("M")) {
      // TODO: remove when type is added to stellar-sdk
      // @ts-ignore
      if (StrKey.isValidMed25519PublicKey(publicKey)) {
        return true;
      }
    } else if (isFederationAddress(publicKey)) {
      return true;
    } else if (StrKey.isValidEd25519PublicKey(publicKey)) {
      return true;
    }
    return false;
  };

  const db = useCallback(
    debounce(async (inputDest) => {
      const errors = await formik.validateForm();
      if (Object.keys(errors).length !== 0) {
        setIsLoading(false);
        return;
      }
      // muxed account
      if (inputDest.startsWith("M")) {
        const mAccount = MuxedAccount.fromAddress(inputDest, "0");
        setValidatedPubKey(mAccount.baseAccount().accountId());
        setMuxedID(mAccount.id());
      }
      // federation address
      else if (isFederationAddress(inputDest)) {
        try {
          const fedResp = await FederationServer.resolve(inputDest);
          setValidatedPubKey(fedResp.account_id);
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

  useEffect(() => {
    if (formik.values.destination !== "") {
      setIsLoading(true);
    }
    // reset
    setValidatedPubKey("");
    setMuxedID("");
    db(formik.values.destination);
  }, [db, formik.values.destination]);

  useEffect(() => {
    if (!validatedPubKey) return;
    dispatch(
      getDestinationBalances({
        publicKey: validatedPubKey,
        networkDetails,
      }),
    );
  }, [dispatch, validatedPubKey, networkDetails]);

  useEffect(() => {
    (async () => {
      const res = await dispatch(loadRecentAddresses());
      if (loadRecentAddresses.fulfilled.match(res)) {
        setRecentAddresses(res.payload.recentAddresses);
      }
    })();
  }, [dispatch]);

  return (
    <PopupWrapper>
      <BackButton customBackAction={() => navigateTo(previous)} />
      <div className="header">Send To</div>
      <form className="SendTo__form">
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
      </form>
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
                        onClick={() =>
                          formik.setFieldValue("destination", pubKey, true)
                        }
                        className="SendTo__subheading-identicon"
                      >
                        <IdenticonImg publicKey={pubKey} />
                        <span>{truncatedPublicKey(pubKey)}</span>
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
                    <div className="SendTo__subheading">Address</div>
                    <div className="SendTo__subheading-identicon">
                      <IdenticonImg publicKey={validatedPubKey} />
                      <span>{truncatedPublicKey(validatedPubKey)}</span>
                    </div>
                    {muxedID && (
                      <>
                        <div className="SendTo__subheading">ID</div>
                        <div className="SendTo__subsection-copy">{muxedID}</div>
                      </>
                    )}
                    <div className="btn-continue">
                      <Button
                        fullWidth
                        variant={Button.variant.tertiary}
                        onClick={formik.submitForm}
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
