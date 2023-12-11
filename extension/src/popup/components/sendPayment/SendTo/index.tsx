import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import debounce from "lodash/debounce";
import { Asset, StrKey, MuxedAccount, Federation } from "stellar-sdk";
import { useFormik } from "formik";
import BigNumber from "bignumber.js";
import {
  Button,
  Input,
  Loader,
  Link,
  Notification,
  Icon,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import {
  isFederationAddress,
  isMuxedAccount,
  truncatedPublicKey,
} from "helpers/stellar";

import { AppDispatch } from "popup/App";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { FormRows } from "popup/basics/Forms";
import { emitMetric } from "helpers/metrics";
import { navigateTo } from "popup/helpers/navigate";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";
import { SimpleBarWrapper } from "popup/basics/SimpleBarWrapper";
import { PopupWrapper } from "popup/basics/PopupWrapper";
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

export const AccountDoesntExistWarning = () => {
  const { t } = useTranslation();

  return (
    <div className="SendTo__info-block">
      <Notification
        variant="primary"
        title={t("The destination account doesn’t exist")}
      >
        <div>
          {t(
            "The destination account doesn’t exist. Send at least 1 XLM to create account.",
          )}{" "}
          <Link
            variant="secondary"
            href="https://developers.stellar.org/docs/tutorials/create-account/#create-account"
            rel="noreferrer"
            target="_blank"
          >
            {t("Learn more about account creation")}
          </Link>
        </div>
      </Notification>
    </div>
  );
};

const InvalidAddressWarning = () => {
  const { t } = useTranslation();

  return (
    <div className="SendTo__info-block">
      <Notification
        variant="warning"
        icon={<Icon.Warning />}
        title={t("INVALID STELLAR ADDRESS")}
      >
        {t("Addresses are uppercase and begin with letters “G“ or “M“.")}
      </Notification>
    </div>
  );
};

export const SendTo = ({ previous }: { previous: ROUTES }) => {
  const { t } = useTranslation();
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
      return { destination: t("invalid public key") };
    },
  });

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
      if (isMuxedAccount(inputDest)) {
        setValidatedPubKey(inputDest);
      }
      // federation address
      else if (isFederationAddress(inputDest)) {
        try {
          const fedResp = await Federation.Server.resolve(inputDest);
          setValidatedPubKey(fedResp.account_id);
          setFedAddress(inputDest);
        } catch (e) {
          formik.setErrors({ destination: t("invalid federation address") });
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
    if (isMuxedAccount(validatedPubKey)) {
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
          fieldSize="md"
          autoComplete="off"
          id="destination-input"
          name="destination"
          placeholder={t("Recipient Stellar address")}
          onChange={formik.handleChange}
          value={formik.values.destination}
          data-testid="send-to-input"
        />
      </FormRows>
      <div className="SendTo__address-wrapper" data-testid="send-to-view">
        {isLoading ? (
          <div className="SendTo__loader">
            <Loader />
          </div>
        ) : (
          <div>
            {formik.values.destination === "" ? (
              <>
                {recentAddresses.length > 0 && (
                  <div className="SendTo__subheading">{t("RECENT")}</div>
                )}
                <SimpleBarWrapper className="SendTo__simplebar">
                  <ul className="SendTo__recent-accts-ul">
                    {recentAddresses.map((address) => (
                      <li key={address}>
                        <button
                          onClick={async () => {
                            emitMetric(METRIC_NAMES.sendPaymentRecentAddress);
                            setIsLoading(true);
                            // recentAddresses already validated so safe to dispatch
                            if (isFederationAddress(address)) {
                              const fedResp = await Federation.Server.resolve(
                                address,
                              );
                              const publicKey = fedResp.account_id;
                              setValidatedPubKey(publicKey);
                              handleContinue(publicKey, address);
                            } else {
                              setValidatedPubKey(address);
                              handleContinue(address);
                            }
                          }}
                          className="SendTo__subheading-identicon"
                        >
                          <IdenticonImg publicKey={address} />
                          <span>
                            {isFederationAddress(address)
                              ? address
                              : truncatedPublicKey(address)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </SimpleBarWrapper>
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
                          {t("FEDERATION ADDRESS")}
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
                        size="md"
                        isFullWidth
                        variant="secondary"
                        onClick={() => formik.submitForm()}
                        data-testid="send-to-btn-continue"
                      >
                        {t("Continue")}
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
