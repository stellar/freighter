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

import "./styles.scss";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { useResetChangeTrustData } from "../hooks/useResetChangeTrustData";

interface SubmitTransactionProps {
  asset: {
    code: string;
    issuer: string;
    image: string | null;
    domain: string;
    contract?: string;
  };
  addTrustline: boolean;
  fee: string;
  icons: AssetIcons;
  goBack: () => void;
  onSuccess: () => void;
}

export const SubmitTransaction = ({
  asset,
  addTrustline,
  icons,
  fee,
  goBack,
  onSuccess,
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

  useEffect(() => {
    const getData = async () => {
      if (asset.contract) {
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
    if (!isVerifyAccountModalOpen) {
      getData();
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
              {isLoading && (
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
                      onSuccess();
                    }}
                  >
                    {t("Done")}
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
                  <span>Success!</span>
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
