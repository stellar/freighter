import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Icon, Input, Loader } from "@stellar/design-system";
import { useFormik } from "formik";
import BigNumber from "bignumber.js";
import { debounce } from "lodash";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { openTab } from "popup/helpers/navigate";
import { View } from "popup/basics/layout/View";
import { FormRows } from "popup/basics/Forms";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import {
  AssetType,
  LiquidityPoolShareAsset,
} from "@shared/api/types/account-balance";
import { getCanonicalFromAsset } from "helpers/stellar";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { useGetSwapFromData } from "./hooks/useSwapFromData";
import { getAvailableBalance } from "popup/helpers/soroban";

import "./styles.scss";

interface SwapAssetProps {
  title: string;
  hiddenAssets: string[];
  onClickAsset: (canonical: string, isContract: boolean) => void;
  goBack: () => void;
}

export const SwapAsset = ({
  title,
  hiddenAssets,
  onClickAsset,
  goBack,
}: SwapAssetProps) => {
  const { state, fetchData, filterBalances } = useGetSwapFromData({
    showHidden: false,
    includeIcons: true,
  });

  const isLoading =
    state.state === RequestState.IDLE || state.state === RequestState.LOADING;

  const formik = useFormik({
    initialValues: { searchTerm: "" },
    onSubmit: (values) => filterBalances(values.searchTerm),
    validateOnChange: false,
  });

  const debouncedSubmit = React.useMemo(
    () =>
      debounce(() => {
        formik.submitForm();
      }, 300),
    [formik],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    formik.setFieldValue("searchTerm", val);
    debouncedSubmit();
  };

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasError = state.state === RequestState.ERROR;
  if (state.data?.type === AppDataType.REROUTE) {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${state.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError && !isLoading) {
    reRouteOnboarding({
      type: state.data.type,
      applicationState: state.data?.applicationState,
      state: state.state,
    });
  }

  const assetTitle = (balance: Exclude<AssetType, LiquidityPoolShareAsset>) => {
    if ("type" in balance.token && balance.token.type === "native") {
      return "Stellar Lumens";
    }
    if ("symbol" in balance) {
      return balance.symbol;
    }

    return balance.token.code;
  };

  const icons = state.data?.balances.icons || {};
  const tokenPrices = state.data?.tokenPrices || {};
  const balances = state.data?.filteredBalances || [];
  const subentryCount = state.data?.balances.subentryCount!;

  return (
    <>
      <SubviewHeader
        title={<span>{title}</span>}
        hasBackButton
        customBackAction={goBack}
      />
      <View.Content hasTopInput>
        <FormRows>
          <Input
            fieldSize="md"
            autoComplete="off"
            id="destination-input"
            name="searchTerm"
            placeholder={"Search token name or address"}
            value={formik.values.searchTerm}
            onChange={handleChange}
            leftElement={<Icon.SearchMd />}
            data-testid="swap-from-search"
          />
        </FormRows>
        <div className="SwapFrom">
          {isLoading ? (
            <div className="SwapFrom__loader">
              <Loader size="2rem" />
            </div>
          ) : (
            <div className="SwapFrom__Assets">
              {!balances.length ? (
                <div className="SwapFrom__Assets__empty">
                  You have no assets added. Get started by adding an asset.
                </div>
              ) : (
                <>
                  <div className="SwapFrom__Assets__Header">
                    <Icon.Coins03 />
                    Your Tokens
                  </div>
                  {balances
                    .filter(
                      (
                        balance,
                      ): balance is Exclude<
                        AssetType,
                        LiquidityPoolShareAsset
                      > => !("liquidityPoolId" in balance),
                    )
                    .filter((balance) => {
                      const { code } = balance.token;
                      const issuerKey =
                        "issuer" in balance.token
                          ? balance.token.issuer.key
                          : undefined;
                      const canonical = getCanonicalFromAsset(code, issuerKey);
                      return !hiddenAssets.includes(canonical);
                    })
                    .map((balance) => {
                      const { code } = balance.token;
                      const issuerKey =
                        "issuer" in balance.token
                          ? balance.token.issuer.key
                          : undefined;
                      const isContract = "contractId" in balance;
                      const canonical = getCanonicalFromAsset(code, issuerKey);
                      const icon = icons[canonical];
                      const availableBalance = getAvailableBalance({
                        assetCanonical: canonical,
                        balances: [balance],
                        subentryCount,
                        recommendedFee: "0",
                      });
                      const displayTotal =
                        "decimals" in balance
                          ? `${availableBalance} ${code}`
                          : `${formatAmount(availableBalance)} ${code}`;
                      const usdValue = tokenPrices[canonical];
                      return (
                        <div
                          className="SwapFrom__AssetRow"
                          onClick={() => onClickAsset(canonical, isContract)}
                        >
                          <div className="SwapFrom__AssetRow__Body">
                            <AssetIcon
                              assetIcons={
                                code !== "XLM" ? { [canonical]: icon } : {}
                              }
                              code={code}
                              issuerKey={issuerKey!}
                              icon={icon}
                              isSuspicious={false}
                            />
                            <div className="SwapFrom__AssetRow__Title">
                              <div className="SwapFrom__AssetRow__Title__Heading">
                                {assetTitle(balance)}
                              </div>
                              <div className="SwapFrom__AssetRow__Title__Total">
                                {displayTotal}
                              </div>
                            </div>
                          </div>
                          <div className="SwapFrom__AssetRow__UsdValue">
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
          )}
        </div>
      </View.Content>
    </>
  );
};
