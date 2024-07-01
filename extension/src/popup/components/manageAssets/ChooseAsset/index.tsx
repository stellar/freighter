import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Button, Icon, Loader } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { sortBalances } from "popup/helpers/account";
import { useIsSwap } from "popup/helpers/useIsSwap";
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

import { Balances } from "@shared/api/types";

import { ManageAssetCurrency, ManageAssetRows } from "../ManageAssetRows";
import { SelectAssetRows } from "../SelectAssetRows";

import "./styles.scss";

interface ChooseAssetProps {
  balances: Balances;
}

export const ChooseAsset = ({ balances }: ChooseAssetProps) => {
  const { t } = useTranslation();
  const { assetIcons, assetSelect } = useSelector(
    transactionSubmissionSelector,
  );
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);
  const { networkUrl, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );

  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isSwap = useIsSwap();

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

        if (isSwap && "decimals" in sortedBalances[i]) {
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
                networkUrl,
                networkPassphrase,
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

      setAssetRows(collection);
      setIsLoading(false);
    };

    fetchDomains();
  }, [
    assetIcons,
    balances,
    networkUrl,
    managingAssets,
    isSorobanSuported,
    isSwap,
    networkPassphrase,
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
              <ManageAssetRows assetRows={assetRows} chooseAsset />
            ) : (
              <SelectAssetRows assetRows={assetRows} />
            )}
          </div>
        </div>
      </View.Content>
      <View.Footer isInline allowWrap>
        {managingAssets && (
          <>
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
          </>
        )}
      </View.Footer>
    </React.Fragment>
  );
};
