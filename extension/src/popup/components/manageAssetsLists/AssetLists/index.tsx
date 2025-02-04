import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Select, Loader, Badge } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ListNavLink, ListNavLinkWrapper } from "popup/basics/ListNavLink";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { NETWORKS } from "@shared/constants/stellar";
import { AssetsListKey } from "@shared/constants/soroban/token";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";
import { View } from "popup/basics/layout/View";

import {
  AssetsListsData,
  SortedAssetsListsData,
} from "popup/views/ManageAssetsLists";

import "./styles.scss";

const ASSETS_LISTS_NETWORKS = [
  ["Mainnet", NETWORKS.PUBLIC],
  ["Testnet", NETWORKS.TESTNET],
];

interface AssetListsProps {
  sortedAssetsListsData: SortedAssetsListsData;
  handleSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedNetwork: AssetsListKey;
  isLoading: boolean;
}

const AssetListLink = ({ assetList }: { assetList: AssetsListsData }) => (
  <ListNavLink
    href={ROUTES.manageAssetsListsModifyAssetList}
    searchParams={`?asset-list-url=${encodeURIComponent(assetList.url)}`}
    key={assetList.name}
  >
    <div>
      <div className="ManageAssetsLists__title">{assetList.name}</div>
      <div className="ManageAssetsLists__subtitle">{assetList.provider}</div>
    </div>
  </ListNavLink>
);

export const AssetLists = ({
  sortedAssetsListsData,
  handleSelectChange,
  selectedNetwork,
  isLoading,
}: AssetListsProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <SubviewHeader title="Asset Lists" />
      <View.Content hasNoTopPadding>
        <div className="ManageAssetsLists__select-wrapper">
          <Select
            fieldSize="sm"
            id="select"
            className="ManageAssetsLists__select"
            onChange={handleSelectChange}
          >
            {ASSETS_LISTS_NETWORKS.map(([networkName, networkValue]) => (
              <option
                value={networkValue}
                key={networkName}
                selected={networkValue === selectedNetwork}
              >
                {networkName}
              </option>
            ))}
          </Select>
        </div>
        <div className="ManageAssetsLists__network">
          <NetworkIcon index={selectedNetwork === NETWORKS.PUBLIC ? 0 : 1} />
        </div>
        {isLoading ? (
          <div className="ManageAssetsLists__loader">
            <Loader size="5rem" />
          </div>
        ) : (
          <>
            <div className="ManageAssetsLists__list">
              <div className="ManageAssetsLists__badge">
                <Badge variant="success">{t("Enabled")}</Badge>
              </div>
              <ListNavLinkWrapper>
                {sortedAssetsListsData.enabled.map((assetList) => (
                  <AssetListLink assetList={assetList} />
                ))}
              </ListNavLinkWrapper>
            </div>

            {sortedAssetsListsData.disabled.length ? (
              <div className="ManageAssetsLists__list">
                <div className="ManageAssetsLists__badge">
                  <Badge variant="tertiary">{t("Disabled")}</Badge>
                </div>
                <ListNavLinkWrapper>
                  {sortedAssetsListsData.disabled.map((assetList) => (
                    <AssetListLink assetList={assetList} />
                  ))}
                </ListNavLinkWrapper>
              </div>
            ) : null}
          </>
        )}
      </View.Content>
      <View.Footer>
        <Button
          disabled={isLoading}
          size="md"
          isFullWidth
          variant="tertiary"
          onClick={() =>
            navigateTo(ROUTES.manageAssetsListsModifyAssetList, navigate)
          }
        >
          {t("Add new list")}
        </Button>
      </View.Footer>
    </>
  );
};
