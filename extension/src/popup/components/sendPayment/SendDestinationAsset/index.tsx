import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";

import { AppDispatch } from "popup/App";
import { SubviewHeader } from "popup/components/SubviewHeader";
import {
  saveAmount,
  saveAsset,
  saveIsToken,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import { View } from "popup/basics/layout/View";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { TokenList } from "popup/components/InternalTransaction/TokenList";
import { truncatedPublicKey, truncatedFedAddress } from "helpers/stellar";
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
}

export const SendDestinationAsset = ({
  goBack,
  goToNext,
}: SendDestinationAssetProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { destination, federationAddress } = useSelector(
    transactionDataSelector,
  );
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
        <Notification variant="error" title={"Failed to fetch assets."}>
          An unknown error has occurred.
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

  return (
    <>
      <SubviewHeader
        title={<span>Send</span>}
        hasBackButton
        customBackAction={() => {
          dispatch(saveAsset("native"));
          dispatch(saveAmount("0"));
          goBack();
        }}
      />
      <View.Content hasNoTopPadding>
        <div className="SendDestinationAsset">
          <div
            className="SendDestinationAsset__EditDestination"
            onClick={goBack}
          >
            <div className="SendDestinationAsset__EditDestination__title">
              <div className="SendDestinationAsset__EditDestination__identicon">
                <IdenticonImg publicKey={destination} />
              </div>
              {federationAddress
                ? truncatedFedAddress(federationAddress)
                : truncatedPublicKey(destination)}
            </div>
            <Button isRounded size="sm" variant="tertiary">
              <Icon.ChevronRight />
            </Button>
          </div>
          <TokenList
            tokens={balances.balances}
            hiddenAssets={[]}
            icons={icons}
            tokenPrices={tokenPrices}
            onClickAsset={(canonical, isContract) => {
              dispatch(saveAsset(canonical));
              dispatch(saveIsToken(isContract));
              goToNext();
            }}
          />
        </div>
      </View.Content>
    </>
  );
};
