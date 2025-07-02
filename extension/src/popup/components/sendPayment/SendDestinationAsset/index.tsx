import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Icon, Loader } from "@stellar/design-system";
import BigNumber from "bignumber.js";

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
import { getCanonicalFromAsset, truncatedPublicKey } from "helpers/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { Navigate } from "react-router-dom";
import { reRouteOnboarding } from "popup/helpers/route";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { useGetDestAssetData } from "./hooks/useGetDestAssetData";
import {
  AssetType,
  LiquidityPoolShareAsset,
} from "@shared/api/types/account-balance";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";

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
  const { destination } = useSelector(transactionDataSelector);
  const { state: destAssetDataState, fetchData } = useGetDestAssetData({
    showHidden: false,
    includeIcons: true,
  });

  const isLoading =
    destAssetDataState.state === RequestState.IDLE ||
    destAssetDataState.state === RequestState.LOADING;

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

  const hasError = destAssetDataState.state === RequestState.ERROR;
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

  const icons = destAssetDataState.data?.balances.icons || {};
  const tokenPrices = destAssetDataState.data?.tokenPrices || {};

  const title = (balance: Exclude<AssetType, LiquidityPoolShareAsset>) => {
    if ("type" in balance.token && balance.token.type === "native") {
      return "Stellar Lumens";
    }
    if ("symbol" in balance) {
      return balance.symbol;
    }

    return balance.token.code;
  };

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
      <View.Content>
        <div className="SendDestinationAsset">
          <div className="SendDestinationAsset__EditDestination">
            <div className="SendDestinationAsset__EditDestination__title">
              <div className="SendDestinationAsset__EditDestination__identicon">
                <IdenticonImg publicKey={destination} />
              </div>
              {truncatedPublicKey(destination)}
            </div>
            <Button isRounded size="sm" variant="tertiary">
              Edit
            </Button>
          </div>
          <div className="SendDestinationAsset__Assets">
            {!destAssetDataState.data?.balances.balances.length ? (
              <div className="SendDestinationAsset__Assets__empty">
                You have no assets added. Get started by adding an asset below.
              </div>
            ) : (
              <>
                <div className="SendDestinationAsset__Assets__Header">
                  <Icon.Coins03 />
                  Tokens
                </div>
                {destAssetDataState.data.balances.balances
                  .filter(
                    (
                      balance,
                    ): balance is Exclude<AssetType, LiquidityPoolShareAsset> =>
                      !("liquidityPoolId" in balance),
                  )
                  .map((balance) => {
                    const { code } = balance.token;
                    const issuerKey =
                      "issuer" in balance.token
                        ? balance.token.issuer.key
                        : undefined;
                    const isContract = "contractId" in balance;
                    const canonical = getCanonicalFromAsset(code, issuerKey);
                    const icon = icons[canonical];
                    // TODO: should this be available balance for XLM
                    const displayTotal = `${formatAmount(balance.total.toString())} ${code}`;
                    const usdValue = tokenPrices[canonical];
                    return (
                      <div
                        className="SendDestinationAsset__AssetRow"
                        onClick={() => {
                          dispatch(saveAsset(canonical));
                          dispatch(saveIsToken(isContract));
                          goToNext();
                        }}
                      >
                        <div className="SendDestinationAsset__AssetRow__Body">
                          <AssetIcon
                            assetIcons={
                              code !== "XLM" ? { [canonical]: icon } : {}
                            }
                            code={code}
                            issuerKey={issuerKey!}
                            icon={icon}
                            isSuspicious={false}
                          />
                          <div className="SendDestinationAsset__AssetRow__Title">
                            <div className="SendDestinationAsset__AssetRow__Title__Heading">
                              {title(balance)}
                            </div>
                            <div className="SendDestinationAsset__AssetRow__Title__Total">
                              {displayTotal}
                            </div>
                          </div>
                        </div>
                        <div className="SendDestinationAsset__AssetRow__UsdValue">
                          {usdValue && usdValue.currentPrice
                            ? `$${formatAmount(
                                roundUsdValue(
                                  new BigNumber(usdValue.currentPrice)
                                    .multipliedBy(balance.total)
                                    .toString(),
                                ),
                              )}`
                            : null}
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        </div>
      </View.Content>
    </>
  );
};
