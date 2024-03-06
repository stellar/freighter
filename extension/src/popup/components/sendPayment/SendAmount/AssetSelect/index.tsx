import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Icon, Link, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { isMainnet, isTestnet } from "helpers/stellar";
import { AssetIcon } from "popup/components/account/AccountAssets";
import {
  transactionSubmissionSelector,
  saveAssetSelectSource,
  saveAssetSelectType,
  AssetSelectType,
} from "popup/ducks/transactionSubmission";
import { isContractId } from "popup/helpers/soroban";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { useIsOwnedScamAsset } from "popup/helpers/useIsOwnedScamAsset";
import { ScamAssetIcon } from "popup/components/account/ScamAssetIcon";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { getVerifiedTokens } from "popup/helpers/searchAsset";

import "./styles.scss";

export function AssetSelect({
  assetCode,
  issuerKey,
}: {
  assetCode: string;
  issuerKey: string;
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { assetIcons } = useSelector(transactionSubmissionSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const isOwnedScamAsset = useIsOwnedScamAsset(assetCode, issuerKey);
  const [isUnverifiedToken, setIsUnverifiedToken] = useState(false);

  useEffect(() => {
    if (!isContractId(issuerKey)) {
      return;
    }

    if (!isMainnet(networkDetails) && !isTestnet(networkDetails)) {
      return;
    }

    const fetchVerifiedTokens = async () => {
      const verifiedTokens = await getVerifiedTokens({
        networkDetails,
        contractId: issuerKey,
      });

      if (!verifiedTokens.length) {
        setIsUnverifiedToken(true);
      }
    };

    fetchVerifiedTokens();
  }, [issuerKey, networkDetails]);

  const handleSelectAsset = () => {
    dispatch(saveAssetSelectType(AssetSelectType.REGULAR));
    dispatch(saveAssetSelectSource(true));
    navigateTo(ROUTES.manageAssets);
  };

  return (
    <>
      {isUnverifiedToken ? (
        <div className="AssetSelect__unverified">
          <Notification
            title="The asset is not part of Stellar Expert's top 50 assets list"
            variant="primary"
          >
            {t("This asset is not part of")}{" "}
            <Link
              variant="secondary"
              href="https://api.stellar.expert/explorer/testnet/asset-list/top50"
              target="_blank"
              rel="noreferrer"
            >
              Stellar Expert's top 50 assets list
            </Link>
            .{" "}
            <Link variant="secondary" href="https://www.freighter.app/faq">
              {t("Learn more")}
            </Link>
          </Notification>
        </div>
      ) : null}
      <div
        className="AssetSelect__wrapper"
        onClick={handleSelectAsset}
        data-testid="send-amount-asset-select"
      >
        <div className="AssetSelect__content">
          <div className="AssetSelect__content__left">
            <AssetIcon
              assetIcons={assetIcons}
              code={assetCode}
              issuerKey={issuerKey}
            />
            <span className="AssetSelect__medium-copy">{assetCode}</span>
            <ScamAssetIcon isScamAsset={isOwnedScamAsset} />
          </div>
          <div className="AssetSelect__content__right">
            <Icon.ChevronDown />
          </div>
        </div>
      </div>
    </>
  );
}

export function PathPayAssetSelect({
  source,
  assetCode,
  issuerKey,
  balance,
}: {
  source: boolean;
  assetCode: string;
  issuerKey: string;
  balance: string;
}) {
  const dispatch = useDispatch();
  const { assetIcons } = useSelector(transactionSubmissionSelector);
  const isSwap = useIsSwap();
  const isOwnedScamAsset = useIsOwnedScamAsset(assetCode, issuerKey);

  const handleSelectAsset = () => {
    dispatch(
      saveAssetSelectType(
        isSwap ? AssetSelectType.SWAP : AssetSelectType.PATH_PAY,
      ),
    );
    dispatch(saveAssetSelectSource(source));
    navigateTo(ROUTES.manageAssets, isSwap ? "?swap=true" : "");
  };

  const truncateLongAssetCode = (code: string) => {
    if (code.length >= 5) {
      return `${code.slice(0, 5)}...`;
    }
    return code;
  };

  return (
    <div
      onClick={handleSelectAsset}
      className="AssetSelect__wrapper AssetSelect__wrapper--path-pay"
      data-testid="AssetSelect"
    >
      <div className="AssetSelect__content">
        <div className="AssetSelect__content__left">
          <span
            className="AssetSelect__light-copy AssetSelect__light-copy__label"
            data-testid="AssetSelectSourceLabel"
          >
            {source ? "From" : "To"}
          </span>
          <AssetIcon
            assetIcons={assetIcons}
            code={assetCode}
            issuerKey={issuerKey}
          />
          <span
            className="AssetSelect__medium-copy"
            data-testid="AssetSelectSourceCode"
          >
            {truncateLongAssetCode(assetCode)}
          </span>{" "}
          <ScamAssetIcon isScamAsset={isOwnedScamAsset} />
          <Icon.ChevronDown />
        </div>
        <div className="AssetSelect__content__right">
          <span
            className="AssetSelect__light-copy"
            data-testid="AssetSelectSourceAmount"
          >
            {balance && balance !== "0" ? balance : ""}{" "}
            {truncateLongAssetCode(assetCode)}
          </span>
        </div>
      </div>
    </div>
  );
}
