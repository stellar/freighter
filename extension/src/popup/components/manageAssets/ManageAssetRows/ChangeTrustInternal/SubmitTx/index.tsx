import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Networks } from "stellar-sdk";
import { Button, Icon, Loader } from "@stellar/design-system";

import {
  getCanonicalFromAsset,
  isCustomNetwork,
} from "@shared/helpers/stellar";
import { RequestState } from "constants/request";
import { AppDispatch } from "popup/App";
import { View } from "popup/basics/layout/View";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { EnterPassword } from "popup/components/EnterPassword";
import {
  addTokenId,
  confirmPassword,
  hardwareWalletTypeSelector,
  hasPrivateKeySelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { getStellarExpertUrl } from "popup/helpers/account";
import { openTab } from "popup/helpers/navigate";
import { getManageAssetXDR } from "popup/helpers/getManageAssetXDR";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { AssetIcons } from "@shared/api/types";
import { removeTokenId, startHwSign } from "popup/ducks/transactionSubmission";
import { NETWORKS } from "@shared/constants/stellar";
import { useGetChangeTrust } from "../hooks/useChangeTrust";
import { isAssetSac } from "popup/helpers/soroban";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import "./styles.scss";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { useResetChangeTrustData } from "../hooks/useResetChangeTrustData";
import { useTranslation } from "react-i18next";

interface SubmitTransactionProps {
  asset: {
    code: string;
    issuer: string;
    image: string | null;
    domain: string | null;
    contract?: string;
  };
  addTrustline: boolean;
  fee: string;
  icons: AssetIcons;
  goBack: () => void;
  onSuccess: () => void;
  onClose: () => void;
  // Fired once when the trustline transaction itself succeeds — before any
  // button press. The external Add Token flow uses this to resolve the dApp
  // request (and store the token) based on the actual transaction, not on the
  // Done button. "Done"/"View transaction" then only close / open the explorer.
  onTransactionSuccess?: () => void;
  // Hide the "close this tab" hint shown during submit: it nudges users to
  // close and leave the dApp's addToken promise hanging. The transaction itself
  // still succeeds even if they close.
  hideCloseTabHint?: boolean;
}

export const SubmitTransaction = ({
  asset,
  addTrustline,
  icons,
  fee,
  goBack,
  onSuccess,
  onClose,
  onTransactionSuccess,
  hideCloseTabHint = false,
}: SubmitTransactionProps) => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  const [isVerifyAccountModalOpen, setIsVerifyAccountModalOpen] =
    useState(!hasPrivateKey);
  const walletType = useSelector(hardwareWalletTypeSelector);

  const isHardwareWallet = !!walletType;

  const { state, fetchData } = useGetChangeTrust();
  const { state: resetChangeTrustDataState, resetChangeTrustData } =
    useResetChangeTrustData();

  const submitTransaction = async () => {
    const isSac = isAssetSac({
      asset: {
        code: asset.code,
        issuer: asset.issuer,
        contract: asset.contract,
      },
      networkDetails,
    });

    // For SEP-41 tokens, just add/remove the token ID
    // For SACs and classic assets, we need to submit a trustline transaction
    if (asset.contract && !isSac) {
      if (addTrustline) {
        await dispatch(
          addTokenId({
            publicKey,
            tokenId: asset.contract,
            network: networkDetails.network as Networks,
          }),
        );
      } else {
        await dispatch(
          removeTokenId({
            contractId: asset.contract,
            network: networkDetails.network as NETWORKS,
          }),
        );
      }
    } else {
      // Classic asset or SAC - submit trustline transaction
      const server = stellarSdkServer(
        networkDetails.networkUrl,
        networkDetails.networkPassphrase,
      );
      const xdr = await getManageAssetXDR({
        publicKey,
        assetCode: asset.code,
        assetIssuer: asset.issuer,
        addTrustline,
        server,
        recommendedFee: fee,
        networkDetails,
      });

      if (isHardwareWallet) {
        dispatch(startHwSign({ transactionXDR: xdr, shouldSubmit: true }));
      } else {
        await fetchData({ publicKey, xdr, networkDetails });
      }
    }
  };

  useEffect(() => {
    if (!isVerifyAccountModalOpen) {
      submitTransaction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVerifyAccountModalOpen]);

  const handleConfirm = async (password: string) => {
    await dispatch(confirmPassword(password));
    setIsVerifyAccountModalOpen(false);
  };

  const isLoading =
    state.state === RequestState.IDLE || state.state === RequestState.LOADING;
  const isSuccess = state.state === RequestState.SUCCESS;
  const isFail = state.state === RequestState.ERROR;

  // A trustline (changeTrust) was submitted for classic assets and SACs — not
  // for SEP-41 tokens (which take the addTokenId path above and submit no tx).
  const isTrustlineSubmit =
    !asset.contract ||
    isAssetSac({
      asset: {
        code: asset.code,
        issuer: asset.issuer,
        contract: asset.contract,
      },
      networkDetails,
    });

  // Once, when the transaction succeeds: re-emit the add/remove-asset analytics
  // the deleted useChangeTrustline used to fire, and notify the caller so the
  // dApp request resolves off the actual transaction (not the Done button).
  useEffect(() => {
    if (!isSuccess) {
      return;
    }
    if (isTrustlineSubmit) {
      emitMetric(
        addTrustline
          ? METRIC_NAMES.manageAssetAddAsset
          : METRIC_NAMES.manageAssetRemoveAsset,
        { code: asset.code, issuer: asset.issuer },
      );
    }
    onTransactionSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const canonical = getCanonicalFromAsset(
    asset.code,
    asset.contract || asset.issuer,
  );

  const icon = icons[canonical];

  if (walletType && state.state === RequestState.IDLE) {
    return (
      <View.Content hasNoTopPadding>
        <div className="SubmitTransaction__HardwareSign">
          <HardwareSign isInternal walletType={walletType} onCancel={goBack} />
        </div>
      </View.Content>
    );
  }

  return (
    <>
      {isVerifyAccountModalOpen ? (
        <EnterPassword
          accountAddress={publicKey}
          description={t(
            "Enter your account password to authorize this transaction",
          )}
          confirmButtonTitle={t("Submit")}
          onConfirm={handleConfirm}
          onCancel={goBack}
        />
      ) : (
        <View.Content
          contentFooter={
            <div className="SubmitTransaction__Footer">
              {isLoading && !hideCloseTabHint && (
                <>
                  <div className="SubmitTransaction__Footer__Subtext">
                    {t(
                      "You can close this screen, your transaction should be complete in less than a minute.",
                    )}
                  </div>
                  <Button
                    size="lg"
                    isFullWidth
                    isRounded
                    variant="tertiary"
                    onClick={(e) => {
                      e.preventDefault();
                      window.close();
                    }}
                  >
                    {t("Close")}
                  </Button>
                </>
              )}
              {!isCustomNetwork(networkDetails) && isSuccess ? (
                <>
                  <Button
                    size="lg"
                    isFullWidth
                    isRounded
                    variant="tertiary"
                    onClick={() =>
                      openTab(
                        `${getStellarExpertUrl(networkDetails)}/tx/${state.data.txHash}`,
                      )
                    }
                  >
                    {t("View transaction")}
                  </Button>
                </>
              ) : null}
              {isFail && (
                <Button
                  size="lg"
                  isFullWidth
                  isRounded
                  variant="primary"
                  onClick={async (e) => {
                    e.preventDefault();
                    await submitTransaction();
                  }}
                >
                  {t("Retry")}
                </Button>
              )}
              {(isSuccess || isFail) && (
                <div className="SubmitTransaction__Footer__Done">
                  <Button
                    size="lg"
                    isFullWidth
                    isRounded
                    variant="secondary"
                    isLoading={
                      resetChangeTrustDataState.state === RequestState.LOADING
                    }
                    onClick={async (e) => {
                      e.preventDefault();
                      await resetChangeTrustData({
                        isHardwareWallet,
                        isSuccess,
                      });
                      if (isSuccess) {
                        onSuccess();
                      } else {
                        onClose();
                      }
                    }}
                  >
                    {isSuccess ? t("Done") : t("Cancel")}
                  </Button>
                </div>
              )}
            </div>
          }
        >
          <div className="SendingTransaction">
            <div
              className="SubmitTransaction__Title"
              data-testid="SubmitTransaction__Title"
            >
              {isLoading && (
                <>
                  <Loader size="2rem" />
                  <span>{t("Submitting")}</span>
                </>
              )}
              {isSuccess && (
                <>
                  <Icon.CheckCircle
                    className="SubmitTransaction__Title__Success"
                    data-testid="SubmitTransaction__Title__Success"
                  />
                  <span>{t("Success!")}</span>
                </>
              )}
              {isFail && (
                <>
                  <Icon.XCircle className="SubmitTransaction__Title__Fail" />
                  <span>{t("Failed!")}</span>
                </>
              )}
            </div>
            <div className="SubmitTransaction__Summary">
              <div className="SubmitTransaction__Summary__Assets">
                <AssetIcon
                  assetIcons={icons}
                  code={asset.code}
                  issuerKey={asset.issuer}
                  icon={icon}
                  isSuspicious={false}
                />
              </div>
              <div className="SubmitTransaction__Summary__Description">
                <span>
                  {addTrustline
                    ? `Add ${asset.code} trustline`
                    : `Remove ${asset.code} trustline`}
                </span>
              </div>
            </div>
          </div>
        </View.Content>
      )}
    </>
  );
};
