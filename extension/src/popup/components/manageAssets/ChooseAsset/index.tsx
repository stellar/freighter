import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import StellarSdk from "stellar-sdk";
import { Link } from "react-router-dom";
import { Icon, Loader } from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";
import { ROUTES } from "popup/constants/routes";
import { sortBalances } from "popup/helpers/account";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { getCanonicalFromAsset } from "helpers/stellar";

import { Balances } from "@shared/api/types";

import { ManageAssetCurrency, ManageAssetRows } from "../ManageAssetRows";
import { SelectAssetRows } from "../SelectAssetRows";

import "./styles.scss";

interface ChooseAssetProps {
  balances: Balances;
  setErrorAsset: (errorAsset: string) => void;
  selectingAssetType: string;
}

export const ChooseAsset = ({
  balances,
  setErrorAsset,
  selectingAssetType,
}: ChooseAssetProps) => {
  const { assetIcons } = useSelector(transactionSubmissionSelector);
  const { networkUrl } = useSelector(settingsNetworkDetailsSelector);
  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDomains = async () => {
      setIsLoading(true);
      const collection = [] as ManageAssetCurrency[];
      const sortedBalances = sortBalances(balances);

      // TODO: cache home domain when getting asset icon
      // https://github.com/stellar/freighter/issues/410
      for (let i = 0; i < sortedBalances.length; i += 1) {
        const {
          token: { code, issuer },
        } = sortedBalances[i];

        if (code !== "XLM") {
          const server = new StellarSdk.Server(networkUrl);

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
        } else if (selectingAssetType) {
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
  }, [assetIcons, balances, networkUrl, selectingAssetType]);

  return (
    <div className="ChooseAsset">
      {isLoading && (
        <div className="ChooseAsset__loader">
          <Loader size="2rem" />
        </div>
      )}
      <SubviewHeader
        title="Choose Asset"
        customBackIcon={selectingAssetType ? <Icon.X /> : undefined}
      />
      <div className="ChooseAsset__wrapper">
        <div className="ChooseAsset__assets" ref={ManageAssetRowsWrapperRef}>
          {selectingAssetType ? (
            <SelectAssetRows
              assetRows={assetRows}
              maxHeight={
                ManageAssetRowsWrapperRef?.current?.clientHeight || 600
              }
              selectingAssetType={selectingAssetType}
            />
          ) : (
            <ManageAssetRows
              assetRows={assetRows}
              setErrorAsset={setErrorAsset}
              maxHeight={
                ManageAssetRowsWrapperRef?.current?.clientHeight || 600
              }
            />
          )}
        </div>
        <div className="ChooseAsset__button">
          <Link to={ROUTES.addAsset}>
            <Button fullWidth variant={Button.variant.tertiary}>
              Add another asset
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
