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

import { ActionStatus } from "@shared/api/types";
import { AppDispatch } from "popup/App";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { FormRows } from "popup/basics/Forms";
import { emitMetric } from "helpers/metrics";
import { navigateTo } from "popup/helpers/navigate";
import { isContractId } from "popup/helpers/soroban";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";
import { View } from "popup/basics/layout/View";
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
          {t("Send at least 1 XLM to create account.")}{" "}
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
        icon={<Icon.InfoOctagon />}
        title={t("INVALID STELLAR ADDRESS")}
      >
        {t("Addresses are uppercase and begin with letters “G“, “M“, or “C“.")}
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
  const { destinationBalances, destinationAccountBalanceStatus } = useSelector(
    transactionSubmissionSelector,
  );

  const [recentAddresses, setRecentAddresses] = useState<string[]>([]);
  const [validatedAddress, setValidatedAddress] = useState("");
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
      handleContinue(validatedAddress, fedAddress);
    },
    validateOnChange: false,
    validate: (values) => {
      if (
        isValidPublicKey(values.destination) ||
        isContractId(values.destination)
      ) {
        return {};
      }
      return { destination: t("invalid destination address") };
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
  /* eslint-disable react-hooks/exhaustive-deps */
  const db = useCallback(
    debounce(async (inputDest: string) => {
      const errors = await formik.validateForm();
      if (Object.keys(errors).length !== 0) {
        setIsLoading(false);
        return;
      }
      // muxed account
      if (isMuxedAccount(inputDest)) {
        setValidatedAddress(inputDest);
      } else if (isFederationAddress(inputDest)) {
        // federation address
        try {
          const fedResp = await Federation.Server.resolve(inputDest);
          setValidatedAddress(fedResp.account_id);
          setFedAddress(inputDest);
        } catch (e) {
          formik.setErrors({ destination: t("invalid federation address") });
        }
      } else {
        // else, a regular account
        setValidatedAddress(inputDest);
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
    setValidatedAddress("");
    setFedAddress("");
    db(formik.values.destination);
  }, [db, formik.values.destination]);

  // on valid input get destination balances
  useEffect(() => {
    if (!validatedAddress) {
      return;
    }

    // TODO - remove once wallet-sdk can handle muxed
    let address = validatedAddress;

    if (isContractId(validatedAddress)) {
      return;
    }

    if (isMuxedAccount(validatedAddress)) {
      const mAccount = MuxedAccount.fromAddress(validatedAddress, "0");
      address = mAccount.baseAccount().accountId();
    }
    dispatch(
      getDestinationBalances({
        publicKey: address,
        networkDetails,
      }),
    );
  }, [dispatch, validatedAddress, networkDetails]);

  return (
    <React.Fragment>
      <SubviewHeader
        title="Send To"
        customBackAction={() => navigateTo(previous)}
      />
      <View.Content>
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
                  <div className="SendTo__simplebar">
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
                                setValidatedAddress(publicKey);
                                handleContinue(publicKey, address);
                              } else {
                                setValidatedAddress(address);
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
                  </div>
                </>
              ) : (
                <div>
                  {formik.isValid ? (
                    <>
                      {destinationAccountBalanceStatus ===
                      ActionStatus.SUCCESS ? (
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
                            <IdenticonImg publicKey={validatedAddress} />
                            <span>{truncatedPublicKey(validatedAddress)}</span>
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <InvalidAddressWarning />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </View.Content>
      <View.Footer>
        {!isLoading && formik.values.destination && formik.isValid ? (
          <Button
            size="md"
            isFullWidth
            variant="secondary"
            onClick={() => formik.submitForm()}
            data-testid="send-to-btn-continue"
          >
            {t("Continue")}
          </Button>
        ) : null}
      </View.Footer>
    </React.Fragment>
  );
};
