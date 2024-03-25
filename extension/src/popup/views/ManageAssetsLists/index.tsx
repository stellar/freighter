import React, { useEffect, useState } from "react";
import { Button, Select, Loader } from "@stellar/design-system";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { captureException } from "@sentry/browser";

import { ListNavLink, ListNavLinkWrapper } from "popup/basics/ListNavLink";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { NETWORKS } from "@shared/constants/stellar";
import { AssetsListKey } from "@shared/constants/soroban/token";
import { settingsSelector } from "popup/ducks/settings";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

const ASSETS_LISTS_NETWORKS = [
  ["Mainnet", NETWORKS.PUBLIC],
  ["Testnet", NETWORKS.TESTNET],
];

interface AssetsListData {
  name: string;
  provider: string;
}

export const ManageAssetsLists = () => {
  const { t } = useTranslation();
  const [selectedNetwork, setSelectedNetwork] = useState(
    NETWORKS.PUBLIC as AssetsListKey,
  );
  const [assetsListData, setAssetsListData] = useState([] as AssetsListData[]);
  const [isLoading, setIsLoading] = useState(true);
  const { assetsLists } = useSelector(settingsSelector);

  useEffect(() => {
    const networkLists = assetsLists[selectedNetwork];
    const listsArr: AssetsListData[] = [];

    const fetchLists = async () => {
      setIsLoading(true);

      // TODO: make these calls concurrent
      // eslint-disable-next-line no-restricted-syntax
      for (const networkList of networkLists) {
        const { url = "" } = networkList;
        try {
          const res = await fetch(url);
          const resJson: AssetsListData = await res.json();
          listsArr.push(resJson);
        } catch (e) {
          captureException(`Failed to load asset list: ${url}`);
        }
      }

      setAssetsListData(listsArr);
      setIsLoading(false);
    };

    fetchLists();
  }, [selectedNetwork, assetsLists]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNetwork(e.target.value as AssetsListKey);
  };

  return (
    <>
      <SubviewHeader title="Security" />
      <View.Content hasNoTopPadding>
        <Select
          fieldSize="sm"
          id="select"
          className="ManageAssetsLists__select"
          onChange={handleSelectChange}
        >
          {ASSETS_LISTS_NETWORKS.map(([networkName, networkValue]) => (
            <option value={networkValue}>{networkName}</option>
          ))}
        </Select>
        <div className="ManageAssetsLists__network">
          <NetworkIcon index={selectedNetwork === NETWORKS.PUBLIC ? 0 : 1} />
        </div>
        {isLoading ? (
          <div className="ManageAssetsLists__loader">
            <Loader size="5rem" />
          </div>
        ) : (
          <div className="ManageAssetsLists__list">
            <ListNavLinkWrapper>
              {assetsListData.map(({ name, provider }) => (
                <ListNavLink href={ROUTES.manageAssetsLists}>
                  <div>
                    <div className="ManageAssetsLists__title">{name}</div>
                    <div className="ManageAssetsLists__subtitle">
                      {provider}
                    </div>
                  </div>
                </ListNavLink>
              ))}
            </ListNavLinkWrapper>
          </div>
        )}
      </View.Content>
      <View.Footer>
        <Button
          size="md"
          isFullWidth
          variant="tertiary"
          onClick={() => navigateTo(ROUTES.account)}
        >
          {t("Add new list")}
        </Button>
      </View.Footer>
    </>
  );
};
