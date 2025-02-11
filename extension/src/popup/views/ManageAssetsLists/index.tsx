import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Route, Routes } from "react-router-dom";
import { captureException } from "@sentry/browser";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { NETWORKS } from "@shared/constants/stellar";
import { AssetsListKey } from "@shared/constants/soroban/token";
import { settingsSelector } from "popup/ducks/settings";
import { PublicKeyRoute } from "popup/Router";

import { AssetLists } from "popup/components/manageAssetsLists/AssetLists";
import { ModifyAssetList } from "popup/components/manageAssetsLists/ModifyAssetList";

import "./styles.scss";
import { getPathFromRoute } from "popup/helpers/route";

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
  const [selectedNetwork, setSelectedNetwork] = useState("" as AssetsListKey);
  const [assetsListsData, setAssetsListsData] = useState(
    [] as AssetsListsData[],
  );
  const [sortedAssetsListsData, setSortedAssetsListsData] = useState({
    enabled: [],
    disabled: [],
  } as SortedAssetsListsData);
  const [isLoading, setIsLoading] = useState(true);
  const { assetsLists, networkDetails } = useSelector(settingsSelector);
  const { t } = useTranslation();

  useEffect(() => {
    if (!selectedNetwork) {
      return;
    }
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
  }, [selectedNetwork, assetsLists]);

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
    setSelectedNetwork(
      networkDetails.network === NETWORKS.TESTNET
        ? NETWORKS.TESTNET
        : NETWORKS.PUBLIC,
    );
  }, [networkDetails]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNetwork(e.target.value as AssetsListKey);
  };

  const addNetworkPath = getPathFromRoute({
    fullRoute: ROUTES.manageAssetsListsModifyAssetList,
    basePath: "/manage-assets-list/",
  });

  return assetsLists ? (
    <>
      <Routes>
        <Route
          index
          element={
            <PublicKeyRoute>
              <AssetLists
                sortedAssetsListsData={sortedAssetsListsData}
                handleSelectChange={handleSelectChange}
                selectedNetwork={selectedNetwork}
                isLoading={isLoading}
              />
            </PublicKeyRoute>
          }
        ></Route>
        <Route
          path={addNetworkPath}
          element={
            <PublicKeyRoute>
              <ModifyAssetList
                assetsListsData={assetsListsData}
                selectedNetwork={selectedNetwork}
              />
            </PublicKeyRoute>
          }
        ></Route>
      </Routes>
    </>
  ) : (
    <div>{t("Unable to parse assets lists")}</div>
  );
};
