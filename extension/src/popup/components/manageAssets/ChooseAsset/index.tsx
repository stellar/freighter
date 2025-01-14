import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Button, Icon, Loader } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import {
  settingsNetworkDetailsSelector,
  settingsSorobanSupportedSelector,
} from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { publicKeySelector } from "popup/ducks/accountServices";

import { RequestState } from "constants/request";
import { useGetAssetDomainsWithBalances } from "helpers/hooks/useGetAssetDomainsWithBalances";
import { isMainnet } from "helpers/stellar";

import { ManageAssetRows } from "../ManageAssetRows";
import { SelectAssetRows } from "../SelectAssetRows";

import "./styles.scss";

export const ChooseAsset = () => {
  const { t } = useTranslation();
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);

  const { state: domainState, fetchData } = useGetAssetDomainsWithBalances(
    publicKey,
    networkDetails,
    {
      isMainnet: isMainnet(networkDetails),
      showHidden: false,
      includeIcons: true,
    },
  );

  const isLoading =
    domainState.state === RequestState.IDLE ||
    domainState.state === RequestState.LOADING;

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <View.Content hasNoTopPadding>
        <div className="ChooseAsset__loader">
          <Loader size="2rem" />
        </div>
      </View.Content>
    );
  }

  return (
    <React.Fragment>
      <SubviewHeader
        title={t("Your assets")}
        customBackIcon={
          !domainState.data?.isManagingAssets ? <Icon.XClose /> : undefined
        }
        rightButton={
          <Link to={ROUTES.assetVisibility}>
            <Button
              size="sm"
              className="ChooseAsset__hide-btn"
              variant="tertiary"
            >
              <Icon.Settings03 />
            </Button>
          </Link>
        }
      />
      <View.Content hasNoTopPadding>
        <div className="ChooseAsset__wrapper" data-testid="ChooseAssetWrapper">
          {!domainState.data?.domains.length ? (
            <div className="ChooseAsset__empty">
              <p>
                You have no assets added. Get started by adding an asset below.
              </p>
            </div>
          ) : (
            <div
              className={`ChooseAsset__assets${
                domainState.data.isManagingAssets && isSorobanSuported
                  ? "--short"
                  : ""
              }`}
              ref={ManageAssetRowsWrapperRef}
            >
              {domainState.data.isManagingAssets ? (
                <ManageAssetRows
                  shouldSplitAssetsByVerificationStatus={false}
                  verifiedAssetRows={domainState.data.domains}
                  unverifiedAssetRows={[]}
                  balances={domainState.data.balances}
                />
              ) : (
                <SelectAssetRows
                  assetRows={domainState.data.domains}
                  balances={domainState.data.balances}
                />
              )}
            </div>
          )}
        </div>
      </View.Content>
      {domainState.data?.isManagingAssets && (
        <View.Footer isInline allowWrap>
          <div className="ChooseAsset__button">
            <Link to={ROUTES.searchAsset}>
              <Button
                size="md"
                isFullWidth
                variant="tertiary"
                data-testid="ChooseAssetAddAssetButton"
              >
                {t("Add an asset")}
              </Button>
            </Link>
          </div>
        </View.Footer>
      )}
    </React.Fragment>
  );
};
