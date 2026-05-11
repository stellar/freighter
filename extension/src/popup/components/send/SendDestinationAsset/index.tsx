import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { Icon, Loader, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { AppDispatch } from "popup/App";
import { SubviewHeader } from "popup/components/SubviewHeader";
import {
  saveAmount,
  saveAmountUsd,
  saveAsset,
  saveIsToken,
  saveIsCollectible,
  saveCollectibleData,
} from "popup/ducks/transactionSubmission";
import { View } from "popup/basics/layout/View";
import { TokenList } from "popup/components/InternalTransaction/TokenList";
import { CollectiblesList } from "popup/components/InternalTransaction/CollectiblesList";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import { useGetDestAssetData } from "./hooks/useGetDestAssetData";

import "./styles.scss";

interface SendDestinationAssetProps {
  goBack: () => void;
  goToNext: () => void;
  returnToAmount?: boolean;
}

export const SendDestinationAsset = ({
  goBack,
  goToNext,
  returnToAmount = false,
}: SendDestinationAssetProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { state: destAssetDataState, fetchData } = useGetDestAssetData({
    showHidden: false,
    includeIcons: true,
  });
  const isLoading =
    destAssetDataState.state === RequestState.IDLE ||
    destAssetDataState.state === RequestState.LOADING;
  const hasError = destAssetDataState.state === RequestState.ERROR;

  useEffect(() => {
    const getData = async () => {
      await fetchData(true);
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

  if (destAssetDataState.state === RequestState.ERROR) {
    return (
      <div className="ChooseAsset___fail">
        <Notification variant="error" title={t("Failed to fetch assets.")}>
          {t("An unknown error has occurred.")}
        </Notification>
      </div>
    );
  }

  if (destAssetDataState.data?.type === AppDataType.REROUTE) {
    if (destAssetDataState.data.shouldOpenTab) {
      openTab(newTabHref(destAssetDataState.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${destAssetDataState.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError) {
    reRouteOnboarding({
      type: destAssetDataState.data.type,
      applicationState: destAssetDataState.data?.applicationState,
      state: destAssetDataState.state,
    });
  }

  const icons = destAssetDataState.data.balances.icons || {};
  const tokenPrices = destAssetDataState.data.tokenPrices || {};
  const balances = destAssetDataState.data.balances;

  const resetAmountForm = () => {
    dispatch(saveAmount("0"));
    dispatch(saveAmountUsd("0.00"));
  };

  return (
    <>
      <SubviewHeader
        title={<span>{t("Send")}</span>}
        hasBackButton
        customBackAction={goBack}
        {...(!returnToAmount && { customBackIcon: <Icon.X /> })}
      />
      <View.Content hasNoTopPadding>
        <div className="SendDestinationAsset">
          <TokenList
            tokens={balances.balances}
            hiddenAssets={[]}
            icons={icons}
            tokenPrices={tokenPrices}
            onClickAsset={(canonical, isContract) => {
              dispatch(saveIsCollectible(false));
              dispatch(saveAsset(canonical));
              dispatch(saveIsToken(isContract));
              resetAmountForm();
              goToNext();
            }}
            isShowingHeader={false}
          />
          {destAssetDataState.data.collectibles.collections.length > 0 && (
            <div className="SendDestinationAsset__collectibles-section">
              <div className="SendDestinationAsset__collectibles-heading">
                {t("Collectibles")}
              </div>
              <CollectiblesList
                collectibles={destAssetDataState.data.collectibles}
                onClickCollectible={({
                  collectionAddress,
                  tokenId,
                  name,
                  collectionName,
                  image,
                }) => {
                  dispatch(saveIsCollectible(true));
                  dispatch(
                    saveCollectibleData({
                      collectionAddress,
                      tokenId: Number(tokenId),
                      name,
                      collectionName,
                      image,
                    }),
                  );
                  resetAmountForm();
                  goToNext();
                }}
              />
            </div>
          )}
        </div>
      </View.Content>
    </>
  );
};
