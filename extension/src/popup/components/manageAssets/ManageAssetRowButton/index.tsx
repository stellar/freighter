import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Networks, StrKey } from "stellar-sdk";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Button, Icon, CopyText } from "@stellar/design-system";

import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { emitMetric } from "helpers/metrics";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { getCanonicalFromAsset } from "helpers/stellar";
import { getManageAssetXDR } from "popup/helpers/getManageAssetXDR";
import { checkForSuspiciousAsset } from "popup/helpers/checkForSuspiciousAsset";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
  addTokenId,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  getAccountBalances,
  resetSubmission,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
  startHwSign,
  removeTokenId,
  resetSubmitStatus,
} from "popup/ducks/transactionSubmission";
import { ActionStatus } from "@shared/api/types";
import { NETWORKS } from "@shared/constants/stellar";
import { ROUTES } from "popup/constants/routes";

import IconAdd from "popup/assets/icon-add.svg";
import IconRemove from "popup/assets/icon-remove.svg";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";

import { TrustlineError } from "../TrustlineError";

import "./styles.scss";

interface ManageAssetRowButtonProps {
  code: string;
  contract: string;
  issuer: string;
  image: string;
  domain: string;
  isTrustlineActive: boolean;
  isActionPending: boolean;
  isContract: boolean;
  isVerificationInfoShowing: boolean;
  isVerifiedToken: boolean;
  assetSubmitting: string;
  setAssetSubmitting: (rowButtonShowing: string) => void;
  setShowBlockedDomainWarning: (rowButtonShowing: boolean) => void;
  setSuspiciousAssetData: (data: any) => void;
  setShowNewAssetWarning: (rowButtonShowing: boolean) => void;
  setNewAssetFlags: (flags: any) => void;
  setShowUnverifiedWarning: (rowButtonShowing: boolean) => void;
  setHandleAddToken: (func: any) => void;
}

