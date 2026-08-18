import React, { useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Loader, Notification } from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { settingsSorobanSupportedSelector } from "popup/ducks/settings";

import {
  AssetVisibility as AssetVisibilityType,
  IssuerKey,
} from "@shared/api/types";
import { RequestState } from "constants/request";
import { resetSubmission } from "popup/ducks/transactionSubmission";
import { useGetAssetData } from "./hooks/useGetAssetData";

import { ToggleAssetRows } from "../ToggleAssetRows";
import { AppDispatch } from "popup/App";

import "./styles.scss";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { reRouteOnboarding } from "popup/helpers/route";

export const AssetVisibility = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);

  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);
  const {
    state: domainState,
    fetchData,
    changeAssetVisibility,
  } = useGetAssetData({
    showHidden: true,
    includeIcons: true,
  });

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goBack = () => {
    dispatch(resetSubmission());
    navigate(-1);
  };

  const isLoading =
    domainState.state === RequestState.IDLE ||
    domainState.state === RequestState.LOADING;

  if (domainState.state === RequestState.ERROR) {
    return (
      <div
        className="ToggleAsset__fetch-fail"
        data-testid="asset-visibility-fetch-fail"
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

  const data = domainState.data;

  if (!isLoading && data) {
    reRouteOnboarding({
      type: data.type,
      applicationState: data.applicationState,
      state: domainState.state,
    });
  }

  return (
    <>
      <SubviewHeader customBackAction={goBack} title={t("Toggle Assets")} />
      <View.Content hasNoTopPadding>
        {isLoading || !data ? (
          <div className="ToggleAsset__loader">
            <Loader size="2rem" />
          </div>
        ) : (
          <div className="ToggleAsset__wrapper">
            <div
              className={`ToggleAsset__assets${
                data.isManagingAssets && isSorobanSuported ? "--short" : ""
              }`}
              ref={ManageAssetRowsWrapperRef}
            >
              <ToggleAssetRows
                assetRows={data.domains}
                hiddenAssets={data.hiddenAssets}
                changeAssetVisibility={async ({
                  issuer,
                  visibility,
                }: {
                  issuer: IssuerKey;
                  visibility: AssetVisibilityType;
                }) => {
                  return await changeAssetVisibility({
                    issuer,
                    visibility,
                    publicKey: data.publicKey,
                  });
                }}
              />
            </div>
          </div>
        )}
      </View.Content>
    </>
  );
};
