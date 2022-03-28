import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import StellarSdk from "stellar-sdk";
import { Button } from "@stellar/design-system";
import { Link } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { sortBalances } from "popup/helpers/account";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { SubviewHeader } from "popup/components/SubviewHeader";

import { Balances } from "@shared/api/types";

import { ManageAssetCurrency, ManageAssetRows } from "../ManageAssetRows";

import "./styles.scss";

interface ChooseAssetProps {
  balances: Balances;
}

export const ChooseAsset = ({ balances }: ChooseAssetProps) => {
  const { assetIcons } = useSelector(transactionSubmissionSelector);
  const { networkUrl } = useSelector(settingsNetworkDetailsSelector);
  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);

  useEffect(() => {
    const fetchDomains = async () => {
      const collection = [] as ManageAssetCurrency[];
      const sortedBalances = sortBalances(balances);

      for (let i = 0; i < sortedBalances.length; i += 1) {
        const {
          token: { code, issuer },
        } = sortedBalances[i];
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
          image: assetIcons[code],
          domain,
        });
      }

      setAssetRows(collection);
    };

    fetchDomains();
  }, [assetIcons, balances, networkUrl]);

  return (
    <div className="ChooseAsset">
      <SubviewHeader title="Choose Asset" />
      <div className="ChooseAsset__wrapper">
        <div className="ChooseAsset__assets">
          <ManageAssetRows assetRows={assetRows} />
        </div>
        <div className="ChooseAsset__button">
          <Link to={ROUTES.addAsset}>
            <Button fullWidth variant={Button.variant.tertiary}>
              Add another asst
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
