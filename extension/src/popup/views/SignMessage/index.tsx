import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Message } from "popup/components/signMessage";
import {
  isNonSSLEnabledSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import {
  WarningMessageVariant,
  WarningMessage,
  SSLWarningMessage,
  DomainNotAllowedWarningMessage,
} from "popup/components/WarningMessages";
import { View } from "popup/basics/layout/View";

import { ShowOverlayStatus } from "popup/ducks/transactionSubmission";

import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";

import { VerifyAccount } from "popup/views/VerifyAccount";
import {
  getPunycodedDomain,
  MessageToSign,
  newTabHref,
  parsedSearchParam,
} from "helpers/urls";
import { SIGN_MESSAGE_PREFIX } from "helpers/stellar";
import { useIsDomainListedAllowed } from "popup/helpers/useIsDomainListedAllowed";
import { useGetSignMessageData } from "./hooks/useGetSignMessageData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "popup/helpers/navigate";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";
import { rejectTransaction, signBlob } from "popup/ducks/access";
import { publicKeySelector } from "popup/ducks/accountServices";
import { reRouteOnboarding } from "popup/helpers/route";
import { getSiteFavicon } from "popup/helpers/getSiteFavicon";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";

import "./styles.scss";

export const SignMessage = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const isNonSSLEnabled = useSelector(isNonSSLEnabledSelector);
  const { networkName, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );
  const publicKey = useSelector(publicKeySelector);

  const message = parsedSearchParam(location.search) as MessageToSign;
  const {
    apiVersion,
    accountToSign,
    domain,
    url,
    networkPassphrase: blobNetworkPassphrase,
  } = message;

  const { isDomainListedAllowed } = useIsDomainListedAllowed({
    domain,
  });

  const { state: signMessageState, fetchData } =
    useGetSignMessageData(accountToSign);
  const {
    isConfirming,
    isPasswordRequired,
    handleApprove,
    hwStatus,
    rejectAndClose,
    isHardwareWallet,
    setIsPasswordRequired,
    verifyPasswordThenSign,
    hardwareWalletType,
  } = useSetupSigningFlow(
    rejectTransaction,
    signBlob,
    message.message,
    apiVersion,
  );

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading =
    signMessageState.state === RequestState.IDLE ||
    signMessageState.state === RequestState.LOADING;

  if (isLoading) {
    return <Loading />;
  }

  const hasError = signMessageState.state === RequestState.ERROR;
  if (signMessageState.data?.type === AppDataType.REROUTE) {
    if (signMessageState.data.shouldOpenTab) {
      openTab(newTabHref(signMessageState.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${signMessageState.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError) {
    reRouteOnboarding({
      type: signMessageState.data.type,
      applicationState: signMessageState.data.applicationState,
      state: signMessageState.state,
    });
  }

  if (isHardwareWallet) {
    return (
      <WarningMessage
        variant={WarningMessageVariant.warning}
        handleCloseClick={() => window.close()}
        isActive
        header={t("Unsupported signing method")}
      >
        <p>
          {t(
            "Signing arbitrary data with a hardware wallet is currently not supported.",
          )}
        </p>
      </WarningMessage>
    );
  }

  if (blobNetworkPassphrase && blobNetworkPassphrase !== networkPassphrase) {
    return (
      <WarningMessage
        variant={WarningMessageVariant.warning}
        handleCloseClick={() => window.close()}
        isActive
        header={`${t("Freighter is set to")} ${networkName}`}
      >
        <p>
          {`${t("The requester expects you to sign this message on")} `}
          {blobNetworkPassphrase}.
        </p>
        <p>{t("Signing this message is not possible at the moment.")}</p>
      </WarningMessage>
    );
  }

  if (!url.startsWith("https") && !isNonSSLEnabled) {
    return <SSLWarningMessage url={domain} />;
  }

  const punycodedDomain = getPunycodedDomain(domain);
  const isDomainValid = punycodedDomain === domain;
  const favicon = getSiteFavicon(domain);
  const validDomain = isDomainValid ? punycodedDomain : `xn-${punycodedDomain}`;

  return isPasswordRequired ? (
    <VerifyAccount
      isApproval
      customBackAction={() => setIsPasswordRequired(false)}
      customSubmit={verifyPasswordThenSign}
    />
  ) : (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && hardwareWalletType && (
        <HardwareSign walletType={hardwareWalletType} />
      )}
      <React.Fragment>
        <View.Content>
          <div className="SignMessage__Body">
            <div className="SignMessage__TitleRow">
              <img
                className="PunycodedDomain__favicon"
                src={favicon}
                alt={t("Site favicon")}
              />
              <div className="SignMessage__TitleRow__Detail">
                <span className="SignMessage__TitleRow__Title">
                  Sign message
                </span>
                <span className="SignMessage__TitleRow__Domain">
                  {validDomain}
                </span>
              </div>
            </div>
          </div>
          {!isDomainListedAllowed && (
            <DomainNotAllowedWarningMessage domain={domain} />
          )}
          <Message prefix={SIGN_MESSAGE_PREFIX} message={message.message} />
          <div className="SignMessage__Metadata">
            <div className="SignMessage__Metadata__Row">
              <div className="SignMessage__Metadata__Label">
                <Icon.Wallet01 />
                <span>{t("Wallet")}</span>
              </div>
              <div className="SignMessage__Metadata__Value">
                <KeyIdenticon publicKey={publicKey} />
              </div>
            </div>
          </div>
        </View.Content>
        <View.Footer>
          <span className="SignMessage__Warning">
            {t("Only confirm if you trust this site")}
          </span>
          <div className="SignMessage__Actions">
            <Button
              size="lg"
              isFullWidth
              isRounded
              variant="tertiary"
              onClick={() => rejectAndClose()}
            >
              {t("Cancel")}
            </Button>
            <Button
              data-testid="sign-message-approve-button"
              disabled={!isDomainListedAllowed}
              size="lg"
              isFullWidth
              isRounded
              variant="secondary"
              isLoading={isConfirming}
              onClick={() => handleApprove()}
            >
              {t("Confirm")}
            </Button>
          </div>
        </View.Footer>
      </React.Fragment>
    </>
  );
};
