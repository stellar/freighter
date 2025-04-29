import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import { Button, Notification, Select } from "@stellar/design-system";

import { saveAllowList, settingsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";

import { View } from "popup/basics/layout/View";
import { RemoveButton } from "popup/basics/buttons/RemoveButton";
import { AppDispatch } from "popup/App";

import "./styles.scss";
import { useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { Navigate, useLocation } from "react-router-dom";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";

export const ManageConnectedApps = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const location = useLocation();
  const { allowList, networkDetails, networksList } =
    useSelector(settingsSelector);
  const publicKey = useSelector(publicKeySelector);
  const [selectedNetworkName, setSelectedNetworkName] = useState(
    networkDetails.networkName,
  );
  const [selectedAllowlist, setSelectedAllowlist] = useState(
    allowList?.[networkDetails.networkName]?.[publicKey] || [],
  );

  const { state, fetchData } = useGetAppData();

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNetworkName(e.target.value);
  };

  const handleRemove = (domainToRemove: string) => {
    dispatch(
      saveAllowList({
        domain: domainToRemove,
        networkName: selectedNetworkName,
      }),
    );
  };

  const handleRemoveAll = () => {
    for (let i = 0; i < selectedAllowlist.length; i += 1) {
      const domain = selectedAllowlist[i];
      dispatch(saveAllowList({ domain, networkName: selectedNetworkName }));
    }
  };

  useEffect(() => {
    setSelectedAllowlist(allowList?.[selectedNetworkName]?.[publicKey] || []);
  }, [
    setSelectedAllowlist,
    allowList,
    publicKey,
    selectedNetworkName,
    networkDetails,
    networksList,
  ]);

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
    (state.data.account.applicationState ===
      APPLICATION_STATE.PASSWORD_CREATED ||
      state.data.account.applicationState ===
        APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    window.close();
  }

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
