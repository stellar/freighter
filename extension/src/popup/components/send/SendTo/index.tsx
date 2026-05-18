import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { StrKey } from "stellar-sdk";
import { useFormik } from "formik";
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
import { shouldShowAccountDoesntExistWarning } from "popup/helpers/sendWarnings";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { STELLAR_DOCS_CREATE_ACCOUNT_URL } from "popup/constants/externalLinks";
import { View } from "popup/basics/layout/View";
import {
  allAccountsSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import {
  saveDestination,
  saveDestinationAsset,
  saveFederationAddress,
  saveMemoAndType,
  saveRecipientName,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import type { FederationMemoType } from "popup/helpers/federationMemo";

import { RequestState } from "constants/request";
import { useSendToData, getAddressFromInput } from "./hooks/useSendToData";

import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { Navigate, useLocation } from "react-router-dom";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { reRouteOnboarding } from "popup/helpers/route";

import "../styles.scss";

const MAX_VISIBLE_RECENT_ADDRESSES = 10;
const DESTINATION_DEBOUNCE_MS = 400;

type ResolvedSuggestionData = {
  type: AppDataType.RESOLVED;
  validatedAddress: string;
  fedAddress: string;
  federationMemo: string;
  federationMemoType: FederationMemoType | "";
  destinationBalances?: { isFunded: boolean };
  recentAddresses: string[];
};

const isResolvedSuggestionData = (
  data: unknown,
): data is ResolvedSuggestionData =>
  Boolean(
    data &&
      typeof data === "object" &&
      "type" in data &&
      (data as { type?: AppDataType }).type === AppDataType.RESOLVED &&
      "validatedAddress" in data,
  );

export const AccountDoesntExistWarning = () => {
  const { t } = useTranslation();

  return (
    <div className="SendTo__info-block">
      <Notification
        variant="primary"
        title={t("The destination account doesn't exist")}
      >
        <div>
          {`${t("Send at least 1 XLM to create account.")} `}
          <Link
            variant="primary"
            href={STELLAR_DOCS_CREATE_ACCOUNT_URL}
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
  const { destination, federationAddress, asset, isCollectible } = useSelector(
    transactionDataSelector,
  );
  const allAccounts = useSelector(allAccountsSelector);
  const activePublicKey = useSelector(publicKeySelector);
  const { state: sendDataState, fetchData } = useSendToData();
  const [debouncedDestination, setDebouncedDestination] = useState(
    federationAddress || destination || "",
  );
  const otherAccounts = (allAccounts ?? []).filter(
    ({ publicKey }) => publicKey !== activePublicKey,
  );

  const handleContinue = (
    validatedDestination: string,
    validatedFedAdress?: string,
    {
      recipientName = "",
      federationMemo,
      federationMemoType,
    }: {
      recipientName?: string;
      federationMemo?: string;
      federationMemoType?: FederationMemoType | "";
    } = {},
  ) => {
    dispatch(saveDestination(validatedDestination));
    dispatch(saveDestinationAsset(""));
    dispatch(saveFederationAddress(validatedFedAdress || ""));
    dispatch(saveRecipientName(recipientName));
    if (validatedFedAdress && federationMemo !== undefined) {
      dispatch(
        saveMemoAndType({
          memo: federationMemo,
          memoType: federationMemoType || "",
        }),
      );
    } else {
      dispatch(saveMemoAndType({ memo: "", memoType: "" }));
    }
    goToNext();
  };

  const formik = useFormik({
    initialValues: { destination: federationAddress || destination || "" },
    onSubmit: () => {
      if (
        sendDataState.state === RequestState.SUCCESS &&
        sendDataState.data.type === AppDataType.RESOLVED
      ) {
        handleContinue(
          sendDataState.data.validatedAddress,
          sendDataState.data.fedAddress,
          {
            federationMemo: sendDataState.data.federationMemo,
            federationMemoType: sendDataState.data.federationMemoType,
          },
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
    const timeoutId = setTimeout(async () => {
      setDebouncedDestination(formik.values.destination);
      const errors = await formik.validateForm(formik.values);
      await fetchData(formik.values.destination, errors);
    }, DESTINATION_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
    // fetchData and formik.validateForm are stable refs — omitting intentionally
    // to avoid re-triggering the debounce when only those refs change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.destination]);

  const hasError = sendDataState.state === RequestState.ERROR;
  const isLoading =
    sendDataState.state === RequestState.IDLE ||
    sendDataState.state === RequestState.LOADING;
  const isFetching = sendDataState.state === RequestState.LOADING;
  const isSearchSettled = formik.values.destination === debouncedDestination;
  const resolvedSendData = isResolvedSuggestionData(sendDataState.data)
    ? sendDataState.data
    : null;

  // Track whether any successful fetch has completed (used for initial spinner).
  const hasLoadedOnceRef = useRef(false);
  if (resolvedSendData) {
    hasLoadedOnceRef.current = true;
  }

  // Cache recent addresses independently — only update when the fetch returns
  // real data. The validation-error path returns recentAddresses: [] which must
  // not clear a previously populated list.
  const cachedRecentAddressesRef = useRef<string[]>([]);
  if (resolvedSendData?.recentAddresses.length) {
    cachedRecentAddressesRef.current = resolvedSendData.recentAddresses;
  }

  // Only replace the whole suggestions area with a spinner on the very first load.
  const isInitialLoad = isLoading && !hasLoadedOnceRef.current;

  const visibleRecentAddresses = cachedRecentAddressesRef.current.slice(
    0,
    MAX_VISIBLE_RECENT_ADDRESSES,
  );

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
      <SubviewHeader title={t("Send to")} customBackAction={goBack} />
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
          {/* Suggestions area — gated on fetch state */}
          {isInitialLoad ? (
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
            debouncedDestination !== "" &&
            isSearchSettled && (
              <div>
                {formik.isValid && resolvedSendData ? (
                  <>
                    {shouldShowAccountDoesntExistWarning({
                      assetCanonical: asset,
                      destination: resolvedSendData.validatedAddress,
                      isCollectible,
                      isFunded: resolvedSendData.destinationBalances?.isFunded,
                    }) && <AccountDoesntExistWarning />}
                    <div className="SendTo__subheading">
                      <Icon.SearchLg />
                      {t("Suggestions")}
                    </div>
                    <button
                      type="button"
                      className="SendTo__subheading-identicon"
                      data-testid="send-to-suggestion-button"
                      onClick={() => {
                        handleContinue(
                          resolvedSendData.validatedAddress,
                          resolvedSendData.fedAddress,
                          {
                            federationMemo: resolvedSendData.federationMemo,
                            federationMemoType:
                              resolvedSendData.federationMemoType,
                          },
                        );
                      }}
                    >
                      <div className="SendTo__subheading-identicon__identicon">
                        <IdenticonImg
                          publicKey={resolvedSendData.validatedAddress}
                        />
                      </div>
                      <span>
                        {truncatedPublicKey(resolvedSendData.validatedAddress)}
                      </span>
                    </button>
                  </>
                ) : isFetching ? null : (
                  <InvalidAddressWarning />
                )}
              </div>
            )
          )}
          {/* Recents and My Accounts are always visible */}
          {visibleRecentAddresses.length > 0 && (
            <div className="SendTo__subheading">
              <Icon.Clock />
              {t("Recents")}
            </div>
          )}
          <div className="SendTo__simplebar">
            <ul className="SendTo__recent-accts-ul">
              {visibleRecentAddresses.map((address) => (
                <li key={address}>
                  <button
                    type="button"
                    data-testid="recent-address-button"
                    onClick={async () => {
                      const addressFromInput =
                        await getAddressFromInput(address);
                      emitMetric(METRIC_NAMES.sendPaymentRecentAddress);
                      await fetchData(address, {});
                      handleContinue(
                        addressFromInput.validatedAddress,
                        addressFromInput.fedAddress,
                        {
                          federationMemo: addressFromInput.federationMemo,
                          federationMemoType:
                            addressFromInput.federationMemoType,
                        },
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
          {otherAccounts.length > 0 && (
            <>
              <div className="SendTo__subheading">
                <Icon.UserCircle />
                {t("My Accounts")}
              </div>
              <div className="SendTo__simplebar">
                <ul className="SendTo__recent-accts-ul">
                  {otherAccounts.map((account) => (
                    <li key={account.publicKey}>
                      <button
                        type="button"
                        data-testid="my-account-button"
                        onClick={async () => {
                          await fetchData(account.publicKey, {});
                          handleContinue(account.publicKey, undefined, {
                            recipientName: account.name || "",
                          });
                        }}
                        className="SendTo__subheading-identicon"
                      >
                        <div className="SendTo__subheading-identicon__identicon">
                          <IdenticonImg publicKey={account.publicKey} />
                        </div>
                        <span>
                          {account.name
                            ? `${account.name} (${truncatedPublicKey(account.publicKey)})`
                            : truncatedPublicKey(account.publicKey)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </View.Content>
      <View.Footer>
        {!isLoading &&
        isSearchSettled &&
        formik.values.destination &&
        formik.isValid ? (
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
