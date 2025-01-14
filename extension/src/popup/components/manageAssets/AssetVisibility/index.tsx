import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Loader } from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import {
  settingsNetworkDetailsSelector,
  settingsSorobanSupportedSelector,
} from "popup/ducks/settings";
import { isMainnet } from "helpers/stellar";
import { publicKeySelector } from "popup/ducks/accountServices";

import { RequestState } from "constants/request";
import { useGetAssetDomainsWithBalances } from "helpers/hooks/useGetAssetDomainsWithBalances";
import { resetSubmission } from "popup/ducks/transactionSubmission";

import { ToggleAssetRows } from "../ToggleAssetRows";

import "./styles.scss";

export const AssetVisibility = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);
  const { state: domainState, fetchData } = useGetAssetDomainsWithBalances(
    publicKey,
    networkDetails,
    {
      isMainnet: isMainnet(networkDetails),
      showHidden: true,
      includeIcons: true,
    },
  );

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
              <ToggleAssetRows assetRows={domainState.data!.domains} />
            </div>
          </div>
        )}
      </View.Content>
    </View>
  );
};
