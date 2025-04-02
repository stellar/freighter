import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Icon } from "@stellar/design-system";

import { isMainnet, isTestnet } from "helpers/stellar";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { UnverifiedTokenNotification } from "popup/components/WarningMessages";
import {
  saveAssetSelectSource,
  saveAssetSelectType,
  AssetSelectType,
  saveAmount,
} from "popup/ducks/transactionSubmission";
import { isContractId } from "popup/helpers/soroban";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { settingsSelector } from "popup/ducks/settings";
import { getVerifiedTokens } from "popup/helpers/searchAsset";
import { AssetIcons } from "@shared/api/types";
import { AppDispatch } from "popup/App";

import "./styles.scss";

export const AssetSelect = ({
  assetCode,
  issuerKey,
  isSuspicious,
  icons,
  onSelectAsset,
}: {
  assetCode: string;
  issuerKey: string;
  isSuspicious: boolean;
  icons: AssetIcons;
  onSelectAsset: () => unknown;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { networkDetails, assetsLists } = useSelector(settingsSelector);

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
        assetsLists,
      });

      if (!verifiedTokens.length) {
        setIsUnverifiedToken(true);
      }
    };

    fetchVerifiedTokens();
  }, [issuerKey, networkDetails, assetsLists]);

  const handleSelectAsset = () => {
    dispatch(saveAssetSelectType(AssetSelectType.REGULAR));
    dispatch(saveAssetSelectSource(true));
    onSelectAsset();
  };

  return (
    <>
      {isUnverifiedToken ? (
        <div className="AssetSelect__unverified">
          <UnverifiedTokenNotification />
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
              assetIcons={icons}
              code={assetCode}
              issuerKey={issuerKey}
              isSuspicious={isSuspicious}
            />
            <span className="AssetSelect__medium-copy">{assetCode}</span>
          </div>
          <div className="AssetSelect__content__right">
            <Icon.ChevronDown />
          </div>
        </div>
      </div>
    </>
  );
};

export const PathPayAssetSelect = ({
  source,
  assetCode,
  issuerKey,
  balance,
  icon,
  icons,
  isSuspicious,
  onSelectAsset,
}: {
  source: boolean;
  assetCode: string;
  issuerKey: string;
  balance: string;
  icon: string;
  isSuspicious: boolean;
  icons: AssetIcons;
  onSelectAsset: () => unknown;
}) => {
  const dispatch = useDispatch();
  const isSwap = useIsSwap();

  const handleSelectAsset = () => {
    dispatch(
      saveAssetSelectType(
        isSwap ? AssetSelectType.SWAP : AssetSelectType.PATH_PAY,
      ),
    );
    dispatch(saveAssetSelectSource(source));
    if (source) {
      dispatch(saveAmount("0"));
    }
    // navigateTo(ROUTES.manageAssets, navigate, isSwap ? "?swap=true" : "");
    onSelectAsset();
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
            assetIcons={icons}
            code={assetCode}
            issuerKey={issuerKey}
            icon={icon}
            isSuspicious={isSuspicious}
          />
          <span
            className="AssetSelect__medium-copy"
            data-testid="AssetSelectSourceCode"
          >
            {truncateLongAssetCode(assetCode)}
          </span>{" "}
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
};
