import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button, Icon, Loader } from "@stellar/design-system";

import { isCustomNetwork } from "@shared/helpers/stellar";
import { ActionStatus } from "@shared/api/types";
import { RequestState } from "constants/request";
import { getAssetFromCanonical, truncatedPublicKey } from "helpers/stellar";
import { AppDispatch } from "popup/App";
import { View } from "popup/basics/layout/View";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { EnterPassword } from "popup/components/EnterPassword";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { useSubmitTxData } from "./hooks/useSubmitTxData";
import { ROUTES } from "popup/constants/routes";
import {
  confirmPassword,
  hardwareWalletTypeSelector,
  hasPrivateKeySelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import { getStellarExpertUrl } from "popup/helpers/account";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { SubmitFail } from "../SubmitFail";

import "./styles.scss";
import { iconsSelector } from "popup/ducks/cache";

interface SendingTransactionProps {
  xdr: string;
  goBack: () => void;
}

export const SendingTransaction = ({
  xdr,
  goBack,
}: SendingTransactionProps) => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const submission = useSelector(transactionSubmissionSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);
  const icons = useSelector(iconsSelector);
  const [isVerifyAccountModalOpen, setIsVerifyAccountModalOpen] =
    useState(!hasPrivateKey);

  const {
    transactionData: {
      amount,
      asset,
      destination,
      destinationAsset,
      destinationAmount,
    },
    response,
  } = submission;
  const transactionHash = response?.hash;
  const srcAsset = getAssetFromCanonical(asset);
  const dstAsset = destinationAsset
    ? getAssetFromCanonical(destinationAsset)
    : null;

  const { state: submissionState, fetchData } = useSubmitTxData({
    publicKey,
    networkDetails,
    xdr,
    isHardwareWallet,
  });

  useEffect(() => {
    const getData = async () => {
      await fetchData({
        isSwap,
      });
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

  const isSwap = Boolean(destinationAsset);
  const isLoading =
    submissionState.state === RequestState.IDLE ||
    submissionState.state === RequestState.LOADING;
  const isSuccess = submissionState.state === RequestState.SUCCESS;
  const assetIcon = icons[asset]!;
  const assetIcons = asset !== "native" ? { [asset]: assetIcon } : {};
  const dstAssetIcon = icons[destinationAsset]!;
  const dstAssetIcons =
    asset !== "native" ? { [destinationAsset]: dstAssetIcon } : {};

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
            <div className="SendingTransaction__Footer">
              {isLoading && (
                <>
                  <div className="SendingTransaction__Footer__Subtext">
                    You can close this screen, your transaction should be
                    complete in less than a minute.
                  </div>
                  <Button
                    size="md"
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
                    size="md"
                    isFullWidth
                    isRounded
                    variant="tertiary"
                    onClick={() =>
                      openTab(
                        `${getStellarExpertUrl(networkDetails)}/tx/${transactionHash}`,
                      )
                    }
                  >
                    View transaction
                  </Button>
                </>
              ) : null}
              {isSuccess && (
                <div className="SendingTransaction__Footer__Done">
                  <Button
                    size="md"
                    isFullWidth
                    isRounded
                    variant="secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo(ROUTES.account, navigate);
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
            <div className="SendingTransaction__Title">
              {isLoading ? (
                <>
                  <Loader size="2rem" />
                  <span>{isSwap ? "Swapping" : "Sending"}</span>
                </>
              ) : (
                <>
                  <Icon.CheckCircle className="SendingTransaction__Title__Success" />
                  <span>{isSwap ? "Swapped!" : "Sent!"}</span>
                </>
              )}
            </div>
            <div className="SendingTransaction__Summary">
              <div className="SendingTransaction__Summary__Assets">
                <AssetIcon
                  assetIcons={assetIcons}
                  code={srcAsset.code}
                  issuerKey={srcAsset.issuer}
                  icon={assetIcon}
                  isSuspicious={false}
                />
                <div className="SendingTransaction__Summary__Assets__Divider">
                  <Icon.ChevronRightDouble />
                </div>
                {isSwap && dstAsset ? (
                  <AssetIcon
                    assetIcons={dstAssetIcons}
                    code={dstAsset.code}
                    issuerKey={dstAsset.issuer}
                    icon={dstAssetIcon}
                    isSuspicious={false}
                  />
                ) : (
                  <IdenticonImg publicKey={destination} />
                )}
              </div>
              <div className="SendingTransaction__Summary__Description">
                {isLoading && (
                  <>
                    {amount} {srcAsset.code}{" "}
                    {isSwap && dstAsset ? (
                      <>
                        <span className="SendingTransaction__Summary__Description__Label">
                          to
                        </span>{" "}
                        {destinationAmount} {dstAsset.code}
                      </>
                    ) : (
                      <>
                        <span className="SendingTransaction__Summary__Description__Label">
                          to
                        </span>{" "}
                        {truncatedPublicKey(destination)}
                      </>
                    )}
                  </>
                )}
                {isSuccess && (
                  <>
                    {amount} {srcAsset.code}{" "}
                    {isSwap && dstAsset ? (
                      <>
                        <span className="SendingTransaction__Summary__Description__Label">
                          was swapped to
                        </span>{" "}
                        {destinationAmount} {dstAsset.code}
                      </>
                    ) : (
                      <>
                        <span className="SendingTransaction__Summary__Description__Label">
                          was sent to
                        </span>{" "}
                        {truncatedPublicKey(destination)}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </View.Content>
      )}
    </>
  );
};

export const TransactionConfirm = ({
  xdr,
  goBack,
}: {
  xdr: string;
  goBack: () => void;
}) => {
  const submission = useSelector(transactionSubmissionSelector);

  const render = () => {
    switch (submission.submitStatus) {
      case ActionStatus.ERROR:
        return <SubmitFail />;
      case ActionStatus.IDLE:
      case ActionStatus.PENDING:
      case ActionStatus.SUCCESS:
      default:
        return <SendingTransaction xdr={xdr} goBack={goBack} />;
    }
  };

  return render();
};
