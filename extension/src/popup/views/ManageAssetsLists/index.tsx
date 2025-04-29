import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { captureException } from "@sentry/browser";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { NETWORKS } from "@shared/constants/stellar";
import { AssetsListKey } from "@shared/constants/soroban/asset-list";

import { AssetLists } from "popup/components/manageAssetsLists/AssetLists";
import { ModifyAssetList } from "popup/components/manageAssetsLists/ModifyAssetList";

import "./styles.scss";
import { getPathFromRoute } from "popup/helpers/route";
import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { Notification } from "@stellar/design-system";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

export interface AssetsListsData {
  url: string;
  name: string;
  provider: string;
  description: string;
  isEnabled: boolean;
}

export interface SortedAssetsListsData {
  enabled: AssetsListsData[];
  disabled: AssetsListsData[];
}

export const ManageAssetsLists = () => {
  const location = useLocation();
  const [selectedNetwork, setSelectedNetwork] = useState("" as AssetsListKey);
  const [assetsListsData, setAssetsListsData] = useState(
    [] as AssetsListsData[],
  );
  const [sortedAssetsListsData, setSortedAssetsListsData] = useState({
    enabled: [],
    disabled: [],
  } as SortedAssetsListsData);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const { state, fetchData } = useGetAppData();

  useEffect(() => {
    if (
      !selectedNetwork ||
      state.state !== RequestState.SUCCESS ||
      state.data.type !== AppDataType.RESOLVED
    ) {
      return;
    }
    const { assetsLists } = state.data.settings;
    const networkLists = assetsLists[selectedNetwork] || [];
    const listsArr: AssetsListsData[] = [];

    const fetchLists = async () => {
      setIsLoading(true);

      // TODO: make these calls concurrent

      for (const networkList of networkLists) {
        const { url = "", isEnabled } = networkList;
        try {
          const res = await fetch(url);
          const resJson: AssetsListsData = await res.json();
          resJson.url = url;
          resJson.isEnabled = isEnabled;
          listsArr.push(resJson);
        } catch (e) {
          captureException(`Failed to load asset list: ${url}`);
        }
      }

      setAssetsListsData(listsArr);
      setIsLoading(false);
    };

    fetchLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNetwork, state.state]);

  useEffect(() => {
    if (assetsListsData.length) {
      const sortedList: SortedAssetsListsData = {
        enabled: [],
        disabled: [],
      };
      assetsListsData.forEach((list) => {
        if (list.isEnabled) {
          sortedList.enabled.push(list);
        } else {
          sortedList.disabled.push(list);
        }
      });

      setSortedAssetsListsData(sortedList);
    }
  }, [assetsListsData]);

  useEffect(() => {
    if (
      state.state === RequestState.SUCCESS &&
      state.data.type === AppDataType.RESOLVED
    ) {
      const { networkDetails } = state.data.settings;
      setSelectedNetwork(
        networkDetails.network === NETWORKS.TESTNET
          ? NETWORKS.TESTNET
          : NETWORKS.PUBLIC,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.state]);

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

  const { assetsLists } = state.data.settings;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNetwork(e.target.value as AssetsListKey);
  };

  const addNetworkPath = getPathFromRoute({
    fullRoute: ROUTES.manageAssetsListsModifyAssetList,
    basePath: "/manage-assets-lists/",
  });

  return assetsLists ? (
    <>
      <Routes>
        <Route
          index
          element={
            <AssetLists
              sortedAssetsListsData={sortedAssetsListsData}
              handleSelectChange={handleSelectChange}
              selectedNetwork={selectedNetwork}
              isLoading={isLoading}
            />
          }
        ></Route>
        <Route
          path={addNetworkPath}
          element={
            <ModifyAssetList
              assetsListsData={assetsListsData}
              selectedNetwork={selectedNetwork}
            />
          }
        ></Route>
      </Routes>
    </>
  ) : (
    <div>{t("Unable to parse assets lists")}</div>
  );
};
