import {
  Asset,
  Badge,
  Button,
  Icon,
  Loader,
  Text,
} from "@stellar/design-system";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import { BlockAidScanAssetResult } from "@shared/api/types";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";

import { parsedSearchParam, TokenToAdd } from "helpers/urls";

import { rejectToken, addToken } from "popup/ducks/access";
import {
  isNonSSLEnabledSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import { useSetupAddTokenFlow } from "popup/helpers/useSetupAddTokenFlow";
import {
  WarningMessageVariant,
  WarningMessage,
  SSLWarningMessage,
  BlockaidAssetWarning,
  FirstTimeWarningMessage,
} from "popup/components/WarningMessages";
import { VerifyAccount } from "popup/views/VerifyAccount";
import { View } from "popup/basics/layout/View";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { useTokenLookup } from "popup/helpers/useTokenLookup";
import { isContractId } from "popup/helpers/soroban";
import { isAssetSuspicious, scanAsset } from "popup/helpers/blockaid";

import "./styles.scss";

export const AddToken = () => {
  const location = useLocation();
  const params = parsedSearchParam(location.search) as TokenToAdd;
  const {
    url,
    contractId,
    networkPassphrase: entryNetworkPassphrase,
    isDomainListedAllowed,
  } = params;

  const { t } = useTranslation();
  const isNonSSLEnabled = useSelector(isNonSSLEnabledSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { networkName, networkPassphrase } = networkDetails;

  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const [assetIcon, setAssetIcon] = useState<string | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);
  const [blockaidData, setBlockaidData] = useState<
    BlockAidScanAssetResult | undefined
  >(undefined);

  const assetCurrency: ManageAssetCurrency | undefined = assetRows[0];
  const assetCode = assetCurrency?.code || "";
  const assetIssuer = assetCurrency?.issuer || "";
  const assetName = assetCurrency?.name || "";
  const assetDomain = assetCurrency?.domain || "";

  const {
    isConfirming,
    isPasswordRequired,
    setIsPasswordRequired,
    verifyPasswordThenAddToken,
    handleApprove,
    rejectAndClose,
  } = useSetupAddTokenFlow({
    rejectToken,
    addToken,
    assetCode,
    assetIssuer,
  });

  const { handleTokenLookup } = useTokenLookup({
    setAssetRows,
    setIsSearching,
  });

  useEffect(() => {
    if (!isContractId(contractId)) {
      return;
    }

    handleTokenLookup(contractId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, handleTokenLookup]);

  useEffect(() => {
    if (!assetCode || !assetIssuer || blockaidData) {
      return;
    }

    const getBlockaidData = async () => {
      const scannedAsset = await scanAsset(
        `${assetCode}-${assetIssuer}`,
        networkDetails,
      );

      // "Benign" | "Warning" | "Malicious" | "Spam"
      // scannedAsset.result_type = "Warning";

      if (isAssetSuspicious(scannedAsset)) {
        setBlockaidData(scannedAsset);
      }
    };

    getBlockaidData();
  }, [assetCode, assetIssuer, blockaidData, networkDetails]);

  useEffect(() => {
    if (!assetCode || !assetIssuer || assetIcon !== undefined) {
      return;
    }

    const getAssetIcon = async () => {
      const iconUrl = await getIconUrlFromIssuer({
        key: assetIssuer,
        code: assetCode,
        networkDetails,
      });

      setAssetIcon(iconUrl || "");
    };

    getAssetIcon();
  }, [assetCode, assetIssuer, assetIcon, networkDetails]);

  if (entryNetworkPassphrase && entryNetworkPassphrase !== networkPassphrase) {
    return (
      <WarningMessage
        variant={WarningMessageVariant.warning}
        handleCloseClick={() => window.close()}
        isActive
        header={`${t("Freighter is set to")} ${networkName}`}
      >
        <p>
          {t("The token you’re trying to add is on")} {entryNetworkPassphrase}.
        </p>
        <p>{t("Adding this token is not possible at the moment.")}</p>
      </WarningMessage>
    );
  }

  if (!url.startsWith("https") && !isNonSSLEnabled) {
    return <SSLWarningMessage url={url} />;
  }

  if (isPasswordRequired) {
    return (
      <VerifyAccount
        isApproval
        customBackAction={() => setIsPasswordRequired(false)}
        customSubmit={verifyPasswordThenAddToken}
      />
    );
  }

  if (isSearching) {
    return (
      <React.Fragment>
        <View.Content>
          <div className="AddToken__loader">
            <Loader size="5rem" />
          </div>
        </View.Content>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <View.Content>
        <div className="AddToken">
          <div className="AddToken__wrapper">
            <div className="AddToken__wrapper__header">
              {assetIcon && (
                <div className="AddToken__wrapper__icon-logo">
                  <Asset
                    size="lg"
                    variant="single"
                    sourceOne={{
                      altText: "Add token logo",
                      image: assetIcon,
                    }}
                  />
                </div>
              )}

              {!assetIcon && assetCode && (
                <div className="AddToken__wrapper__code-logo">
                  <Text
                    as="div"
                    size="sm"
                    weight="bold"
                    addlClassName="AddToken__wrapper--logo-label"
                  >
                    {assetCode.slice(0, 2)}
                  </Text>
                </div>
              )}

              {assetCurrency && (
                <Text as="div" size="sm" weight="medium">
                  {assetName || assetCode}
                </Text>
              )}
              {assetDomain && (
                <Text
                  as="div"
                  size="sm"
                  addlClassName="AddToken__wrapper--domain-label"
                >
                  {assetDomain}
                </Text>
              )}
              <div className="AddToken__wrapper__badge">
                <Badge
                  size="sm"
                  variant="tertiary"
                  isSquare
                  icon={<Icon.ShieldPlus />}
                  iconPosition="left"
                >
                  {t("Approve Token")}
                </Badge>
              </div>
            </div>

            {!isDomainListedAllowed && <FirstTimeWarningMessage />}

            {blockaidData && (
              <BlockaidAssetWarning blockaidData={blockaidData} />
            )}

            <div className="AddToken__wrapper__info">
              <Text
                as="div"
                size="xs"
                addlClassName="AddToken__wrapper__info--title"
              >
                {t("Asset info")}
              </Text>

              {assetCode && (
                <div className="AddToken__wrapper__info__row">
                  <div className="AddToken__wrapper__info__row--icon">
                    <Icon.Coins01 />
                  </div>
                  <Text as="div" size="xs">
                    {t("Symbol")}
                  </Text>
                  <Text
                    as="div"
                    size="xs"
                    addlClassName="AddToken__wrapper__info__row__right_label"
                  >
                    {assetCode}
                  </Text>
                </div>
              )}

              {assetName && (
                <div className="AddToken__wrapper__info__row">
                  <div className="AddToken__wrapper__info__row--icon">
                    <Icon.TypeSquare />
                  </div>
                  <Text as="div" size="xs">
                    {t("Name")}
                  </Text>
                  <Text
                    as="div"
                    size="xs"
                    addlClassName="AddToken__wrapper__info__row__right_label"
                  >
                    {assetName}
                  </Text>
                </div>
              )}
            </div>

            {/* TODO: fetch actual values */}
            <div className="AddToken__wrapper__info">
              <Text
                as="div"
                size="xs"
                addlClassName="AddToken__wrapper__info--title"
              >
                {t("Simulated Balance Changes")}
              </Text>
              <div className="AddToken__wrapper__info__row">
                <div className="AddToken__wrapper__info__row--icon">
                  <Icon.CoinsStacked03 />
                </div>
                <Text as="div" size="xs">
                  {t("Amount")}
                </Text>
                <Text
                  as="div"
                  size="xs"
                  addlClassName="AddToken__wrapper__info--amount AddToken__wrapper__info__row__right_label"
                >
                  +1000.00 GO
                </Text>
              </div>
            </div>

            <div className="AddToken__wrapper__footer">
              <Button
                isFullWidth
                size="md"
                variant="tertiary"
                onClick={() => rejectAndClose()}
              >
                {t("Cancel")}
              </Button>
              <Button
                disabled={!assetCurrency}
                isFullWidth
                size="md"
                variant="secondary"
                isLoading={isConfirming}
                onClick={() => handleApprove()}
              >
                {t("Add asset")}
              </Button>
            </div>
          </div>
        </div>
      </View.Content>
    </React.Fragment>
  );
};
