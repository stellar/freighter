import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useHistory } from "react-router-dom";
import { Button, Icon, Loader } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { sortBalances } from "popup/helpers/account";
import { useIsSoroswapEnabled, useIsSwap } from "popup/helpers/useIsSwap";
import {
  transactionSubmissionSelector,
  AssetSelectType,
  getAccountBalances,
  resetSubmission,
} from "popup/ducks/transactionSubmission";
import {
  settingsNetworkDetailsSelector,
  settingsSorobanSupportedSelector,
} from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { getCanonicalFromAsset } from "helpers/stellar";
import { getAssetDomain } from "popup/helpers/getAssetDomain";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { isAssetSuspicious } from "popup/helpers/blockaid";
import { publicKeySelector } from "popup/ducks/accountServices";
import { ActionStatus } from "@shared/api/types";

import { ManageAssetCurrency, ManageAssetRows } from "../ManageAssetRows";
import { SelectAssetRows } from "../SelectAssetRows";

import "./styles.scss";

export const ChooseAsset = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const {
    assetIcons,
    assetSelect,
    soroswapTokens,
    accountBalances,
    accountBalanceStatus,
    destinationBalances,
  } = useSelector(transactionSubmissionSelector);
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const dispatch = useDispatch();
  const publicKey = useSelector(publicKeySelector);

  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(
    accountBalanceStatus === ActionStatus.PENDING ||
      accountBalanceStatus === ActionStatus.IDLE,
  );
  const isSwap = useIsSwap();
  const isSoroswapEnabled = useIsSoroswapEnabled();
  const isManagingAssets = assetSelect.type === AssetSelectType.MANAGE;

  useEffect(() => {
    dispatch(
      getAccountBalances({
        publicKey,
        networkDetails,
      }),
    );
  }, [publicKey, dispatch, networkDetails]);

  useEffect(() => {
    const fetchDomains = async () => {
      setIsLoading(true);
      let balances;
      // path payment destAsset is the only time we use recipient trustlines
      if (
        assetSelect.type === AssetSelectType.PATH_PAY &&
        assetSelect.isSource === false
      ) {
        balances = destinationBalances.balances;
      } else {
        balances = accountBalances.balances;
      }

      const collection = [] as ManageAssetCurrency[];
      const sortedBalances = sortBalances(balances);

      // TODO: cache home domain when getting asset icon
      // https://github.com/stellar/freighter/issues/410
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < sortedBalances.length; i += 1) {
        if (sortedBalances[i].liquidityPoolId) {
          // eslint-disable-next-line
          continue;
        }

        const { token, contractId, blockaidData } = sortedBalances[i];

        const code = token.code || "";
        let issuer = {
          key: "",
        };

        if ("issuer" in token) {
          issuer = token.issuer;
        }

        // If we are in the swap flow and the asset has decimals (is a token), we skip it if Soroswap is not enabled
        if ("decimals" in sortedBalances[i] && isSwap && !isSoroswapEnabled) {
          // eslint-disable-next-line
          continue;
        }

        if (code !== "XLM") {
          let domain = "";

          if (issuer.key) {
            try {
              // eslint-disable-next-line no-await-in-loop
              domain = await getAssetDomain(
                issuer.key,
                networkDetails.networkUrl,
                networkDetails.networkPassphrase,
              );
            } catch (e) {
              console.error(e);
            }
          }

          collection.push({
            code,
            issuer: issuer.key,
            image: assetIcons[getCanonicalFromAsset(code, issuer.key)],
            domain,
            contract: contractId,
            isSuspicious: isAssetSuspicious(blockaidData),
          });
          // include native asset for asset dropdown selection
        } else if (!isManagingAssets) {
          collection.push({
            code,
            issuer: "",
            image: "",
            domain: "",
            isSuspicious: false,
          });
        }
      }

      if (isSoroswapEnabled && isSwap && !assetSelect.isSource) {
        soroswapTokens.forEach((token) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const canonical = getCanonicalFromAsset(token.code, token.contract);
          const nativeContractDetails =
            getNativeContractDetails(networkDetails);

          // if we have a balance for a token, it will have been handled above.
          // This is designed to populate tokens available from Soroswap that the user does not already have
          if (
            balances &&
            !balances[canonical] &&
            token.contract !== nativeContractDetails.contract
          ) {
            collection.push({
              code: token.code,
              issuer: token.contract,
              image: token.icon,
              domain: "",
              icon: token.icon,
            });
          }
        });
      }

      setAssetRows(collection);
      setIsLoading(false);
    };

    fetchDomains();
  }, [
    assetIcons,
    accountBalances.balances,
    isManagingAssets,
    isSorobanSuported,
    isSwap,
    isSoroswapEnabled,
    assetSelect.isSource,
    soroswapTokens,
    networkDetails,
    assetSelect.type,
    destinationBalances.balances,
  ]);

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
        {isLoading ? (
          <div className="ChooseAsset__loader">
            <Loader size="2rem" />
          </div>
        ) : (
          <div
            className="ChooseAsset__wrapper"
            data-testid="ChooseAssetWrapper"
          >
            <div
              className={`ChooseAsset__assets${
                isManagingAssets && isSorobanSuported ? "--short" : ""
              }`}
              ref={ManageAssetRowsWrapperRef}
            >
              {isManagingAssets ? (
                <ManageAssetRows assetRows={assetRows} />
              ) : (
                <SelectAssetRows assetRows={assetRows} />
              )}
            </div>
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
