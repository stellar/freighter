import React from "react";
import { Button, Select, Loader } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ListNavLink, ListNavLinkWrapper } from "popup/basics/ListNavLink";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { NETWORKS } from "@shared/constants/stellar";
import { AssetsListKey } from "@shared/constants/soroban/token";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";
import { View } from "popup/basics/layout/View";

import { AssetsListsData } from "popup/views/ManageAssetsLists";

import "./styles.scss";

const ASSETS_LISTS_NETWORKS = [
  ["Mainnet", NETWORKS.PUBLIC],
  ["Testnet", NETWORKS.TESTNET],
];

interface AssetListsProps {
  assetsListsData: AssetsListsData[];
  handleSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedNetwork: AssetsListKey;
  isLoading: boolean;
}

export const AssetLists = ({
  assetsListsData,
  handleSelectChange,
  selectedNetwork,
  isLoading,
}: AssetListsProps) => {
  const { t } = useTranslation();

  return (
    <>
      <SubviewHeader title="Asset Lists" />
      <View.Content hasNoTopPadding>
        <Select
          fieldSize="sm"
          id="select"
          className="ManageAssetsLists__select"
          onChange={handleSelectChange}
        >
          {ASSETS_LISTS_NETWORKS.map(([networkName, networkValue]) => (
            <option value={networkValue} key={networkName}>
              {networkName}
            </option>
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
              {assetsListsData.map(({ name, provider }, i) => (
                <ListNavLink
                  href={ROUTES.manageAssetsListsModifyAssetList}
                  searchParams={`?asset-list-index=${i}`}
                  key={name}
                >
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
          disabled={isLoading}
          size="md"
          isFullWidth
          variant="tertiary"
          onClick={() => navigateTo(ROUTES.manageAssetsListsModifyAssetList)}
        >
          {t("Add new list")}
        </Button>
      </View.Footer>
    </>
  );
};
