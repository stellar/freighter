import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { settingsSorobanSupportedSelector } from "popup/ducks/settings";
import { balancesSelector } from "popup/ducks/cache";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import { RequestState } from "constants/request";
import { useGetAssetDomainsWithBalances } from "helpers/hooks/useGetAssetDomainsWithBalances";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { reRouteOnboarding } from "popup/helpers/route";

import { ManageAssetRows } from "../ManageAssetRows";
import { SelectAssetRows } from "../SelectAssetRows";

import "./styles.scss";

export const ChooseAsset = ({
  goBack,
  showHideAssets = false,
}: {
  goBack: () => void;
  showHideAssets?: boolean;
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);
  const cachedBalances = useSelector(balancesSelector);

  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);

  const { state: domainState, fetchData } = useGetAssetDomainsWithBalances({
    showHidden: false,
    includeIcons: true,
  });

  const isLoading =
    domainState.state === RequestState.IDLE ||
    domainState.state === RequestState.LOADING;

  useEffect(() => {
    /* This effect is keyed off of changes to cachedBalances as this let's us update the UI when an asset is removed */
    const getData = async () => {
      await fetchData(true);
    };

    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedBalances]);

  if (isLoading) {
    return (
      <View.Content hasNoTopPadding>
        <div className="ChooseAsset__loader">
          <Loader size="2rem" />
        </div>
      </View.Content>
    );
  }

  const hasError = domainState.state === RequestState.ERROR;
  if (hasError) {
    return (
      <div
        className="ChooseAsset__fetch-fail"
        data-testid="choose-asset-fetch-fail"
      >
        <Notification variant="error" title={t("Failed to load assets.")}>
          {t("Your assets could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (domainState.data?.type === AppDataType.REROUTE) {
    if (domainState.data.shouldOpenTab) {
      openTab(newTabHref(domainState.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${domainState.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  // Past the ERROR and REROUTE guards, domainState holds resolved data.
  const data = domainState.data;

  reRouteOnboarding({
    type: data.type,
    applicationState: data.applicationState,
    state: domainState.state,
  });

  return (
    <React.Fragment>
      <SubviewHeader
        title={t("Your assets")}
        customBackIcon={!data.isManagingAssets ? <Icon.X /> : undefined}
        customBackAction={goBack}
        rightButton={
          showHideAssets ? (
            <Link
              to={ROUTES.assetVisibility}
              data-testid="ChooseAssetHideAssetBtn"
            >
              <Button
                size="sm"
                className="ChooseAsset__hide-btn"
                variant="tertiary"
              >
                <Icon.Settings03 />
              </Button>
            </Link>
          ) : undefined
        }
      />
      <View.Content hasNoTopPadding>
        <div className="ChooseAsset__wrapper" data-testid="ChooseAssetWrapper">
          {!data.domains.length ? (
            <div className="ChooseAsset__empty">
              <p>
                {`${t("You have no assets added.")} ${t("Get started by adding an asset.")}`}
              </p>
            </div>
          ) : (
            <div
              className={`ChooseAsset__assets${
                data.isManagingAssets && isSorobanSuported ? "--short" : ""
              }`}
              ref={ManageAssetRowsWrapperRef}
            >
              {data.isManagingAssets ? (
                <ManageAssetRows
                  shouldSplitAssetsByVerificationStatus={false}
                  verifiedAssetRows={data.domains}
                  unverifiedAssetRows={[]}
                  balances={data.balances}
                />
              ) : (
                <SelectAssetRows
                  assetRows={data.domains}
                  balances={data.balances}
                  onSelect={goBack}
                />
              )}
            </div>
          )}
        </div>
      </View.Content>
      {data.isManagingAssets && (
        <View.Footer isInline allowWrap>
          <div className="ChooseAsset__button">
            <Link to={ROUTES.searchAsset}>
              <Button
                size="lg"
                isFullWidth
                isRounded
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
