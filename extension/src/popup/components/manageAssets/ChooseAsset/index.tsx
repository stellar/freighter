import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Icon, Loader } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { Button } from "popup/basics/buttons/Button";
import { ROUTES } from "popup/constants/routes";
import { sortBalances } from "popup/helpers/account";
import {
  transactionSubmissionSelector,
  AssetSelectType,
} from "popup/ducks/transactionSubmission";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import { sorobanSelector } from "popup/ducks/soroban";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { getCanonicalFromAsset } from "helpers/stellar";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

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
  const { isExperimentalModeEnabled } = useSelector(settingsSelector);
  const { networkUrl } = useSelector(settingsNetworkDetailsSelector);
  const { tokenBalances: sorobanBalances } = useSelector(sorobanSelector);

  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const managingAssets = assetSelect.type === AssetSelectType.MANAGE;

  useEffect(() => {
    const fetchDomains = async () => {
      setIsLoading(true);
      const collection = [] as ManageAssetCurrency[];
      const sortedBalances = sortBalances(balances);

      // TODO: cache home domain when getting asset icon
      // https://github.com/stellar/freighter/issues/410
      for (let i = 0; i < sortedBalances.length; i += 1) {
        if (sortedBalances[i].liquidityPoolId) {
          // eslint-disable-next-line
          continue;
        }

        const {
          token: { code, issuer },
        } = sortedBalances[i];

        if (code !== "XLM") {
          const server = stellarSdkServer(networkUrl);

          let domain = "";

          if (issuer?.key) {
            try {
              // eslint-disable-next-line no-await-in-loop
              ({ home_domain: domain } = await server.loadAccount(issuer.key));
            } catch (e) {
              console.error(e);
            }
          }

          collection.push({
            code,
            issuer: issuer?.key || "",
            image: assetIcons[getCanonicalFromAsset(code, issuer?.key)],
            domain,
          });
          // include native asset for asset dropdown selection
        } else if (!managingAssets) {
          collection.push({
            code,
            issuer: "",
            image: "",
            domain: "",
          });

          // disable soroban payment until we can get the new SDK working
          const disableSorobanPayment = true;

          if (
            isExperimentalModeEnabled &&
            sorobanBalances.length &&
            !disableSorobanPayment
          ) {
            sorobanBalances.forEach(({ symbol, contractId, name }) => {
              // TODO:
              // interestingly, if an ascii value is set for symbol
              // it gets parsed and doesn't
              // match the original value after this. How to escape this?
              collection.push({
                code: `${symbol}`,
                issuer: "",
                image: "",
                domain: "",
                contractId,
                name,
              });
            });
          }
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
    isExperimentalModeEnabled,
    sorobanBalances,
  ]);

  return (
    <div className="ChooseAsset" data-testid="choose-asset">
      {isLoading && (
        <div className="ChooseAsset__loader">
          <Loader size="2rem" />
        </div>
      )}
      <SubviewHeader
        title="Choose Asset"
        customBackIcon={!managingAssets ? <Icon.X /> : undefined}
      />
      <div className="ChooseAsset__wrapper">
        <div
          className={`ChooseAsset__assets${
            managingAssets && isExperimentalModeEnabled ? "--short" : ""
          }`}
          ref={ManageAssetRowsWrapperRef}
        >
          {managingAssets ? (
            <ManageAssetRows
              assetRows={assetRows}
              maxHeight={
                ManageAssetRowsWrapperRef?.current?.clientHeight || 600
              }
            />
          ) : (
            <SelectAssetRows
              assetRows={assetRows}
              maxHeight={
                ManageAssetRowsWrapperRef?.current?.clientHeight || 600
              }
            />
          )}
        </div>
        {managingAssets && (
          <div className="ChooseAsset__button-container">
            {isExperimentalModeEnabled ? (
              <div className="ChooseAsset__button">
                <Link to={ROUTES.addToken}>
                  <Button fullWidth variant={Button.variant.tertiary}>
                    {t("Add Soroban token")}
                  </Button>
                </Link>
              </div>
            ) : null}
            <div className="ChooseAsset__button">
              <Link to={ROUTES.searchAsset}>
                <Button fullWidth variant={Button.variant.tertiary}>
                  {t("Add another asset")}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
