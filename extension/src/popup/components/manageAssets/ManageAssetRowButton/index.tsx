import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { NETWORKS } from "@shared/constants/stellar";
import { Button, Icon, CopyText } from "@stellar/design-system";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Networks, StrKey } from "stellar-sdk";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";

import { getCanonicalFromAsset } from "helpers/stellar";
import { checkForSuspiciousAsset } from "popup/helpers/checkForSuspiciousAsset";
import { isAssetSuspicious, scanAsset } from "popup/helpers/blockaid";
import { useChangeTrustline } from "popup/helpers/useChangeTrustline";
import { publicKeySelector, addTokenId } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  transactionSubmissionSelector,
  removeTokenId,
  resetSubmitStatus,
} from "popup/ducks/transactionSubmission";
import { ActionStatus } from "@shared/api/types";

import { ROUTES } from "popup/constants/routes";

import IconAdd from "popup/assets/icon-add.svg";
import IconRemove from "popup/assets/icon-remove.svg";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";

import { AccountBalances } from "helpers/hooks/useGetBalances";

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
  recommendedFee: string;
  balances: AccountBalances;
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
  recommendedFee,
  balances,
}: ManageAssetRowButtonProps) => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const [rowButtonShowing, setRowButtonShowing] = useState("");
  const [isTrustlineErrorShowing, setIsTrustlineErrorShowing] = useState(false);
  const [isSigningWithHardwareWallet, setIsSigningWithHardwareWallet] =
    useState(false);
  const { submitStatus } = useSelector(transactionSubmissionSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);

  const ManageAssetRowDropdownRef = useRef<HTMLDivElement>(null);
  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );

  const { changeTrustline } = useChangeTrustline({
    assetCode: code,
    assetIssuer: issuer,
    recommendedFee,
    setAssetSubmitting,
    setIsSigningWithHardwareWallet,
    setIsTrustlineErrorShowing,
    setRowButtonShowing,
  });

  const handleBackgroundClick = () => {
    setRowButtonShowing("");
  };
  const canonicalAsset = getCanonicalFromAsset(code, issuer);

  const handleRowClick = async (
    assetRowData = {
      code: "",
      issuer: "",
      domain: "",
      image: "",
    },
  ) => {
    setAssetSubmitting(canonicalAsset);
    const resp = await checkForSuspiciousAsset({
      code: assetRowData.code,
      issuer: assetRowData.issuer,
      domain: assetRowData.domain,
      server,
      networkDetails,
    });

    const scannedAsset = await scanAsset(
      `${assetRowData.code}-${assetRowData.issuer}`,
      networkDetails,
    );

    if (isAssetSuspicious(scannedAsset) && !isTrustlineActive) {
      setShowBlockedDomainWarning(true);
      setSuspiciousAssetData({
        ...assetRowData,
        blockaidData: scannedAsset,
      });
      setAssetSubmitting("");
    } else if (
      !isTrustlineActive &&
      (resp.isInvalidDomain || resp.isRevocable)
    ) {
      setShowNewAssetWarning(true);
      setNewAssetFlags(resp);
      setSuspiciousAssetData(assetRowData);
      setAssetSubmitting("");
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

  const isLoading =
    (isActionPending && assetSubmitting === canonicalAsset) ||
    assetSubmitting === canonicalAsset;

  return (
    <div className="ManageAssetRowButton">
      {isTrustlineActive ? (
        <div>
          <div
            className={`ManageAssetRowButton__ellipsis ${
              isLoading ? `ManageAssetRowButton__ellipsis--is-pending` : ""
            }`}
            data-testid={`ManageAssetRowButton__ellipsis-${code}`}
            onClick={() => {
              if (!isLoading) {
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
                  isLoading={isLoading}
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
                  {isLoading ? null : (
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
          variant="tertiary"
          disabled={isActionPending}
          isLoading={isLoading}
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
              balances={balances}
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
