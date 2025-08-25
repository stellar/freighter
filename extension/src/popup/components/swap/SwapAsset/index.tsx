import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Icon, Input, Loader } from "@stellar/design-system";
import { useFormik } from "formik";
import { debounce } from "lodash";

import { TokenList } from "popup/components/InternalTransaction/TokenList";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { openTab } from "popup/helpers/navigate";
import { View } from "popup/basics/layout/View";
import { FormRows } from "popup/basics/Forms";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import { useGetSwapFromData } from "./hooks/useSwapFromData";

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
      await fetchData(true);
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
            <TokenList
              tokens={balances}
              hiddenAssets={hiddenAssets}
              icons={icons}
              subentryCount={subentryCount}
              tokenPrices={tokenPrices}
              onClickAsset={onClickAsset}
            />
          )}
        </div>
      </View.Content>
    </>
  );
};
