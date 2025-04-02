import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Loader } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

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
import { SelectAssetRows } from "popup/components/manageAssets/SelectAssetRows";

import "./styles.scss";

export const ChooseAsset = ({ goBack }: { goBack: () => void }) => {
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
      <SubviewHeader title={t("Your assets")} customBackAction={goBack} />
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
              <SelectAssetRows
                assetRows={domainState.data.domains}
                balances={domainState.data.balances}
                onSelect={goBack}
              />
            </div>
          )}
        </div>
      </View.Content>
    </React.Fragment>
  );
};
