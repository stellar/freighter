import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Button, Icon, Loader } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { sortBalances } from "popup/helpers/account";
import { useIsSoroswapEnabled, useIsSwap } from "popup/helpers/useIsSwap";
import {
  transactionSubmissionSelector,
  AssetSelectType,
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

import { Balances } from "@shared/api/types";

import { ManageAssetCurrency, ManageAssetRows } from "../ManageAssetRows";
import { SelectAssetRows } from "../SelectAssetRows";

import "./styles.scss";

interface ChooseAssetProps {
  balances: Balances;
}

export const ChooseAsset = ({ balances }: ChooseAssetProps) => {
  const { t } = useTranslation();
  const { assetIcons, assetSelect, soroswapTokens } = useSelector(
    transactionSubmissionSelector,
  );
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isSwap = useIsSwap();
  const isSoroswapEnabled = useIsSoroswapEnabled();

  const managingAssets = assetSelect.type === AssetSelectType.MANAGE;

  useEffect(() => {
    const fetchDomains = async () => {
      setIsLoading(true);
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

        const {
          token: { code, issuer },
          contractId,
        } = sortedBalances[i];

        // If we are in the swap flow and the asset has decimals (is a token), we skip it if Soroswap is not enabled
        if ("decimals" in sortedBalances[i] && isSwap && !isSoroswapEnabled) {
          // eslint-disable-next-line
          continue;
        }

        if (code !== "XLM") {
          let domain = "";

          if (issuer?.key) {
            try {
              // eslint-disable-next-line no-await-in-loop
              domain = await getAssetDomain(
                issuer.key as string,
                networkDetails.networkUrl,
                networkDetails.networkPassphrase,
              );
            } catch (e) {
              console.error(e);
            }
          }

          collection.push({
            code,
            issuer: issuer?.key || "",
            image:
              assetIcons[
                getCanonicalFromAsset(code as string, issuer?.key as string)
              ],
            domain,
            contract: contractId,
          });
          // include native asset for asset dropdown selection
        } else if (!managingAssets) {
          collection.push({
            code,
            issuer: "",
            image: "",
            domain: "",
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
    balances,
    managingAssets,
    isSorobanSuported,
    isSwap,
    isSoroswapEnabled,
    assetSelect.isSource,
    soroswapTokens,
    networkDetails,
  ]);

  return (
    <React.Fragment>
      <SubviewHeader
        title={t("Your assets")}
        customBackIcon={!managingAssets ? <Icon.Close /> : undefined}
      />
      <View.Content>
        {isLoading && (
          <div className="ChooseAsset__loader">
            <Loader size="2rem" />
          </div>
        )}
        <div className="ChooseAsset__wrapper">
          <div
            className={`ChooseAsset__assets${
              managingAssets && isSorobanSuported ? "--short" : ""
            }`}
            ref={ManageAssetRowsWrapperRef}
          >
            {managingAssets ? (
              <ManageAssetRows assetRows={assetRows} />
            ) : (
              <SelectAssetRows assetRows={assetRows} />
            )}
          </div>
        </div>
      </View.Content>
      {managingAssets && (
        <View.Footer isInline allowWrap>
          <div className="ChooseAsset__button">
            <Link to={ROUTES.searchAsset}>
              <Button
                size="md"
                isFullWidth
                variant="secondary"
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
