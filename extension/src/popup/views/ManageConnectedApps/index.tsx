import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Button, Notification, Select } from "@stellar/design-system";
import { Navigate, useLocation } from "react-router-dom";

import { saveAllowList } from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";

import { View } from "popup/basics/layout/View";
import { RemoveButton } from "popup/basics/buttons/RemoveButton";
import { AppDispatch } from "popup/App";
import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";

import "./styles.scss";

export const ManageConnectedApps = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const location = useLocation();
  const [selectedNetworkName, setSelectedNetworkName] = useState("");
  const [selectedAllowlist, setSelectedAllowlist] = useState<string[]>([]);

  const { state, fetchData } = useGetAppData();

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNetworkName(e.target.value);
  };

  const handleRemove = async (domainToRemove: string) => {
    await dispatch(
      saveAllowList({
        domain: domainToRemove,
        networkName: selectedNetworkName,
      }),
    );
    await fetchData(false);
  };

  const handleRemoveAll = async () => {
    for (const domain of selectedAllowlist) {
      await dispatch(
        saveAllowList({ domain, networkName: selectedNetworkName }),
      );
    }
    await fetchData(false);
  };

  useEffect(() => {
    if (
      state.state === RequestState.SUCCESS &&
      state.data.type === AppDataType.RESOLVED
    ) {
      const { publicKey } = state.data.account;
      const { allowList, networkDetails } = state.data.settings;

      setSelectedAllowlist(
        allowList?.[selectedNetworkName || networkDetails.networkName]?.[
          publicKey
        ] || [],
      );
      if (!selectedNetworkName) {
        setSelectedNetworkName(networkDetails.networkName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSelectedAllowlist, selectedNetworkName, state.state]);

  useEffect(() => {
    const getData = async () => {
      await fetchData(false);
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
      <SubviewHeader title={t("Connected apps")} />
      <View.Content hasNoTopPadding>
        <div className="ManageConnectedApps">
          <div className="ManageConnectedApps__select-wrapper">
            <Select
              data-testid="manage-connected-apps-select"
              fieldSize="sm"
              id="select"
              className="ManageConnectedApps__select"
              onChange={handleSelectChange}
            >
              {networksList.map(({ networkName }) => (
                <option
                  value={networkName}
                  key={networkName}
                  selected={networkName === selectedNetworkName}
                >
                  {networkName}
                </option>
              ))}
            </Select>
          </div>
          <div className="ManageConnectedApps__network">
            <NetworkIcon
              index={networksList.findIndex(
                ({ networkName: currNetworkName }) =>
                  currNetworkName === selectedNetworkName,
              )}
            />
          </div>
          {selectedAllowlist.length ? (
            <div className="ManageConnectedApps__wrapper">
              <div className="ManageConnectedApps__list">
                {selectedAllowlist.map(
                  (allowedDomain) =>
                    allowedDomain && (
                      <div
                        className="ManageConnectedApps__row"
                        key={allowedDomain}
                      >
                        <PunycodedDomain domain={allowedDomain} isRow />
                        <RemoveButton
                          onClick={() => handleRemove(allowedDomain)}
                        />
                      </div>
                    ),
                )}
              </div>

              <Button
                size="md"
                variant="error"
                isFullWidth
                onClick={handleRemoveAll}
              >
                {t("Disconnect all")}
              </Button>
            </div>
          ) : (
            <div className="ManageConnectedApps__empty">
              {t("No connected apps found")}
            </div>
          )}
        </div>
      </View.Content>
    </React.Fragment>
  );
};
