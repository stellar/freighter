import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Loader, Notification } from "@stellar/design-system";

import { getUrlHostname, newTabHref, parsedSearchParam } from "helpers/urls";
import { rejectAccess, grantAccess } from "popup/ducks/access";
import { ButtonsContainer, ModalWrapper } from "popup/basics/Modal";
import { DomainScanModalInfo } from "popup/components/ModalInfo";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";
import { AppDispatch } from "popup/App";

import "popup/metrics/access";
import "./styles.scss";
import { RequestState } from "constants/request";
import { openTab } from "popup/helpers/navigate";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { useGetGrantAccessData } from "./hooks/useGetGrantAccessData";

export const GrantAccess = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const [isGranting, setIsGranting] = useState(false);

  const { url } = parsedSearchParam(location.search);
  const domain = getUrlHostname(url);
  const { state, fetchData } = useGetGrantAccessData(url);

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

  if (state.data?.type === "re-route") {
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

  if (
    state.data.type === "resolved" &&
    (state.data.applicationState === APPLICATION_STATE.PASSWORD_CREATED ||
      state.data.applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    window.close();
  }

  const { publicKey, networkDetails, networksList } = state.data;

  const rejectAndClose = () => {
    dispatch(rejectAccess());
    window.close();
  };

  const grantAndClose = async () => {
    setIsGranting(true);

    await dispatch(grantAccess(url));
    window.close();
  };

  const isMalicious = state.data.status === "hit" && state.data.is_malicious;

  return (
    <>
      <ModalWrapper>
        <DomainScanModalInfo
          domain={domain}
          isMalicious={isMalicious}
          scanStatus={state.data.status}
          subject={t(
            `Allow ${domain} to view your wallet address, balance, activity and request approval for transactions`,
          )}
        >
          <div
            className="GrantAccess__SigningWith"
            data-testid="grant-access-view"
          >
            <h5>Connecting with</h5>
            <div className="GrantAccess__network">
              <NetworkIcon
                index={networksList.findIndex(
                  ({ networkName: currNetworkName }) =>
                    currNetworkName === networkDetails.networkName,
                )}
              />
              <span>{networkDetails.networkName}</span>
            </div>
            <div className="GrantAccess__PublicKey">
              <KeyIdenticon publicKey={publicKey} />
            </div>
          </div>
          {isMalicious ? (
            <ButtonsContainer>
              <Button
                data-testid="grant-access-connect-anyway-button"
                size="md"
                isFullWidth
                variant="error"
                isLoading={isGranting}
                onClick={() => grantAndClose()}
              >
                {t("Connect anyway")}
              </Button>
              <Button
                size="md"
                isFullWidth
                variant="tertiary"
                onClick={rejectAndClose}
              >
                {t("Reject")}
              </Button>
            </ButtonsContainer>
          ) : (
            <ButtonsContainer>
              <Button
                size="md"
                isFullWidth
                variant="tertiary"
                onClick={rejectAndClose}
              >
                {t("Cancel")}
              </Button>
              <Button
                data-testid="grant-access-connect-button"
                size="md"
                isFullWidth
                variant="secondary"
                isLoading={isGranting}
                onClick={() => grantAndClose()}
              >
                {t("Connect")}
              </Button>
            </ButtonsContainer>
          )}
        </DomainScanModalInfo>
      </ModalWrapper>
    </>
  );
};
