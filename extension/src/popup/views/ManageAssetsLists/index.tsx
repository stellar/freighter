import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Switch } from "react-router-dom";
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

export interface AssetsListsData {
  url: string;
  name: string;
  provider: string;
  description: string;
  isEnabled: boolean;
}

export const ManageAssetsLists = () => {
  const [selectedNetwork, setSelectedNetwork] = useState("" as AssetsListKey);
  const [assetsListsData, setAssetsListsData] = useState(
    [] as AssetsListsData[],
  );
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
      // eslint-disable-next-line no-restricted-syntax
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
    setSelectedNetwork(
      networkDetails.network === NETWORKS.TESTNET
        ? NETWORKS.TESTNET
        : NETWORKS.PUBLIC,
    );
  }, [networkDetails]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNetwork(e.target.value as AssetsListKey);
  };

  return assetsLists ? (
    <>
      <Switch>
        <PublicKeyRoute exact path={ROUTES.manageAssetsLists}>
          <AssetLists
            assetsListsData={assetsListsData}
            handleSelectChange={handleSelectChange}
            selectedNetwork={selectedNetwork}
            isLoading={isLoading}
          />
        </PublicKeyRoute>
        <PublicKeyRoute exact path={ROUTES.manageAssetsListsModifyAssetList}>
          <ModifyAssetList
            assetsListsData={assetsListsData}
            selectedNetwork={selectedNetwork}
          />
        </PublicKeyRoute>
      </Switch>
    </>
  ) : (
    <div>{t("Unable to parse assets lists")}</div>
  );
};
