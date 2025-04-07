import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
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
  isMainnet,
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
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  saveDestination,
  saveDestinationAsset,
  saveFederationAddress,
} from "popup/ducks/transactionSubmission";
import { publicKeySelector } from "popup/ducks/accountServices";

import { RequestState } from "constants/request";
import { useSendToData } from "./hooks/useSendToData";

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

export const SendTo = ({
  goBack,
  goToNext,
}: {
  goBack: () => void;
  goToNext: () => void;
}) => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch<AppDispatch>();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const { state: sendDataState, fetchData } = useSendToData(
    publicKey,
    networkDetails,
    {
      isMainnet: isMainnet(networkDetails),
      showHidden: true,
      includeIcons: false,
    },
  );

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
    initialValues: { destination: "" },
    onSubmit: () => {
      handleContinue(
        sendDataState.data!.validatedAddress,
        sendDataState.data!.fedAddress,
      );
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

  useEffect(() => {
    const getData = async () => {
      const errors = await formik.validateForm();
      await fetchData(formik.values.destination, errors);
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.destination]);

  const isLoading =
    sendDataState.state === RequestState.IDLE ||
    sendDataState.state === RequestState.LOADING;

  return (
    <React.Fragment>
      <SubviewHeader title="Send To" customBackAction={goBack} />
      <View.Content hasNoTopPadding>
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
                  {sendDataState.data!.recentAddresses.length > 0 && (
                    <div className="SendTo__subheading">{t("RECENT")}</div>
                  )}
                  <div className="SendTo__simplebar">
                    <ul className="SendTo__recent-accts-ul">
                      {sendDataState.data!.recentAddresses.map((address) => (
                        <li key={address}>
                          <button
                            onClick={async () => {
                              emitMetric(METRIC_NAMES.sendPaymentRecentAddress);
                              await fetchData(address, {});
                              handleContinue(address);
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
                      {sendDataState.data!.destinationBalances &&
                        !sendDataState.data!.destinationBalances.isFunded && (
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
                        <IdenticonImg
                          publicKey={sendDataState.data!.validatedAddress}
                        />
                        <span>
                          {truncatedPublicKey(
                            sendDataState.data!.validatedAddress,
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
