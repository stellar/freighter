import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import { getUrlHostname, newTabHref, parsedSearchParam } from "helpers/urls";
import { rejectAccess, grantAccess } from "popup/ducks/access";
import { DomainScanModalInfo } from "popup/components/ModalInfo";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { AppDispatch } from "popup/App";
import { RequestState } from "constants/request";
import { openTab } from "popup/helpers/navigate";
import { useGetGrantAccessData } from "./hooks/useGetGrantAccessData";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { reRouteOnboarding } from "popup/helpers/route";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";

import "popup/metrics/access";
import "./styles.scss";
import { BlockaidByLine } from "popup/components/WarningMessages";
import { ATTACK_TO_DISPLAY } from "popup/helpers/blockaid";

export const GrantAccess = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  const { url } = parsedSearchParam(location.search);
  const domain = getUrlHostname(url);
  const { state, fetchData } = useGetGrantAccessData(url);

  const [isGranting, setIsGranting] = useState(false);
  const [activePaneIndex, setActivePaneIndex] = useState(0);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    state.state === RequestState.IDLE ||
    state.state === RequestState.LOADING
  ) {
    return (
      <div className="GrantAccess__loader">
        <Loader size="5rem" />
      </div>
    );
  }

  if (state.state === RequestState.ERROR) {
    return (
      <div className="AddAsset__fetch-fail">
        <Notification
          variant="error"
          title={t("Failed to fetch your account data.")}
        >
          {t("Your account data could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (state.data?.type === AppDataType.REROUTE) {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${state.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  reRouteOnboarding({
    type: state.data.type,
    applicationState: state.data.applicationState,
    state: state.state,
  });

  const { publicKey, networkDetails } = state.data;

  const rejectAndClose = () => {
    dispatch(rejectAccess());
    window.close();
  };

  const grantAndClose = async () => {
    setIsGranting(true);

    await dispatch(grantAccess(url));
    window.close();
  };

  const scanData = state.data.scanData;
  const isMalicious = scanData.status === "hit" && scanData.is_malicious;
  const attackTypes = Object.keys(
    "attack_types" in scanData ? scanData.attack_types : {},
  );

  return (
    <>
      <View.Content>
        <MultiPaneSlider
          activeIndex={activePaneIndex}
          panes={[
            <DomainScanModalInfo
              domain={domain}
              isMalicious={isMalicious}
              scanStatus={scanData.status}
              onClick={() => setActivePaneIndex(1)}
              subject={t(
                `Allow ${domain} to view your wallet address, balance, activity and request approval for transactions`,
              )}
            >
              <div
                className="GrantAccess__SigningWith"
                data-testid="grant-access-view"
              >
                <div className="GrantAccess__Detail">
                  <div className="GrantAccess__Detail__Label">
                    <Icon.Wallet01 />
                    <span>Wallet</span>
                  </div>
                  <div className="GrantAccess__Detail__Value">
                    <KeyIdenticon publicKey={publicKey} />
                  </div>
                </div>
                <div className="GrantAccess__Detail">
                  <div className="GrantAccess__Detail__Label">
                    <Icon.Globe02 />
                    <span>Network</span>
                  </div>
                  <div className="GrantAccess__Detail__Value">
                    <span>{networkDetails.networkName}</span>
                  </div>
                </div>
              </div>
            </DomainScanModalInfo>,
            <div className="GrantAccess__BlockaidDetails">
              <div className="GrantAccess__BlockaidDetails__Header">
                <div className="WarningMark">
                  <Icon.AlertOctagon />
                </div>
                <div className="Close" onClick={() => setActivePaneIndex(0)}>
                  <Icon.X />
                </div>
              </div>
              <div className="GrantAccess__BlockaidDetails__Title">
                Do not proceed
              </div>
              <div className="GrantAccess__BlockaidDetails__SubTitle">
                This transaction does not appear safe for the following reasons.
              </div>
              <div className="GrantAccess__BlockaidDetails__Details">
                {attackTypes.map((attack) => (
                  <div className="GrantAccess__BlockaidDetails__DetailRow">
                    <Icon.XCircle />
                    <span>
                      {
                        ATTACK_TO_DISPLAY[
                          attack as keyof typeof ATTACK_TO_DISPLAY
                        ]
                      }
                    </span>
                  </div>
                ))}
                <BlockaidByLine address={""} />
              </div>
            </div>,
          ]}
        />
      </View.Content>
      <View.Footer>
        {!isMalicious && (
          <span className="GrantAccess__Warning">
            Only confirm if you trust this site
          </span>
        )}
        {isMalicious ? (
          <div className="GrantAccess__ButtonsContainerMalicious">
            <Button
              size="md"
              isFullWidth
              isRounded
              variant="destructive"
              onClick={rejectAndClose}
            >
              {t("Cancel")}
            </Button>
            <Button
              data-testid="grant-access-connect-anyway-button"
              className="GrantAccess__ConnectAnywayBtn"
              size="md"
              isFullWidth
              isRounded
              variant="error"
              isLoading={isGranting}
              onClick={() => grantAndClose()}
            >
              {t("Connect anyway")}
            </Button>
          </div>
        ) : (
          <div className="GrantAccess__ButtonsContainer">
            <Button
              size="md"
              isFullWidth
              isRounded
              variant="tertiary"
              onClick={rejectAndClose}
            >
              {t("Cancel")}
            </Button>
            <Button
              data-testid="grant-access-connect-button"
              size="md"
              isFullWidth
              isRounded
              variant="secondary"
              isLoading={isGranting}
              onClick={() => grantAndClose()}
            >
              {t("Connect")}
            </Button>
          </div>
        )}
      </View.Footer>
    </>
  );
};
