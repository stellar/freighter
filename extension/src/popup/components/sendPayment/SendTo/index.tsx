import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import debounce from "lodash/debounce";
import { StrKey } from "stellar-sdk";
import { useFormik } from "formik";

import { getAccountBalances } from "@shared/api/internal";
import { truncatedPublicKey } from "helpers/stellar";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { FormRows } from "popup/basics/Forms";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { BackButton } from "popup/basics/BackButton";
import { defaultAccountBalances } from "popup/views/Account";
import {
  saveDestination,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";

import {
  Input,
  Loader,
  Button,
  TextLink,
  InfoBlock,
} from "@stellar/design-system";

import "../styles.scss";

export const SendTo = () => {
  const { destination } = useSelector(transactionDataSelector);

  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [destinationBalances, setDestinationBalances] = useState(
    defaultAccountBalances,
  );
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const handleContinue = (values: { destination: string }) => {
    dispatch(saveDestination(values.destination));
    formik.resetForm({ values });
    navigateTo(ROUTES.sendPaymentAmount);
  };

  const formik = useFormik({
    initialValues: { destination },
    onSubmit: handleContinue,
    validateOnChange: false,
    validate: (values) => {
      if (validPublicKey(values.destination)) {
        return {};
      }
      return { destination: "invalid public key" };
    },
  });

  // TODO - handle federation address and muxed accounts
  const validPublicKey = (publicKey: string) => {
    if (publicKey.startsWith("M")) {
      // TODO: remove when type is added to stellar-sdk
      // @ts-ignore
      if (!StrKey.isValidMed25519PublicKey(publicKey)) {
        return false;
      }
    } else if (!StrKey.isValidEd25519PublicKey(publicKey)) {
      return false;
    }
    return true;
  };

  const db = useCallback(
    debounce(async (publicKey) => {
      formik.validateForm();
      try {
        const res = await getAccountBalances({
          publicKey,
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
    db(formik.values.destination);
  }, [db, formik.values.destination]);

  // TODO - remove, keeping for UI purposes until pulled from background
  const recentDestinations = [
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
      <div className="SendTo__header">Send To</div>
      <form>
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
                {recentDestinations.length > 0 && (
                  <div className="SendTo__subheading">RECENT</div>
                )}
                <ul className="SendTo__recent-accts-ul">
                  {recentDestinations.map((pubKey) => (
                    <li>
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
                    <AccountDoesntExistWarning />
                    <div className="SendTo__subheading">Address</div>
                    <div className="SendTo__subheading-identicon">
                      <IdenticonImg publicKey={formik.values.destination} />
                      <span>
                        {truncatedPublicKey(formik.values.destination)}
                      </span>
                    </div>
                    <div className="btn-continue">
                      <Button
                        fullWidth
                        variant={Button.variant.tertiary}
                        onClick={formik.submitForm}
                      >
                        continue
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
