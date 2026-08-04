import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Button, Icon, Notification, Select } from "@stellar/design-system";
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
import {
  ScreenReaderOnly,
  Sheet,
  SheetContent,
  SheetTitle,
} from "popup/basics/shadcn/Sheet";
import { Discover } from "popup/views/Discover";

import "./styles.scss";

export const ManageConnectedApps = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const location = useLocation();
  const [selectedNetworkName, setSelectedNetworkName] = useState("");
  const [selectedAllowlist, setSelectedAllowlist] = useState<string[]>([]);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);

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
      <SubviewHeader title={t("Connected apps")} customBackIcon={<Icon.X />} />
      <View.Content hasNoTopPadding>
        <div className="ManageConnectedApps">
          <div className="ManageConnectedApps__network-pill">
            <NetworkIcon
              index={networksList.findIndex(
                ({ networkName: currNetworkName }) =>
                  currNetworkName === selectedNetworkName,
              )}
            />
            <span className="ManageConnectedApps__network-pill__label">
              {selectedNetworkName}
            </span>
            <Icon.ChevronDown className="ManageConnectedApps__network-pill__chevron" />
            <Select
              data-testid="manage-connected-apps-select"
              fieldSize="md"
              id="select"
              className="ManageConnectedApps__network-pill__select"
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
                size="lg"
                variant="tertiary"
                isFullWidth
                isRounded
                onClick={handleRemoveAll}
                className="ManageConnectedApps__disconnect-all"
              >
                {t("Disconnect all")}
              </Button>
            </div>
          ) : (
            <div
              className="ManageConnectedApps__empty"
              data-testid="connected-apps-empty"
            >
              <div className="ManageConnectedApps__empty__badge">
                <Icon.NotificationBox />
              </div>
              <div className="ManageConnectedApps__empty__title">
                {t("Nothing connected yet")}
              </div>
              <div className="ManageConnectedApps__empty__subtitle">
                {t("Discover apps and connect your first one.")}
              </div>
              <Button
                size="md"
                variant="secondary"
                isRounded
                onClick={() => setIsDiscoverOpen(true)}
                data-testid="go-to-discover"
              >
                {t("Go to Discover")}
              </Button>
            </div>
          )}
        </div>
      </View.Content>
      <Sheet
        open={isDiscoverOpen}
        onOpenChange={(open) => !open && setIsDiscoverOpen(false)}
      >
        <SheetContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
          side="bottom"
          className="ManageConnectedApps__discover-sheet"
        >
          <ScreenReaderOnly>
            <SheetTitle>{t("Discover")}</SheetTitle>
          </ScreenReaderOnly>
          <Discover onClose={() => setIsDiscoverOpen(false)} />
        </SheetContent>
      </Sheet>
    </React.Fragment>
  );
};
