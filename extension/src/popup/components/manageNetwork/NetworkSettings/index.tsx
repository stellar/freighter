import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Notification, Select } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";
import { ListNavLink, ListNavLinkWrapper } from "popup/basics/ListNavLink";

import { isActiveNetwork } from "helpers/stellar";
import { navigateTo, openTab } from "popup/helpers/navigate";

import {
  changeNetwork,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";
import { View } from "popup/basics/layout/View";
import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import { AppDispatch } from "popup/App";
import { NETWORK_INDEX_SEARCH_PARAM } from "../NetworkForm";

import "./styles.scss";

export const NetworkSettings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const activeNetworkDetails = useSelector(settingsNetworkDetailsSelector);
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, fetchData } = useGetAppData();

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
    return <Loading />;
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
    applicationState: state.data.account.applicationState,
    state: state.state,
  });

  const { networksList } = state.data.settings;

  return (
    <React.Fragment>
      <SubviewHeader title={t("Network")} />
      <View.Content hasNoTopPadding>
        <div className="NetworkSettings">
          <Select
            fieldSize="md"
            id="select"
            label="Current Network"
            className="NetworkSettings__select"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              dispatch(changeNetwork({ networkName: e.target.value }));
            }}
          >
            {networksList.map((network) => (
              <option
                value={network.networkName}
                key={network.networkPassphrase}
                selected={isActiveNetwork(activeNetworkDetails, network)}
              >
                {network.networkName}
              </option>
            ))}
          </Select>
          <div className="NetworkSettings__header">{t("Network Settings")}</div>
          <ListNavLinkWrapper>
            {networksList.map((network, i) => {
              return (
                <ListNavLink
                  key={network.networkName}
                  href={ROUTES.editNetwork}
                  searchParams={`?${NETWORK_INDEX_SEARCH_PARAM}=${i}`}
                >
                  <div key={network.networkName}>
                    <div className={`NetworkSettings__name`}>
                      <NetworkIcon index={i} />
                      <div>{network.networkName}</div>
                    </div>
                  </div>
                </ListNavLink>
              );
            })}
          </ListNavLinkWrapper>
        </div>
      </View.Content>
      <View.Footer>
        <Button
          size="lg"
          isFullWidth
          isRounded
          variant="secondary"
          onClick={() => navigateTo(ROUTES.addNetwork, navigate)}
        >
          {t("Add Custom Network")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
