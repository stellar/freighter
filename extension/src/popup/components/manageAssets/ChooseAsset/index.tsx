import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useHistory } from "react-router-dom";
import { Button, Icon, Loader } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import {
  getAccountBalances,
  resetSubmission,
} from "popup/ducks/transactionSubmission";
import {
  settingsNetworkDetailsSelector,
  settingsSorobanSupportedSelector,
} from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { publicKeySelector } from "popup/ducks/accountServices";
import { useFetchDomains } from "popup/helpers/useFetchDomains";

import { ManageAssetRows } from "../ManageAssetRows";
import { SelectAssetRows } from "../SelectAssetRows";

import "./styles.scss";

export const ChooseAsset = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const dispatch = useDispatch();
  const publicKey = useSelector(publicKeySelector);

  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(
      getAccountBalances({
        publicKey,
        networkDetails,
      }),
    );
  }, [publicKey, dispatch, networkDetails]);

  const { assets, isManagingAssets } = useFetchDomains();

  const goBack = () => {
    dispatch(resetSubmission());
    history.goBack();
  };

  return (
    <React.Fragment>
      <SubviewHeader
        title={t("Manage assets")}
        customBackIcon={<Icon.XClose className="close-btn" />}
        customBackAction={goBack}
        rightButton={
          <Link
            to={ROUTES.assetVisibility}
            data-testid="ChooseAssetHideAssetBtn"
          >
            <Button
              size="sm"
              className="ChooseAsset__hide-btn"
              variant="tertiary"
            >
              <Icon.Settings03 />
            </Button>
          </Link>
        }
      />
      <View.Content hasNoTopPadding>
        {assets.isLoading ? (
          <div className="ChooseAsset__loader">
            <Loader size="2rem" />
          </div>
        ) : (
          <div
            className="ChooseAsset__wrapper"
            data-testid="ChooseAssetWrapper"
          >
            {!assets.assetRows.length ? (
              <div className="ChooseAsset__empty">
                <p>
                  You have no assets added. Get started by adding an asset
                  below.
                </p>
              </div>
            ) : (
              <div
                className={`ChooseAsset__assets${
                  isManagingAssets && isSorobanSuported ? "--short" : ""
                }`}
                ref={ManageAssetRowsWrapperRef}
              >
                {isManagingAssets ? (
                  <ManageAssetRows assetRows={assets.assetRows} />
                ) : (
                  <SelectAssetRows assetRows={assets.assetRows} />
                )}
              </div>
            )}
          </div>
        )}
      </View.Content>
      {isManagingAssets && (
        <View.Footer isInline allowWrap>
          <div className="ChooseAsset__button">
            <Link to={ROUTES.searchAsset}>
              <Button
                size="md"
                isFullWidth
                variant="tertiary"
                data-testid="ChooseAssetAddAssetButton"
              >
                {t("Add an asset")}
              </Button>
            </Link>
          </div>
        </View.Footer>
      )}
    </React.Fragment>
  );
};
