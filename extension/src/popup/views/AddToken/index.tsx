import {
  Asset,
  Badge,
  Button,
  Icon,
  Loader,
  Notification,
  Text,
} from "@stellar/design-system";
import { captureException } from "@sentry/browser";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { BASE_FEE, StellarToml } from "stellar-sdk";
import { isMainnet, stroopToXlm, truncateString } from "helpers/stellar";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { ChangeTrustInternal } from "popup/components/manageAssets/ManageAssetRows/ChangeTrustInternal";

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
  DomainNotAllowedWarningMessage,
  BlockAidAssetScanExpanded,
} from "popup/components/WarningMessages";
import { BlockaidBanner } from "popup/components/BlockaidBanner";
import {
  VerifiedTokenInfoSheet,
  UnverifiedTokenInfoSheet,
} from "popup/components/TokenVerificationSheets";
import { VerifyAccount } from "popup/views/VerifyAccount";
import { View } from "popup/basics/layout/View";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { useTokenLookup } from "popup/helpers/useTokenLookup";
import { isContractId, isAssetSac } from "popup/helpers/soroban";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import {
  scanAsset,
  isAssetSuspicious,
  isAssetMalicious,
  shouldTreatAssetAsUnableToScan,
  getAssetSecurityLevel,
  useBlockaidOverrideState,
} from "popup/helpers/blockaid";
import {
  getAccountBalances,
  getBlockaidOverrideState,
} from "@shared/api/internal";
import { useIsDomainListedAllowed } from "popup/helpers/useIsDomainListedAllowed";
import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { openTab } from "popup/helpers/navigate";
import { reRouteOnboarding } from "popup/helpers/route";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { useMarkQueueActive } from "popup/helpers/useMarkQueueActive";

import "./styles.scss";

