import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  confirmPassword,
  hasPrivateKeySelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { getStellarExpertUrl } from "popup/helpers/account";
import { openTab } from "popup/helpers/navigate";
import { getManageAssetXDR } from "popup/helpers/getManageAssetXDR";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { AssetIcons } from "@shared/api/types";
import { useGetChangeTrust } from "../hooks/useChangeTrust";

import "./styles.scss";

interface SubmitTransactionProps {
  assetCode: string;
  assetIssuer: string;
  addTrustline: boolean;
  fee: string;
  icons: AssetIcons;
  goBack: () => void;
  onSuccess: () => void;
}

export const SubmitTransaction = ({
  assetCode,
  assetIssuer,
  addTrustline,
  icons,
  fee,
  goBack,
  onSuccess,
}: SubmitTransactionProps) => {
  const dispatch: AppDispatch = useDispatch();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  const [isVerifyAccountModalOpen, setIsVerifyAccountModalOpen] =
    useState(!hasPrivateKey);

  const { state, fetchData } = useGetChangeTrust();

  useEffect(() => {
    const getData = async () => {
      const server = stellarSdkServer(
        networkDetails.networkUrl,
        networkDetails.networkPassphrase,
      );
      const xdr = await getManageAssetXDR({
        publicKey,
        assetCode,
        assetIssuer,
        addTrustline,
        server,
        recommendedFee: fee,
        networkDetails,
      });
      await fetchData({ publicKey, xdr, networkDetails });
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

  const canonical = getCanonicalFromAsset(assetCode, assetIssuer);
  const icon = icons[canonical];

  return (
    <>
      {isVerifyAccountModalOpen ? (
        <EnterPassword
          accountAddress={publicKey}
          description={
            "Enter your account password to authorize this transaction."
          }
          confirmButtonTitle={"Submit"}
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
                    You can close this screen, your transaction should be
                    complete in less than a minute.
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
                    Close
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
                    View transaction
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
                    onClick={(e) => {
                      e.preventDefault();
                      onSuccess();
                    }}
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>
          }
        >
          <div className="SendingTransaction">
            <div className="SubmitTransaction__Title">
              {isLoading && (
                <>
                  <Loader size="2rem" />
                  <span>Submitting</span>
                </>
              )}
              {isSuccess && (
                <>
                  <Icon.CheckCircle className="SubmitTransaction__Title__Success" />
                  <span>Success!</span>
                </>
              )}
              {isFail && (
                <>
                  <Icon.CheckCircle className="SubmitTransaction__Title__Fail" />
                  <span>Failed!</span>
                </>
              )}
            </div>
            <div className="SubmitTransaction__Summary">
              <div className="SubmitTransaction__Summary__Assets">
                <AssetIcon
                  assetIcons={icons}
                  code={assetCode}
                  issuerKey={assetIssuer}
                  icon={icon}
                  isSuspicious={false}
                />
              </div>
              <div className="SubmitTransaction__Summary__Description">
                <span>
                  {addTrustline ? "Add trustline" : "Remove trustline"}
                </span>
              </div>
            </div>
          </div>
        </View.Content>
      )}
    </>
  );
};
