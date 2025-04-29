import {
  Asset,
  Badge,
  Button,
  Icon,
  Loader,
  Notification,
  Text,
} from "@stellar/design-system";
import BigNumber from "bignumber.js";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { StellarToml } from "stellar-sdk";

import { BlockAidScanAssetResult } from "@shared/api/types";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";

import { newTabHref, parsedSearchParam, TokenToAdd } from "helpers/urls";

import { rejectToken, addToken } from "popup/ducks/access";
import { isNonSSLEnabledSelector } from "popup/ducks/settings";
import { useSetupAddTokenFlow } from "popup/helpers/useSetupAddTokenFlow";
import {
  WarningMessageVariant,
  WarningMessage,
  SSLWarningMessage,
  BlockaidAssetWarning,
  DomainNotAllowedWarningMessage,
} from "popup/components/WarningMessages";
import { VerifyAccount } from "popup/views/VerifyAccount";
import { View } from "popup/basics/layout/View";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { AssetNotifcation } from "popup/components/AssetNotification";
import { useTokenLookup } from "popup/helpers/useTokenLookup";
import { formatTokenAmount, isContractId } from "popup/helpers/soroban";
import { isAssetSuspicious, scanAsset } from "popup/helpers/blockaid";
import { useIsDomainListedAllowed } from "popup/helpers/useIsDomainListedAllowed";

