import {
  Asset,
  Badge,
  Button,
  Icon,
  Loader,
  Notification,
  Text,
} from "@stellar/design-system";
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
  BlockAidAssetScanExpanded,
  AssetListWarning,
  AssetListWarningExpanded,
} from "popup/components/WarningMessages";
import { VerifyAccount } from "popup/views/VerifyAccount";
import { View } from "popup/basics/layout/View";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { useTokenLookup } from "popup/helpers/useTokenLookup";
import { isContractId } from "popup/helpers/soroban";
import { isAssetSuspicious, scanAsset } from "popup/helpers/blockaid";
import { useIsDomainListedAllowed } from "popup/helpers/useIsDomainListedAllowed";
import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { openTab } from "popup/helpers/navigate";
import { reRouteOnboarding } from "popup/helpers/route";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";

import "./styles.scss";

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
  const [activePaneIndex, setActivePaneIndex] = useState(0);

  const assetCurrency: ManageAssetCurrency | undefined = assetRows[0];

  const assetCode = assetCurrency?.code || "";
  const assetIssuer = assetCurrency?.issuer || "";
  const assetName = assetTomlName || assetCurrency?.name?.split(":")[0];
  const assetDomain = assetCurrency?.domain || "";

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
        `${t("This is not a valid contract id.")} ${t("Please try again with a different value.")}`,
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

  if (state.data?.type === AppDataType.REROUTE) {
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

  reRouteOnboarding({
    type: state.data.type,
    applicationState: state.data.account.applicationState,
    state: state.state,
  });

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
      <View.Content hasNoBottomPadding>
        <div className="AddToken">
          <MultiPaneSlider
            activeIndex={activePaneIndex}
            panes={[
              <div className="AddToken__wrapper">
                <div className="AddToken__wrapper__header">
                  {assetIcon && (
                    <div className="AddToken__wrapper__icon-logo">
                      <Asset
                        size="lg"
                        variant="single"
                        sourceOne={{
                          altText: t("Add token logo"),
                          image: assetIcon,
                          backgroundColor: "transparent",
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
                      variant="secondary"
                      icon={<Icon.PlusCircle />}
                      iconPosition="left"
                    >
                      {t("Add Token")}
                    </Badge>
                  </div>
                </div>

                {assetCurrency &&
                  isVerificationInfoShowing &&
                  !isVerifiedToken && (
                    <AssetListWarning
                      isVerified={isVerifiedToken}
                      onClick={() => setActivePaneIndex(2)}
                    />
                  )}

                {blockaidData && (
                  <BlockaidAssetWarning
                    blockaidData={blockaidData}
                    onClick={() => setActivePaneIndex(1)}
                  />
                )}

                {!isDomainListedAllowed && (
                  <DomainNotAllowedWarningMessage domain={params.domain} />
                )}

                <div className="AddToken__Description">
                  {t(
                    "Allow token to be displayed and used with this wallet address",
                  )}
                </div>
                <div className="AddToken__Metadata">
                  <div className="AddToken__Metadata__Row">
                    <div className="AddToken__Metadata__Label">
                      <Icon.Wallet01 />
                      <span>{t("Wallet")}</span>
                    </div>
                    <div className="AddToken__Metadata__Value">
                      <KeyIdenticon publicKey={state.data.account.publicKey} />
                    </div>
                  </div>
                </div>
              </div>,
              <BlockAidAssetScanExpanded
                scanResult={blockaidData!}
                onClose={() => setActivePaneIndex(0)}
              />,
              <AssetListWarningExpanded
                isVerified={isVerifiedToken}
                onClose={() => setActivePaneIndex(0)}
              />,
            ]}
          />
        </div>
      </View.Content>
      <View.Footer isInline>
        <Button
          isFullWidth
          isRounded
          size="lg"
          variant="tertiary"
          onClick={() => rejectAndClose()}
        >
          {t("Cancel")}
        </Button>
        <Button
          data-testid="add-token-approve"
          disabled={!isDomainListedAllowed}
          isFullWidth
          isRounded
          size="lg"
          variant="secondary"
          isLoading={isConfirming}
          onClick={() => handleApprove()}
        >
          {t("Confirm")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