export const AddToken = () => {
  const location = useLocation();
  const params = parsedSearchParam(location.search) as TokenToAdd;
  const {
    domain,
    url,
    contractId,
    networkPassphrase: entryNetworkPassphrase,
    uuid,
  } = params;

  const { isDomainListedAllowed } = useIsDomainListedAllowed({
    domain,
  });
  const { state, fetchData } = useGetAppData();

  // Mark this queue item as active to prevent TTL cleanup while popup is open
  useMarkQueueActive(uuid);

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
  const [blockaidData, setBlockaidData] =
    useState<BlockAidScanAssetResult | null>(null);
  const [isMaliciousAsset, setIsMaliciousAsset] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // The expanded Blockaid sheet renders in-flow (replacing the body in place),
  // matching the ReviewTransaction pattern.
  const [isOnBlockaidSheet, setIsOnBlockaidSheet] = useState(false);
  const [verifiedSheetOpen, setVerifiedSheetOpen] = useState(false);
  const [unverifiedSheetOpen, setUnverifiedSheetOpen] = useState(false);
  const blockaidOverrideState = useBlockaidOverrideState();
  // SAC/classic duplicate-add guard state (see the trustline-lookup effect).
  const [hasClassicTrustline, setHasClassicTrustline] = useState(false);
  const [hasClassicTrustlineResolved, setHasClassicTrustlineResolved] =
    useState(false);
  const [isClassicTrustlineLoading, setIsClassicTrustlineLoading] =
    useState(false);

  const assetCurrency: ManageAssetCurrency | undefined = assetRows[0];

  const assetCode = assetCurrency?.code || "";
  const assetIssuer = assetCurrency?.issuer || "";
  const assetName = assetTomlName || assetCurrency?.name?.split(":")[0];
  const assetDomain = assetCurrency?.domain || "";

  const hasLookupResult = assetRows.length > 0;
  const isLoading =
    isSearching ||
    (hasLookupResult &&
      (assetIcon === undefined || assetTomlName === undefined));

  const [showTrustlineReview, setShowTrustlineReview] = useState(false);

  // `recommendedFee` is the network-recommended fee in XLM after useNetworkFees
  // resolves; pre-fetch it is the raw BASE_FEE (stroops), so guard against that
  // and fall back to the base fee converted to XLM. This same value is both
  // displayed here and passed into the trustline review so the disclosed fee
  // matches the charged fee.
  const { recommendedFee } = useNetworkFees();
  const baseFeeXlm = stroopToXlm(BASE_FEE).toString();
  const displayFee = recommendedFee === BASE_FEE ? baseFeeXlm : recommendedFee;

  const {
    isConfirming,
    isPasswordRequired,
    submitError,
    clearSubmitError,
    setIsPasswordRequired,
    verifyPasswordThenAddToken,
    handleApprove,
    addTokenAndClose,
    rejectAndClose,
  } = useSetupAddTokenFlow({
    rejectToken,
    addToken,
    uuid,
  });

  const hydratedPublicKey =
    state.state === RequestState.SUCCESS && state.data.type === "resolved"
      ? state.data.account.publicKey
      : "";
  const hydratedNetworkDetails =
    state.state === RequestState.SUCCESS && state.data.type === "resolved"
      ? state.data.settings.networkDetails
      : undefined;

  // Verify the contract is the derived SAC, not just a G-address issuer.
  const isSac =
    !!hydratedNetworkDetails &&
    isAssetSac({
      asset: {
        code: assetCode,
        issuer: assetIssuer,
        contract: assetCurrency?.contract,
      },
      networkDetails: hydratedNetworkDetails,
    });

  const { handleTokenLookup } = useTokenLookup({
    setAssetRows,
    setIsSearching,
    setIsVerifiedToken,
    setIsVerificationInfoShowing,
    lookupPublicKey: hydratedPublicKey,
    lookupNetworkDetails: hydratedNetworkDetails,
  });

  // Resolves off the trustline tx succeeding, not the Done button, so a
  // successful trustline is never reported as "user rejected". Kept as a
  // promise so Done can await it before closing.
  const addTokenPromiseRef = useRef<Promise<boolean> | null>(null);
  // Total attempts (initial + retries) to deliver the ADD_TOKEN round-trip
  // once a trustline has succeeded on-chain, before giving up and leaving the
  // popup open rather than reporting the dApp a false decline.
  const MAX_ADD_TOKEN_ATTEMPTS = 3;

  const handleTrustlineTransactionSuccess = () => {
    if (!addTokenPromiseRef.current) {
      addTokenPromiseRef.current = addTokenAndClose(true);
    }
  };

  // Done only closes the popup — but the dApp request is resolved by the
  // background's response(true); window.close() triggers rejectOnWindowClose,
  // which reports "user rejected". By the time this runs the trustline has
  // already succeeded on-chain, so a close that beats response(true) would
  // report a decline for a live trustline. The eager addTokenAndClose(true)
  // (fired on tx success) normally delivers response(true) before Done; the
  // residual failure is the messaging round-trip itself throwing, which never
  // reaches the background. So retry it and close ONLY once success has
  // actually been delivered — don't rely on the response callback winning a
  // race against window.close(). If it stays undeliverable, keep the popup
  // open rather than closing into a false "user rejected"; the user can retry.
  const handleTrustlineDone = async () => {
    let succeeded = await (addTokenPromiseRef.current ??
      addTokenAndClose(true));

    for (
      let attempt = 1;
      !succeeded && attempt < MAX_ADD_TOKEN_ATTEMPTS;
      attempt += 1
    ) {
      addTokenPromiseRef.current = null;
      succeeded = await addTokenAndClose(true);
    }

    if (succeeded) {
      window.close();
      return;
    }

    captureException(
      "addToken: trustline succeeded on-chain but the ADD_TOKEN round-trip " +
        "could not be delivered; leaving popup open to avoid reporting the " +
        "dApp a false decline for a live trustline",
    );
  };

  useEffect(() => {
    if (!hydratedPublicKey) {
      return;
    }

    if (!hydratedNetworkDetails?.network) {
      return;
    }

    if (!isContractId(contractId)) {
      setErrorMessage(
        `${t("This is not a valid contract id.")} ${t("Please try again with a different value.")}`,
      );
      return;
    }

    handleTokenLookup(contractId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    contractId,
    handleTokenLookup,
    hydratedNetworkDetails?.network,
    hydratedPublicKey,
  ]);

  useEffect(() => {
    if (!isSearching && !hasLookupResult && !errorMessage) {
      setErrorMessage(
        `${t("Unable to find your asset.")} ${t("Please try again with a different value.")}`,
      );
    }
  }, [errorMessage, hasLookupResult, isSearching, t]);

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
      const [scannedAsset, overrideState] = await Promise.all([
        scanAsset(`${assetCode}-${assetIssuer}`, networkDetails),
        getBlockaidOverrideState().catch(() => null),
      ]);

      if (
        scannedAsset &&
        (isAssetSuspicious(scannedAsset, overrideState) ||
          isAssetMalicious(scannedAsset, overrideState) ||
          shouldTreatAssetAsUnableToScan(
            scannedAsset,
            overrideState,
            networkDetails,
          ))
      ) {
        setBlockaidData(scannedAsset);
        setIsMaliciousAsset(isAssetMalicious(scannedAsset, overrideState));
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

  useEffect(() => {
    if (
      !hydratedPublicKey ||
      !hydratedNetworkDetails ||
      !assetCode ||
      !assetIssuer ||
      !isSac
    ) {
      setIsClassicTrustlineLoading(false);
      setHasClassicTrustline(false);
      setHasClassicTrustlineResolved(false);
      return;
    }

    let isMounted = true;
    setHasClassicTrustlineResolved(false);
    setIsClassicTrustlineLoading(true);

    const fetchClassicTrustline = async () => {
      try {
        const accountBalances = await getAccountBalances(
          hydratedPublicKey,
          hydratedNetworkDetails,
          isMainnet(hydratedNetworkDetails),
          true,
        );

        const balances = accountBalances.balances;
        const balanceItems = Array.isArray(balances)
          ? balances
          : Object.values(balances || {});

        const hasTrustline = balanceItems.some((balance: unknown) => {
          if (
            !balance ||
            typeof balance !== "object" ||
            !("token" in balance)
          ) {
            return false;
          }

          const token = (
            balance as {
              token?: { code?: string; issuer?: { key?: string } };
            }
          ).token;

          return (
            token?.code === assetCode && token?.issuer?.key === assetIssuer
          );
        });

        if (isMounted) {
          setHasClassicTrustline(hasTrustline);
          setIsClassicTrustlineLoading(false);
          setHasClassicTrustlineResolved(true);
        }
      } catch (e) {
        if (isMounted) {
          setHasClassicTrustline(false);
          setIsClassicTrustlineLoading(false);
          setHasClassicTrustlineResolved(true);
        }
      }
    };

    fetchClassicTrustline();

    return () => {
      isMounted = false;
    };
  }, [
    assetCode,
    assetIssuer,
    hydratedNetworkDetails,
    hydratedPublicKey,
    isSac,
  ]);

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

  const nativeContract = getNativeContractDetails(
    state.data.settings.networkDetails,
  ).contract;
  const isNativeContract = contractId === nativeContract;

  // SEP-41 tokens are only ever recorded locally (no trustline, no cost), so
  // they can be added any number of times — only SAC/classic (real trustline
  // submissions, which charge a fee) and native (already auto-trusted) block
  // re-adding.
  const isTrustlineCheckLoading =
    isSac && (!hasClassicTrustlineResolved || isClassicTrustlineLoading);

  const hasExistingTrustline =
    isNativeContract || (isSac && hasClassicTrustline);

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

  if (showTrustlineReview && isSac && assetCurrency) {
    return (
      <ChangeTrustInternal
        asset={{
          code: assetCode,
          issuer: assetIssuer,
          image: assetIcon || null,
          domain: assetDomain || null,
          contract: assetCurrency.contract,
        }}
        addTrustline
        publicKey={state.data.account.publicKey}
        networkDetails={state.data.settings.networkDetails}
        onCancel={() => setShowTrustlineReview(false)}
        onTransactionSuccess={handleTrustlineTransactionSuccess}
        onSuccess={handleTrustlineDone}
        onClose={() => setShowTrustlineReview(false)}
        initialFee={displayFee}
        isFullHeight
      />
    );
  }

  return (
    <React.Fragment>
      <View.Content hasNoBottomPadding>
        <div className="AddToken">
          {isOnBlockaidSheet && blockaidData ? (
            <BlockAidAssetScanExpanded
              scanResult={blockaidData}
              onClose={() => setIsOnBlockaidSheet(false)}
            />
          ) : (
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

              {submitError && (
                <div className="AddToken__submit-error">
                  <Notification
                    variant="error"
                    title={t("Failed to add token.")}
                  >
                    {submitError}
                  </Notification>
                </div>
              )}

              {/* This wording is trustline-specific and only applies to
                  SAC/classic assets — SEP-41 tokens have no trustline, they
                  are only recorded locally, so the message would be
                  misleading for them. Native XLM also renders this: isSac
                  is true for the native contract too (isAssetSac special-
                  cases it), so gating on isSac alone covers both. */}
              {hasExistingTrustline && isSac && (
                <div className="AddToken__submit-error">
                  <Notification
                    variant="error"
                    title={t("This token already has a trustline added.")}
                  />
                </div>
              )}

              {assetCurrency && isVerificationInfoShowing && (
                <button
                  type="button"
                  className="AddToken__verification"
                  data-testid={
                    isVerifiedToken
                      ? "add-token-verified"
                      : "add-token-unverified"
                  }
                  aria-label={
                    isVerifiedToken
                      ? t("About verified tokens")
                      : t("About unverified tokens")
                  }
                  onClick={() =>
                    isVerifiedToken
                      ? setVerifiedSheetOpen(true)
                      : setUnverifiedSheetOpen(true)
                  }
                >
                  <span>
                    {isVerifiedToken ? t("Verified") : t("Unverified")}
                  </span>
                  <Icon.InfoCircle />
                </button>
              )}

              {blockaidData && (
                <BlockaidBanner
                  securityLevel={getAssetSecurityLevel({
                    blockaidData,
                    blockaidOverrideState,
                    networkDetails: state.data.settings.networkDetails,
                  })}
                  entity="token"
                  onClick={() => setIsOnBlockaidSheet(true)}
                  dataTestId="blockaid-banner-add-token"
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
                {isSac && (
                  <>
                    <div
                      className="AddToken__Metadata__Row"
                      data-testid="AddToken__Metadata__Row__Fee"
                    >
                      <div className="AddToken__Metadata__Label">
                        <Icon.Route />
                        <span>{t("Fee")}</span>
                      </div>
                      <div className="AddToken__Metadata__Value">
                        <span>{`${displayFee} XLM`}</span>
                      </div>
                    </div>
                    <div
                      className="AddToken__Metadata__Row"
                      data-testid="AddToken__Metadata__Row__TokenAddress"
                    >
                      <div className="AddToken__Metadata__Label">
                        <Icon.CodeCircle01 />
                        <span>{t("Token address")}</span>
                      </div>
                      <div className="AddToken__Metadata__Value">
                        <span>{truncateString(contractId)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {/* Verified/Unverified info sheets, shared with the swap picker. */}
          <VerifiedTokenInfoSheet
            isOpen={verifiedSheetOpen}
            onClose={() => setVerifiedSheetOpen(false)}
          />
          <UnverifiedTokenInfoSheet
            isOpen={unverifiedSheetOpen}
            onClose={() => setUnverifiedSheetOpen(false)}
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
          disabled={
            !isDomainListedAllowed ||
            hasExistingTrustline ||
            isTrustlineCheckLoading
          }
          isFullWidth
          isRounded
          size="lg"
          variant={isMaliciousAsset ? "error" : "secondary"}
          isLoading={isConfirming}
          onClick={() => {
            clearSubmitError();
            if (hasExistingTrustline || isTrustlineCheckLoading) {
              return;
            }
            if (isSac) {
              setShowTrustlineReview(true);
              return;
            }
            // SEP-41 is a one-step flow: this submits and closes immediately
            // on success (see useSetupAddTokenFlow.handleApprove).
            handleApprove();
          }}
        >
          {/* SAC is a 2-step flow (Add Token → Change Trust review), so this
              first button advances ("Continue"); SEP-41 confirms directly. */}
          {isSac ? t("Continue") : t("Confirm")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
