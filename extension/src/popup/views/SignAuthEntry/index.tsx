import React, { useEffect } from "react";
import { Button, Icon } from "@stellar/design-system";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { xdr } from "stellar-sdk";

import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import {
  DomainNotAllowedWarningMessage,
  WarningMessageVariant,
  WarningMessage,
  SSLWarningMessage,
} from "popup/components/WarningMessages";
import { View } from "popup/basics/layout/View";
import {
  isNonSSLEnabledSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import { ShowOverlayStatus } from "popup/ducks/transactionSubmission";
import { VerifyAccount } from "popup/views/VerifyAccount";

import {
  EntryToSign,
  getPunycodedDomain,
  newTabHref,
  parsedSearchParam,
} from "helpers/urls";
import { useIsDomainListedAllowed } from "popup/helpers/useIsDomainListedAllowed";
import { useGetSignAuthEntryData } from "./hooks/useGetSignAuthEntryData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "popup/helpers/navigate";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";
import { rejectAuthEntry, signEntry } from "popup/ducks/access";
import { reRouteOnboarding } from "popup/helpers/route";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { getSiteFavicon } from "popup/helpers/getSiteFavicon";
import { AuthEntries } from "popup/components/AuthEntry";

import "./styles.scss";

export const SignAuthEntry = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const isNonSSLEnabled = useSelector(isNonSSLEnabledSelector);
  const { networkName, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );

  const params = parsedSearchParam(location.search) as EntryToSign;
  const {
    accountToSign,
    networkPassphrase: entryNetworkPassphrase,
    domain,
  } = params;
  const { isDomainListedAllowed } = useIsDomainListedAllowed({
    domain,
  });

  const { state: signAuthEntryData, fetchData } =
    useGetSignAuthEntryData(accountToSign);
  const {
    isConfirming,
    isPasswordRequired,
    handleApprove,
    hwStatus,
    rejectAndClose,
    setIsPasswordRequired,
    verifyPasswordThenSign,
    hardwareWalletType,
  } = useSetupSigningFlow(rejectAuthEntry, signEntry, params.entry);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading =
    signAuthEntryData.state === RequestState.IDLE ||
    signAuthEntryData.state === RequestState.LOADING;

  if (isLoading) {
    return <Loading />;
  }

  const hasError = signAuthEntryData.state === RequestState.ERROR;
  if (signAuthEntryData.data?.type === AppDataType.REROUTE) {
    if (signAuthEntryData.data.shouldOpenTab) {
      openTab(newTabHref(signAuthEntryData.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${signAuthEntryData.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError) {
    reRouteOnboarding({
      type: signAuthEntryData.data.type,
      applicationState: signAuthEntryData.data.applicationState,
      state: signAuthEntryData.state,
    });
  }

  const publicKey = signAuthEntryData.data?.publicKey!;

  if (entryNetworkPassphrase && entryNetworkPassphrase !== networkPassphrase) {
    return (
      <WarningMessage
        variant={WarningMessageVariant.warning}
        handleCloseClick={() => window.close()}
        isActive
        header={`${t("Freighter is set to")} ${networkName}`}
      >
        <p>
          {t("The requester expects you to sign this auth entry on")}{" "}
          {entryNetworkPassphrase}.
        </p>
        <p>{t("Signing this authorization is not possible at the moment.")}</p>
      </WarningMessage>
    );
  }

  if (!params.url.startsWith("https") && !isNonSSLEnabled) {
    return <SSLWarningMessage url={params.url} />;
  }

  const punycodedDomain = getPunycodedDomain(domain);
  const isDomainValid = punycodedDomain === domain;

  const favicon = getSiteFavicon(domain);
  const validDomain = isDomainValid ? punycodedDomain : `xn-${punycodedDomain}`;

  const preimage = xdr.HashIdPreimage.fromXDR(params.entry, "base64");
  const invocation = preimage.sorobanAuthorization().invocation();

  return isPasswordRequired ? (
    <VerifyAccount
      isApproval
      customBackAction={() => setIsPasswordRequired(false)}
      customSubmit={verifyPasswordThenSign}
    />
  ) : (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && hardwareWalletType && (
        <HardwareSign
          walletType={hardwareWalletType}
          isSignSorobanAuthorization
        />
      )}
      <React.Fragment>
        <View.Content>
          <div className="SignAuthEntry__Body">
            <div className="SignAuthEntry__TitleRow">
              <img
                className="PunycodedDomain__favicon"
                src={favicon}
                alt={t("Site favicon")}
              />
              <div className="SignAuthEntry__TitleRow__Detail">
                <span className="SignAuthEntry__TitleRow__Title">
                  Confirm Authorizations
                </span>
                <span className="SignAuthEntry__TitleRow__Domain">
                  {validDomain}
                </span>
              </div>
            </div>
            {!isDomainListedAllowed && (
              <DomainNotAllowedWarningMessage domain={domain} />
            )}
            <div className="SignAuthEntry__Metadata">
              <div className="SignAuthEntry__Metadata__Row">
                <div className="SignAuthEntry__Metadata__Label">
                  <Icon.Wallet01 />
                  <span>Wallet</span>
                </div>
                <div className="SignAuthEntry__Metadata__Value">
                  <KeyIdenticon publicKey={publicKey} />
                </div>
              </div>
            </div>
          </div>
          <AuthEntries invocations={[invocation]} />
        </View.Content>
        <View.Footer isInline>
          <Button
            isFullWidth
            isRounded
            size="lg"
            variant="tertiary"
            onClick={() => rejectAndClose()}
          >
            {t("Cancel")}
          </Button>
          <Button
            data-testid="sign-auth-entry-approve-button"
            disabled={!isDomainListedAllowed}
            isFullWidth
            isRounded
            size="lg"
            variant="secondary"
            isLoading={isConfirming}
            onClick={() => handleApprove()}
          >
            {t("Confirm")}
          </Button>
        </View.Footer>
      </React.Fragment>
    </>
  );
};
