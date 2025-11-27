import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button, Icon, Notification } from "@stellar/design-system";

import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState, State } from "constants/request";
import {
  ShowOverlayStatus,
  startHwSign,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import {
  getAssetFromCanonical,
  isMainnet,
  isMuxedAccount,
  truncatedFedAddress,
  truncatedPublicKey,
} from "helpers/stellar";

import { SimulateTxData } from "popup/components/sendPayment/SendAmount/hooks/useSimulateTxData";
import { View } from "popup/basics/layout/View";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import {
  BlockaidTxScanLabel,
  BlockAidTxScanExpanded,
} from "popup/components/WarningMessages";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { hardwareWalletTypeSelector } from "popup/ducks/accountServices";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";
import { CopyValue } from "popup/components/CopyValue";

import "./styles.scss";

interface ReviewTxProps {
  assetIcon: string | null;
  dstAsset?: {
    icon: string | null;
    canonical: string;
    priceUsd: string | null;
    amount: string;
  };
  fee: string;
  sendAmount: string;
  sendPriceUsd: string | null;
  srcAsset: string;
  simulationState: State<SimulateTxData, string>;
  networkDetails: NetworkDetails;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ReviewTx = ({
  assetIcon,
  dstAsset,
  fee,
  srcAsset,
  sendAmount,
  sendPriceUsd,
  simulationState,
  networkDetails,
  title,
  onConfirm,
  onCancel,
}: ReviewTxProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const submission = useSelector(transactionSubmissionSelector);
  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!hardwareWalletType;

  const [activePaneIndex, setActivePaneIndex] = useState(0);

  const {
    hardwareWalletData: { status: hwStatus },
    transactionData: { destination, memo, federationAddress },
  } = submission;

  const asset = getAssetFromCanonical(srcAsset);
  const dest = dstAsset ? getAssetFromCanonical(dstAsset.canonical) : null;
  const assetIcons = srcAsset !== "native" ? { [srcAsset]: assetIcon } : {};
  const truncatedDest = federationAddress
    ? truncatedFedAddress(federationAddress)
    : truncatedPublicKey(destination);
  const isRecipientMuxed = destination ? isMuxedAccount(destination) : false;

  if (simulationState.state === RequestState.ERROR) {
    return (
      <View.Content hasNoTopPadding>
        <div className="ReviewTx">
          <Notification
            variant="error"
            title={t("Failed to fetch your transaction details")}
          >
            {simulationState.error}
          </Notification>
        </div>
      </View.Content>
    );
  }

  const onConfirmTx = () => {
    if (isHardwareWallet) {
      dispatch(
        startHwSign({
          transactionXDR: simulationState.data!.transactionXdr,
          shouldSubmit: true,
        }),
      );
      return;
    }
    onConfirm();
  };

  return (
    <View.Content hasNoTopPadding>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && hardwareWalletType ? (
        <HardwareSign
          isInternal
          walletType={hardwareWalletType}
          onSubmit={onConfirm}
        />
      ) : (
        <div className="ReviewTx">
          <MultiPaneSlider
            activeIndex={activePaneIndex}
            panes={[
              <>
                <div className="ReviewTx__Summary">
                  <p>{title}</p>
                  <div className="ReviewTx__SendSummary">
                    <div className="ReviewTx__SendAsset">
                      <AssetIcon
                        assetIcons={assetIcons}
                        code={asset.code}
                        issuerKey={asset.issuer}
                        icon={assetIcon}
                        isSuspicious={false}
                      />
                      <div
                        className="ReviewTx__SendAssetDetails"
                        data-testid="review-tx-send-amount"
                      >
                        <span>
                          {sendAmount} {asset.code}
                        </span>
                        {isMainnet(networkDetails) && sendPriceUsd && (
                          <span className="ReviewTx__SendAssetDetails__price">
                            {`$${sendPriceUsd}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ReviewTx__Divider">
                      <Icon.ChevronDownDouble />
                    </div>
                    <div
                      className="ReviewTx__SendDestination"
                      data-testid="review-tx-send-destination"
                    >
                      {dstAsset && dest ? (
                        <>
                          <AssetIcon
                            assetIcons={
                              dstAsset.canonical !== "native"
                                ? { [dstAsset.canonical]: dstAsset.icon }
                                : {}
                            }
                            code={dest.code}
                            issuerKey={dest.issuer}
                            icon={dstAsset.icon}
                            isSuspicious={false}
                          />
                          <div className="ReviewTx__SendAssetDetails">
                            <span>
                              {dstAsset.amount} {dest.code}
                            </span>
                            {isMainnet(networkDetails) && dstAsset.priceUsd && (
                              <span className="ReviewTx__SendAssetDetails__price">
                                {`$${dstAsset.priceUsd}`}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <IdenticonImg publicKey={destination} />
                          <div className="ReviewTx__SendDestinationDetails">
                            {truncatedDest}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ReviewTx__Warnings">
                  {simulationState.data?.scanResult && (
                    <BlockaidTxScanLabel
                      scanResult={simulationState.data?.scanResult}
                      onClick={() => setActivePaneIndex(1)}
                    />
                  )}
                </div>
                <div className="ReviewTx__Details">
                  {!isRecipientMuxed && (
                    <div className="ReviewTx__Details__Row">
                      <div className="ReviewTx__Details__Row__Title">
                        <Icon.File02 />
                        Memo
                      </div>
                      <div
                        className="ReviewTx__Details__Row__Value"
                        data-testid="review-tx-memo"
                      >
                        {memo || "None"}
                      </div>
                    </div>
                  )}
                  <div className="ReviewTx__Details__Row">
                    <div className="ReviewTx__Details__Row__Title">
                      <Icon.Route />
                      Fee
                    </div>
                    <div
                      className="ReviewTx__Details__Row__Value"
                      data-testid="review-tx-fee"
                    >
                      {fee} XLM
                    </div>
                  </div>
                  <div className="ReviewTx__Details__Row">
                    <div className="ReviewTx__Details__Row__Title">
                      <Icon.FileCode02 />
                      XDR
                    </div>
                    <div className="ReviewTx__Details__Row__Value">
                      <CopyValue
                        value={simulationState.data!.transactionXdr}
                        displayValue={simulationState.data!.transactionXdr}
                      />
                    </div>
                  </div>
                </div>
              </>,
              <BlockAidTxScanExpanded
                scanResult={simulationState.data?.scanResult!}
                onClose={() => setActivePaneIndex(0)}
              />,
            ]}
          />
          <div className="ReviewTx__Actions">
            <Button
              size="lg"
              isFullWidth
              isRounded
              variant="secondary"
              data-testid="SubmitAction"
              onClick={(e) => {
                e.preventDefault();
                onConfirmTx();
              }}
            >
              {dstAsset && dest
                ? `Swap ${asset.code} to ${dest.code}`
                : `Send to ${truncatedDest}`}
            </Button>
            <Button
              size="lg"
              isFullWidth
              isRounded
              variant="tertiary"
              onClick={(e) => {
                e.preventDefault();
                onCancel();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </View.Content>
  );
};
