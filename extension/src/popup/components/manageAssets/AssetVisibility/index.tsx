import React, { useRef } from "react";
import { useHistory } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Loader } from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { settingsSorobanSupportedSelector } from "popup/ducks/settings";
import { useFetchDomains } from "helpers/hooks/useGetAssetDomains";
import { ToggleAssetRows } from "../ToggleAssetRows";

import "./styles.scss";

export const AssetVisibility = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);

  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);
  const { assets, isManagingAssets } = useFetchDomains();

  const goBack = () => {
    history.goBack();
  };

  return (
    <View>
      <SubviewHeader customBackAction={goBack} title={t("Toggle Assets")} />
      <View.Content hasNoTopPadding>
        {assets.isLoading ? (
          <div className="ToggleAsset__loader">
            <Loader size="2rem" />
          </div>
        ) : (
          <div className="ToggleAsset__wrapper">
            <div
              className={`ToggleAsset__assets${
                isManagingAssets && isSorobanSuported ? "--short" : ""
              }`}
              ref={ManageAssetRowsWrapperRef}
            >
              <ToggleAssetRows assetRows={assets.assetRows} />
            </div>
          </div>
        )}
      </View.Content>
    </View>
  );
};