export const ManageAssetRowButton = ({
  code,
  contract,
  issuer,
  image,
  domain,
  isTrustlineActive,
  isActionPending,
  isContract,
  isVerificationInfoShowing,
  isVerifiedToken,
  assetSubmitting,
  setAssetSubmitting,
  setShowBlockedDomainWarning,
  setSuspiciousAssetData,
  setShowNewAssetWarning,
  setNewAssetFlags,
  setShowUnverifiedWarning,
  setHandleAddToken,
}: ManageAssetRowButtonProps) => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const [rowButtonShowing, setRowButtonShowing] = useState("");
  const [isTrustlineErrorShowing, setIsTrustlineErrorShowing] = useState(false);
  const [isSigningWithHardwareWallet, setIsSigningWithHardwareWallet] =
    useState(false);
  const { blockedDomains, submitStatus } = useSelector(
    transactionSubmissionSelector,
  );
  const walletType = useSelector(hardwareWalletTypeSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const { recommendedFee } = useNetworkFees();

  const isHardwareWallet = !!walletType;
  const ManageAssetRowDropdownRef = useRef<HTMLDivElement>(null);
  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );

  const isBlockedDomain = (d: string) => blockedDomains.domains[d];

  const handleBackgroundClick = () => {
    setRowButtonShowing("");
  };
  const canonicalAsset = getCanonicalFromAsset(code, issuer);

  const signAndSubmit = async (
    transactionXDR: string,
    trackChangeTrustline: () => void,
    successfulCallback?: () => Promise<void>,
  ) => {
    const res = await dispatch(
      signFreighterTransaction({
        transactionXDR,
        network: networkDetails.networkPassphrase,
      }),
    );

    if (signFreighterTransaction.fulfilled.match(res)) {
      const submitResp = await dispatch(
        submitFreighterTransaction({
          publicKey,
          signedXDR: res.payload.signedTransaction,
          networkDetails,
        }),
      );

      setAssetSubmitting("");
      setRowButtonShowing("");

      if (submitFreighterTransaction.fulfilled.match(submitResp)) {
        dispatch(
          getAccountBalances({
            publicKey,
            networkDetails,
          }),
        );
        trackChangeTrustline();
        dispatch(resetSubmission());
        if (successfulCallback) {
          await successfulCallback();
        }
      }

      if (submitFreighterTransaction.rejected.match(submitResp)) {
        setIsTrustlineErrorShowing(true);
      }
    }
  };

  const changeTrustline = async (
    addTrustline: boolean,
    successfulCallback?: () => Promise<void>,
  ) => {
    setAssetSubmitting(canonicalAsset);

    const transactionXDR: string = await getManageAssetXDR({
      publicKey,
      assetCode: code,
      assetIssuer: issuer,
      addTrustline,
      server,
      recommendedFee,
      networkDetails,
    });

    const trackChangeTrustline = () => {
      emitMetric(
        addTrustline
          ? METRIC_NAMES.manageAssetAddAsset
          : METRIC_NAMES.manageAssetRemoveAsset,
        { code, issuer },
      );
    };

    if (isHardwareWallet) {
      // eslint-disable-next-line
      await dispatch(startHwSign({ transactionXDR, shouldSubmit: true }));
      setIsSigningWithHardwareWallet(true);
      trackChangeTrustline();
    } else {
      await signAndSubmit(
        transactionXDR,
        trackChangeTrustline,
        successfulCallback,
      );
    }
  };

  const handleRowClick = async (
    assetRowData = {
      code: "",
      issuer: "",
      domain: "",
      image: "",
    },
  ) => {
    const resp = await checkForSuspiciousAsset({
      code: assetRowData.code,
      issuer: assetRowData.issuer,
      domain: assetRowData.domain,
      server,
      networkDetails,
    });

    if (isBlockedDomain(assetRowData.domain) && !isTrustlineActive) {
      setShowBlockedDomainWarning(true);
      setSuspiciousAssetData(assetRowData);
    } else if (
      !isTrustlineActive &&
      (resp.isInvalidDomain || resp.isRevocable || resp.isNewAsset)
    ) {
      setShowNewAssetWarning(true);
      setNewAssetFlags(resp);
      setSuspiciousAssetData(assetRowData);
    } else {
      changeTrustline(!isTrustlineActive, () =>
        Promise.resolve(navigateTo(ROUTES.account)),
      );
    }
  };

  const handleTokenRowClick = async (
    assetRowData = {
      code: "",
      issuer: "",
      domain: "",
      image: "",
      contract: "",
    },
  ) => {
    const contractId = assetRowData.contract;
    setAssetSubmitting(canonicalAsset || contractId);
    if (!isTrustlineActive) {
      const addSac = async () => {
        const addToken = async () => {
          await dispatch(
            addTokenId({
              publicKey,
              tokenId: contractId,
              network: networkDetails.network as Networks,
            }),
          );

          navigateTo(ROUTES.account);
        };
        if (StrKey.isValidEd25519PublicKey(assetRowData.issuer)) {
          await changeTrustline(true, addToken);
        } else {
          await addToken();
        }
      };
      setHandleAddToken(() => addSac);

      if (isVerificationInfoShowing) {
        setSuspiciousAssetData({
          domain: assetRowData.domain,
          code: assetRowData.code,
          issuer: assetRowData.issuer,
          image: assetRowData.image,
          isVerifiedToken: !!isVerifiedToken,
        });
        setShowUnverifiedWarning(true);
      } else {
        await dispatch(
          addTokenId({
            publicKey,
            tokenId: contractId,
            network: networkDetails.network as Networks,
          }),
        );
        navigateTo(ROUTES.account);
      }
    } else {
      await dispatch(
        removeTokenId({
          contractId,
          network: networkDetails.network as NETWORKS,
        }),
      );
      navigateTo(ROUTES.account);
    }
  };

  useEffect(() => {
    if (submitStatus === ActionStatus.ERROR && isSigningWithHardwareWallet) {
      setIsTrustlineErrorShowing(true);
      setRowButtonShowing("");
    }
  }, [submitStatus, isSigningWithHardwareWallet]);

  return (
    <div className="ManageAssetRowButton">
      {isTrustlineActive ? (
        <div>
          <div
            className={`ManageAssetRowButton__ellipsis ${
              isActionPending
                ? `ManageAssetRowButton__ellipsis--is-pending`
                : ""
            }`}
            data-testid="ManageAssetRowButton__ellipsis"
            onClick={() => {
              if (!isActionPending) {
                setRowButtonShowing(
                  rowButtonShowing === canonicalAsset ? "" : canonicalAsset,
                );
              }
            }}
          >
            <img src={IconEllipsis} alt="icon asset options" />
          </div>
          {rowButtonShowing === canonicalAsset ? (
            <div
              className="ManageAssetRowButton__dropdown"
              ref={ManageAssetRowDropdownRef}
            >
              <div className="ManageAssetRowButton__dropdown__row">
                <CopyText textToCopy={canonicalAsset}>
                  <>
                    <div className="ManageAssetRowButton__label">
                      {t("Copy address")}
                    </div>
                    <Icon.Copy01 />
                  </>
                </CopyText>
              </div>
              <div className="ManageAssetRowButton__dropdown__row">
                <Button
                  className="ManageAssetRowButton__remove"
                  size="md"
                  variant="secondary"
                  disabled={isActionPending}
                  isLoading={
                    isActionPending && assetSubmitting === canonicalAsset
                  }
                  onClick={() => {
                    if (isContract) {
                      handleTokenRowClick({
                        code,
                        issuer,
                        image,
                        domain,
                        contract,
                      });
                    } else {
                      handleRowClick({ code, issuer, image, domain });
                    }
                  }}
                  type="button"
                  data-testid="ManageAssetRowButton"
                >
                  <div className="ManageAssetRowButton__label">
                    {t("Remove asset")}
                  </div>
                  {isActionPending &&
                  assetSubmitting === canonicalAsset ? null : (
                    <img src={IconRemove} alt="icon remove" />
                  )}
                </Button>
              </div>
              {createPortal(
                <div
                  className="ManageAssetRowButton__dropdown__background"
                  onClick={handleBackgroundClick}
                ></div>,
                document.querySelector("#modal-root")!,
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <Button
          size="md"
          variant="secondary"
          disabled={isActionPending}
          isLoading={isActionPending && assetSubmitting === canonicalAsset}
          onClick={() => {
            setAssetSubmitting(canonicalAsset || contract);
            if (isContract) {
              handleTokenRowClick({ code, issuer, image, domain, contract });
            } else {
              handleRowClick({ code, issuer, image, domain });
            }
          }}
          type="button"
          data-testid="ManageAssetRowButton"
        >
          <div className="ManageAssetRowButton__label">{t("Add")}</div>
          <img src={IconAdd} alt="icon add" />
        </Button>
      )}
      {isTrustlineErrorShowing
        ? createPortal(
            <TrustlineError
              handleClose={() => {
                setIsTrustlineErrorShowing(false);
                dispatch(resetSubmitStatus());
              }}
            />,
            document.querySelector("#modal-root")!,
          )
        : null}
    </div>
  );
};