import "./styles.scss";
import { useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { openTab } from "popup/helpers/navigate";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";

export const AddToken = () => {
  const location = useLocation();
  const params = parsedSearchParam(location.search) as TokenToAdd;
  const {
    domain,
    url,
    contractId,
    networkPassphrase: entryNetworkPassphrase,
  } = params;

  const { isDomainListedAllowed } = useIsDomainListedAllowed({
    domain,
  });
  const { state, fetchData } = useGetAppData();

  const { t } = useTranslation();
  const isNonSSLEnabled = useSelector(isNonSSLEnabledSelector);

  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const [assetIcon, setAssetIcon] = useState<string | undefined>(undefined);
  const [assetTomlName, setAssetTomlName] = useState<string | undefined>(
    undefined,
  );
  const [isSearching, setIsSearching] = useState(true);
  const [isVerifiedToken, setIsVerifiedToken] = useState(false);
  const [isVerificationInfoShowing, setIsVerificationInfoShowing] =
    useState(false);
  const [blockaidData, setBlockaidData] = useState<
    BlockAidScanAssetResult | undefined
  >(undefined);
  const [errorMessage, setErrorMessage] = useState("");

  const assetCurrency: ManageAssetCurrency | undefined = assetRows[0];

  const getAssetBalance = () => {
    const code = assetCurrency?.code;
    const balance = assetCurrency?.balance;
    const decimals = assetCurrency?.decimals;
    if (code && balance && decimals) {
      const balanceNumber = new BigNumber(balance);

      // Let's only show the balance if it's greater than 0
      if (balanceNumber.isZero()) {
        return undefined;
      }

      const formattedTokenAmount = formatTokenAmount(balanceNumber, decimals);
      return `+${formattedTokenAmount} ${code}`;
    }

    return undefined;
  };

  const assetCode = assetCurrency?.code || "";
  const assetIssuer = assetCurrency?.issuer || "";
  const assetName = assetTomlName || assetCurrency?.name?.split(":")[0];
  const assetDomain = assetCurrency?.domain || "";
  const assetBalance = getAssetBalance();
  const hasBalance = assetBalance !== undefined;

  const isLoading =
    isSearching || assetIcon === undefined || assetTomlName === undefined;

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
    setIsVerifiedToken,
    setIsVerificationInfoShowing,
  });

  useEffect(() => {
    if (!isContractId(contractId)) {
      setErrorMessage(
        t(
          "This is not a valid contract id. Please try again with a different value.",
        ),
      );
      return;
    }

    handleTokenLookup(contractId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, handleTokenLookup]);

  useEffect(() => {
    if (
      !assetCode ||
      !assetIssuer ||
      blockaidData ||
      state.state !== RequestState.SUCCESS ||
      state.data.type !== "resolved"
    ) {
      return;
    }
    const { networkDetails } = state.data.settings;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetCode, assetIssuer, blockaidData, state.state]);

  useEffect(() => {
    if (
      !assetCode ||
      !assetIssuer ||
      assetIcon !== undefined ||
      state.state !== RequestState.SUCCESS ||
      state.data.type !== "resolved"
    ) {
      return;
    }
    const { networkDetails } = state.data.settings;

    const getAssetIcon = async () => {
      const iconUrl = await getIconUrlFromIssuer({
        key: assetIssuer,
        code: assetCode,
        networkDetails,
      });

      setAssetIcon(iconUrl || "");
    };

    getAssetIcon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetCode, assetIssuer, assetIcon, state.state]);

  useEffect(() => {
    if (assetCode && assetIssuer && !assetDomain) {
      setAssetTomlName("");
      return;
    }

    if (
      !assetDomain ||
      !assetCode ||
      !assetIssuer ||
      assetTomlName !== undefined
    ) {
      return;
    }

    const getAssetTomlName = async () => {
      try {
        const toml = await StellarToml.Resolver.resolve(assetDomain);
        const currency = toml?.CURRENCIES?.find(
          ({ code, issuer }) => code === assetCode && issuer === assetIssuer,
        );
        setAssetTomlName(currency?.name || "");
      } catch (e) {
        console.error(e);
        setAssetTomlName("");
      }
    };

    getAssetTomlName();
  }, [assetDomain, assetCode, assetIssuer, assetTomlName]);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    state.state === RequestState.IDLE ||
    state.state === RequestState.LOADING
  ) {
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

  if (state.state === RequestState.ERROR) {
    return (
      <div className="AddAsset__fetch-fail">
        <Notification
          variant="error"
          title={t("Failed to fetch your account data.")}
        >
          {t("Your account data could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (state.data?.type === "re-route") {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${state.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (
    state.data.type === "resolved" &&
    (state.data.account.applicationState ===
      APPLICATION_STATE.PASSWORD_CREATED ||
      state.data.account.applicationState ===
        APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    window.close();
  }
  const { networkPassphrase, networkName } = state.data.settings.networkDetails;

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

  if (errorMessage) {
    return (
      <React.Fragment>
        <View.Content>
          <div className="AddToken__error">
            <Text as="h1" size="xl">
              {errorMessage}
            </Text>
          </div>
        </View.Content>
      </React.Fragment>
    );
  }

  if (isLoading) {
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
                  {t("Approve Asset")}
                </Badge>
              </div>
            </div>

            {assetCurrency && isVerificationInfoShowing && (
              <AssetNotifcation isVerified={isVerifiedToken} />
            )}

            {blockaidData && (
              <BlockaidAssetWarning blockaidData={blockaidData} />
            )}

            {!isDomainListedAllowed && (
              <DomainNotAllowedWarningMessage domain={params.domain} />
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
                    data-testid="add-token-asset-code"
                    as="div"
                    size="xs"
                    addlClassName="AddToken__wrapper__info__row__right_label"
                  >
                    {assetCode}
                  </Text>
                </div>
              )}

              {assetName && assetName !== assetCode && (
                <div className="AddToken__wrapper__info__row">
                  <div className="AddToken__wrapper__info__row--icon">
                    <Icon.TypeSquare />
                  </div>
                  <Text as="div" size="xs">
                    {t("Name")}
                  </Text>
                  <Text
                    data-testid="add-token-asset-name"
                    as="div"
                    size="xs"
                    addlClassName="AddToken__wrapper__info__row__right_label"
                  >
                    {assetName}
                  </Text>
                </div>
              )}
            </div>

            {hasBalance && (
              <div className="AddToken__wrapper__info">
                <Text
                  as="div"
                  size="xs"
                  addlClassName="AddToken__wrapper__info--title"
                >
                  {t("Balance Info")}
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
                    {assetBalance}
                  </Text>
                </div>
              </div>
            )}

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
                data-testid="add-token-approve"
                disabled={!assetCurrency || !isDomainListedAllowed}
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
