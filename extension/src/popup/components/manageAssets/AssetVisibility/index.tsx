import React, { useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Loader } from "@stellar/design-system";

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
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";

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

  const hasError = domainState.state === RequestState.ERROR;
  if (domainState.data?.type === "re-route") {
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

  if (
    !isLoading &&
    !hasError &&
    domainState.data.type === "resolved" &&
    (domainState.data.applicationState === APPLICATION_STATE.PASSWORD_CREATED ||
      domainState.data.applicationState ===
        APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    window.close();
  }

  const data = domainState.data;

  return (
    <View>
      <SubviewHeader customBackAction={goBack} title={t("Toggle Assets")} />
      <View.Content hasNoTopPadding>
        {isLoading ? (
          <div className="ToggleAsset__loader">
            <Loader size="2rem" />
          </div>
        ) : (
          <div className="ToggleAsset__wrapper">
            <div
              className={`ToggleAsset__assets${
                domainState.data?.isManagingAssets && isSorobanSuported
                  ? "--short"
                  : ""
              }`}
              ref={ManageAssetRowsWrapperRef}
            >
              <ToggleAssetRows
                assetRows={domainState.data!.domains}
                hiddenAssets={domainState.data!.hiddenAssets}
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
                    publicKey: data!.publicKey,
                  });
                }}
              />
            </div>
          </div>
        )}
      </View.Content>
    </View>
  );
};
