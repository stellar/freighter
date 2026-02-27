import React, { useEffect, useState } from "react";
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
  BlockAidSiteScanLabel,
  BlockaidByLine,
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
import {
  ATTACK_TO_DISPLAY,
  getSiteSecurityStates,
} from "popup/helpers/blockaid";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";
import { SecurityLevel } from "popup/constants/blockaid";
import { useMarkQueueActive } from "popup/helpers/useMarkQueueActive";

import "./styles.scss";

export const SignMessage = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const isNonSSLEnabled = useSelector(isNonSSLEnabledSelector);
  const { networkName, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );
  const publicKey = useSelector(publicKeySelector);
  const [activePaneIndex, setActivePaneIndex] = useState(0);

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

  // Mark this queue item as active to prevent TTL cleanup while popup is open
  useMarkQueueActive(message.uuid);

  const { state: signMessageState, fetchData } = useGetSignMessageData(
    accountToSign,
    url,
  );
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
    message.uuid,
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

  const scanData =
    signMessageState.data?.type === AppDataType.RESOLVED
      ? signMessageState.data.scanData
      : null;
  const blockaidOverrideState =
    signMessageState.data?.type === AppDataType.RESOLVED
      ? signMessageState.data.blockaidOverrideState
      : null;

  // Determine security states with override support
  const { isMalicious, isSuspicious, isUnableToScan } = getSiteSecurityStates(
    scanData,
    blockaidOverrideState,
  );

  const shouldShowWarning = isMalicious || isSuspicious || isUnableToScan;

  let attackTypes = [] as string[];
  if (scanData) {
    attackTypes = Object.keys(
      "attack_types" in scanData ? scanData.attack_types : {},
    );
  }

  // Inject override message if override is active but no attack types present
  const hasOverrideWithoutMessages =
    blockaidOverrideState &&
    (blockaidOverrideState === SecurityLevel.MALICIOUS ||
      blockaidOverrideState === SecurityLevel.SUSPICIOUS) &&
    attackTypes.length === 0;

  return isPasswordRequired ? (
    <VerifyAccount
      isApproval
      customBackAction={() => setIsPasswordRequired(false)}
      customSubmit={verifyPasswordThenSign}
    />
  ) : (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && hardwareWalletType && (
        <HardwareSign walletType={hardwareWalletType} uuid={message.uuid} />
      )}
      <React.Fragment>
        <View.Content>
          <MultiPaneSlider
            activeIndex={activePaneIndex}
            panes={[
              <div className="SignMessage__MainPane">
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
                {shouldShowWarning && (
                  <div className="SignMessage__BlockaidBanner">
                    <BlockAidSiteScanLabel
                      isMalicious={isMalicious}
                      isUnableToScan={isUnableToScan}
                      status={scanData?.status}
                      onClick={() => setActivePaneIndex(1)}
                    />
                  </div>
                )}
                <Message
                  prefix={SIGN_MESSAGE_PREFIX}
                  message={message.message}
                />
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
              </div>,
              <div className="SignMessage__BlockaidDetails">
                <div className="SignMessage__BlockaidDetails__Header">
                  <div
                    className={isMalicious ? "WarningMarkError" : "WarningMark"}
                  >
                    <Icon.AlertOctagon />
                  </div>
                  <div className="Close" onClick={() => setActivePaneIndex(0)}>
                    <Icon.X />
                  </div>
                </div>
                <div className="SignMessage__BlockaidDetails__Title">
                  {isUnableToScan
                    ? t("Proceed with caution")
                    : isMalicious
                      ? t("Do not proceed")
                      : t("Suspicious Request")}
                </div>
                <div className="SignMessage__BlockaidDetails__SubTitle">
                  {isUnableToScan
                    ? t("We were unable to scan this site for security issues")
                    : isMalicious
                      ? t(
                          "This site does not appear safe for the following reasons",
                        )
                      : t("This site has been flagged with potential concerns")}
                </div>
                <div className="SignMessage__BlockaidDetails__Details">
                  {!isUnableToScan &&
                    attackTypes.length > 0 &&
                    attackTypes.map((attack, index) => (
                      <div
                        key={index}
                        className={
                          isMalicious
                            ? "SignMessage__BlockaidDetails__DetailRowError"
                            : "SignMessage__BlockaidDetails__DetailRow"
                        }
                      >
                        {isMalicious ? <Icon.XCircle /> : <Icon.MinusCircle />}
                        <span>
                          {
                            ATTACK_TO_DISPLAY[
                              attack as keyof typeof ATTACK_TO_DISPLAY
                            ]
                          }
                        </span>
                      </div>
                    ))}
                  {hasOverrideWithoutMessages && (
                    <div
                      className={
                        blockaidOverrideState === SecurityLevel.MALICIOUS
                          ? "SignMessage__BlockaidDetails__DetailRowError"
                          : "SignMessage__BlockaidDetails__DetailRow"
                      }
                    >
                      {blockaidOverrideState === SecurityLevel.MALICIOUS ? (
                        <Icon.XCircle />
                      ) : (
                        <Icon.MinusCircle />
                      )}
                      <span>{t("This site was flagged as malicious")}</span>
                    </div>
                  )}
                  {isUnableToScan && (
                    <div className="SignMessage__BlockaidDetails__DetailRow">
                      <Icon.MinusCircle />
                      <span>{t("Unable to scan site")}</span>
                    </div>
                  )}
                  <BlockaidByLine address={""} />
                </div>
              </div>,
            ]}
          />
        </View.Content>
        <View.Footer>
          {!shouldShowWarning && (
            <span className="SignMessage__Warning">
              {t("Only confirm if you trust this site")}
            </span>
          )}
          <div className="SignMessage__Actions">
            {shouldShowWarning ? (
              <>
                <Button
                  size="lg"
                  isFullWidth
                  isRounded
                  variant={isMalicious ? "destructive" : "secondary"}
                  onClick={() => rejectAndClose()}
                >
                  <span className="SignMessage__CancelBtn">{t("Cancel")}</span>
                </Button>
                <Button
                  data-testid="sign-message-confirm-anyway-button"
                  disabled={!isDomainListedAllowed}
                  size="lg"
                  isFullWidth
                  isRounded
                  variant={isMalicious ? "error" : "tertiary"}
                  isLoading={isConfirming}
                  onClick={() => handleApprove()}
                >
                  {t("Confirm anyway")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  isFullWidth
                  isRounded
                  variant="tertiary"
                  onClick={() => rejectAndClose()}
                >
                  <span className="SignMessage__CancelBtn">{t("Cancel")}</span>
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
              </>
            )}
          </div>
        </View.Footer>
      </React.Fragment>
    </>
  );
};
