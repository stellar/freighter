import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Asset, StrKey } from "stellar-sdk";
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
  isValidFederatedDomain,
  truncatedPublicKey,
} from "helpers/stellar";

import { AppDispatch } from "popup/App";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { FormRows } from "popup/basics/Forms";
import { emitMetric } from "helpers/metrics";
import { isContractId } from "popup/helpers/soroban";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { View } from "popup/basics/layout/View";
import {
  saveDestination,
  saveDestinationAsset,
  saveFederationAddress,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";

import { RequestState } from "constants/request";
import { useSendToData, getAddressFromInput } from "./hooks/useSendToData";

import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { Navigate, useLocation } from "react-router-dom";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { reRouteOnboarding } from "popup/helpers/route";

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
        title={t("The destination account doesn't exist")}
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
        {t(`Addresses are uppercase and begin with letters "G", "M", or "C"`)}
      </Notification>
    </div>
  );
};

export const SendTo = ({
  goBack,
  goToNext,
}: {
  goBack: () => void;
  goToNext: () => void;
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch: AppDispatch = useDispatch<AppDispatch>();
  const { destination, federationAddress } = useSelector(
    transactionDataSelector,
  );
  const { state: sendDataState, fetchData } = useSendToData();

  const handleContinue = (
    validatedDestination: string,
    validatedFedAdress?: string,
  ) => {
    dispatch(saveDestination(validatedDestination));
    dispatch(saveDestinationAsset(""));
    dispatch(saveFederationAddress(validatedFedAdress || ""));
    goToNext();
  };

  const formik = useFormik({
    initialValues: { destination: federationAddress || destination || "" },
    onSubmit: () => {
      if (
        sendDataState.state === RequestState.SUCCESS &&
        sendDataState.data.type == AppDataType.RESOLVED
      ) {
        handleContinue(
          sendDataState.data.validatedAddress,
          sendDataState.data.fedAddress,
        );
      }
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
    if (isValidFederatedDomain(publicKey)) {
      return true;
    }
    if (StrKey.isValidEd25519PublicKey(publicKey)) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    const getData = async () => {
      const errors = await formik.validateForm();
      await fetchData(formik.values.destination, errors);
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.destination]);

  const hasError = sendDataState.state === RequestState.ERROR;
  const isLoading =
    sendDataState.state === RequestState.IDLE ||
    sendDataState.state === RequestState.LOADING;

  if (sendDataState.data?.type === AppDataType.REROUTE) {
    if (sendDataState.data.shouldOpenTab) {
      openTab(newTabHref(sendDataState.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${sendDataState.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError && !isLoading) {
    reRouteOnboarding({
      type: sendDataState.data.type,
      applicationState: sendDataState.data.applicationState,
      state: sendDataState.state,
    });
  }

  return (
    <React.Fragment>
      <SubviewHeader
        title={t("Send")}
        customBackAction={goBack}
        customBackIcon={<Icon.X />}
      />
      <View.Content hasTopInput>
        <FormRows>
          <Input
            fieldSize="md"
            autoComplete="off"
            id="destination-input"
            name="destination"
            placeholder={t("Enter address")}
            onChange={formik.handleChange}
            value={formik.values.destination}
            leftElement={<Icon.UserCircle />}
            data-testid="send-to-input"
          />
        </FormRows>
        <div className="SendTo__address-wrapper" data-testid="send-to-view">
          {isLoading ? (
            <div className="SendTo__loader">
              <Loader />
            </div>
          ) : sendDataState.error ||
            sendDataState.state === RequestState.ERROR ? (
            <Notification
              variant="error"
              title={
                sendDataState.error instanceof Error
                  ? sendDataState.error.message
                  : t("Unknown error occured")
              }
            />
          ) : (
            <div>
              {formik.values.destination === "" ? (
                <>
                  {sendDataState.data.recentAddresses.length > 0 && (
                    <div className="SendTo__subheading">
                      <Icon.Clock />
                      {t("Recents")}
                    </div>
                  )}
                  <div className="SendTo__simplebar">
                    <ul className="SendTo__recent-accts-ul">
                      {sendDataState.data.recentAddresses.map((address) => (
                        <li key={address}>
                          <button
                            data-testid="recent-address-button"
                            onClick={async () => {
                              const addressFromInput =
                                await getAddressFromInput(address);
                              emitMetric(METRIC_NAMES.sendPaymentRecentAddress);
                              await fetchData(address, {});
                              handleContinue(
                                addressFromInput.validatedAddress,
                                addressFromInput.fedAddress,
                              );
                            }}
                            className="SendTo__subheading-identicon"
                          >
                            <div className="SendTo__subheading-identicon__identicon">
                              <IdenticonImg publicKey={address} />
                            </div>
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
                      {sendDataState.data.destinationBalances &&
                        !sendDataState.data.destinationBalances.isFunded && (
                          <AccountDoesntExistWarning />
                        )}
                      <div className="SendTo__subheading">
                        <Icon.SearchLg />
                        Suggestions
                      </div>
                      <div
                        className="SendTo__subheading-identicon"
                        data-testid="send-to-identicon"
                      >
                        <div className="SendTo__subheading-identicon__identicon">
                          <IdenticonImg
                            publicKey={sendDataState.data.validatedAddress}
                          />
                        </div>
                        <span>
                          {truncatedPublicKey(
                            sendDataState.data.validatedAddress,
                          )}
                        </span>
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
      </View.Content>
      <View.Footer>
        {!isLoading && formik.values.destination && formik.isValid ? (
          <Button
            size="lg"
            isFullWidth
            isRounded
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
