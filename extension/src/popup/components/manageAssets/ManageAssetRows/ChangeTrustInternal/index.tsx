import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";
import { BASE_FEE, Transaction, TransactionBuilder } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import {
  getCanonicalFromAsset,
  stroopToXlm,
  xlmToStroop,
} from "helpers/stellar";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { useValidateTransactionMemo } from "popup/helpers/useValidateTransactionMemo";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import StellarLogo from "popup/assets/stellar-logo.png";
import { Summary } from "popup/views/SignTransaction/Preview/Summary";
import { Details } from "popup/views/SignTransaction/Preview/Details";
import { OPERATION_TYPES, TRANSACTION_WARNING } from "constants/transaction";
import { Trustline } from "popup/views/SignTransaction";
import {
  BlockAidAssetScanExpanded,
  BlockaidAssetWarning,
} from "popup/components/WarningMessages";
import { useGetChangeTrustData } from "./hooks/useChangeTrustData";
import { Fee } from "./Settings/Fee";
import { Timeout } from "./Settings/Timeout";
import { Memo } from "./Settings/Memo";
import { SubmitTransaction } from "./SubmitTx";

import "./styles.scss";

enum ActiveBodyContent {
  details = "details",
  fee = "fee",
  timeout = "timeout",
  memo = "memo",
  submitTx = "submit-tx",
}

interface ChangeTrustInternalProps {
  asset: {
    code: string;
    issuer: string;
    image: string;
    domain: string;
    contract?: string;
  };
  networkDetails: NetworkDetails;
  publicKey: string;
  addTrustline: boolean;
  onCancel: () => void;
}

export const ChangeTrustInternal = ({
  asset,
  addTrustline,
  publicKey,
  networkDetails,
  onCancel,
}: ChangeTrustInternalProps) => {
  const activeOptionsRef = useRef<HTMLDivElement>(null);
  const [activePaneIndex, setActivePaneIndex] = useState(0);
  const [activeBodyContent, setActiveBodyContent] = useState(
    ActiveBodyContent.details,
  );
  const { t } = useTranslation();
  const { recommendedFee } = useNetworkFees();

  const baseFeeStroops = stroopToXlm(BASE_FEE).toString();
  const [fee, setFee] = useState(baseFeeStroops);
  const [timeout, setTimeout] = useState("180");
  const [memo, setMemo] = useState("");
  const [isSettingsSelectorOpen, setSettingsSelectorOpen] =
    React.useState(false);

  const { state } = useGetChangeTrustData({
    asset,
    assetImage: asset.image,
    addTrustline,
    publicKey,
    networkDetails,
    recommendedFee: BASE_FEE,
  });

  // Get XDR early for hook (may be undefined if state not ready)
  const xdr = state.data?.transactionXDR;

  // Use the hook to validate memo requirements - must be called before early returns
  const { isMemoMissing: isMemoMissingFromHook, isValidatingMemo } =
    useValidateTransactionMemo(xdr);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        activeOptionsRef.current &&
        !activeOptionsRef.current.contains(event.target as Node)
      ) {
        setSettingsSelectorOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeOptionsRef]);

  if (
    state.state === RequestState.LOADING ||
    state.state === RequestState.IDLE
  ) {
    return (
      <div data-testid="ChangeTrustInternal" className="ChangeTrustInternal">
        <div className="ChangeTrustInternal__Loading">
          <Loader size="2rem" />
        </div>
      </div>
    );
  }

  if (state.state === RequestState.ERROR) {
    return (
      <div data-testid="ChangeTrustInternal" className="ChangeTrustInternal">
        <div className="ChangeTrustInternal__Error">
          <Notification
            variant="error"
            title={t("Failed to build transaction.")}
          >
            {t("An unknown error has occured while building this transaction.")}
          </Notification>
        </div>
      </div>
    );
  }

  const canonical = getCanonicalFromAsset(asset.code, asset.issuer);
  // After early returns, we know state.data is defined, so xdr is defined
  const xdrDefined = state.data.transactionXDR;
  const flaggedKeys = state.data.flaggedKeys;
  const icons = { [canonical]: asset.image };

  let sequence = "";
  const transaction = TransactionBuilder.fromXDR(
    xdrDefined,
    networkDetails.networkPassphrase,
  ) as Transaction;
  if (!("innerTransaction" in transaction)) {
    sequence = transaction.sequence;
  }

  const flaggedKeyValues = Object.values(flaggedKeys);
  const isMemoRequiredFromFlaggedKeys = flaggedKeyValues.some(
    ({ tags }) => tags.includes(TRANSACTION_WARNING.memoRequired) && !memo,
  );

  // Combine both validation methods - use hook result if available, fallback to flaggedKeys
  const isMemoRequired = isValidatingMemo
    ? isMemoRequiredFromFlaggedKeys
    : isMemoMissingFromHook || isMemoRequiredFromFlaggedKeys;
  const operations = transaction.operations;
  const trustlineChanges = transaction.operations.filter(
    (op) => op.type === "changeTrust",
  );

  return (
    <div data-testid="ChangeTrustInternal" className="ChangeTrustInternal">
      {activeBodyContent === ActiveBodyContent.details && (
        <MultiPaneSlider
          activeIndex={activePaneIndex}
          panes={[
            <div
              className="ChangeTrustInternal__Body"
              data-testid="ChangeTrustInternal__Body"
            >
              <div className="ChangeTrustInternal__Body__Wrapper">
                <div
                  className="ChangeTrustInternal__TitleRow"
                  data-testid="ChangeTrustInternal__TitleRow"
                >
                  <img src={StellarLogo} alt="Stellar Logo" />
                  <div className="ChangeTrustInternal__TitleRow__Detail">
                    <span className="ChangeTrustInternal__TitleRow__Title">
                      Confirm Transaction
                    </span>
                    <span
                      className="SignTransaction__TitleRow__Domain"
                      data-testid="ChangeTrustInternal__TitleRow__Domain"
                    >
                      {asset.domain}
                    </span>
                  </div>
                </div>
                {state.data.isAssetSuspicious && (
                  <BlockaidAssetWarning
                    blockaidData={state.data.scanResult}
                    onClick={() => setActivePaneIndex(2)}
                  />
                )}
                {trustlineChanges.length > 0 && (
                  <Trustline operations={trustlineChanges} icons={icons} />
                )}
                <div className="ChangeTrustInternal__Metadata">
                  <div className="ChangeTrustInternal__Metadata__Row">
                    <div className="ChangeTrustInternal__Metadata__Label">
                      <Icon.Wallet01 />
                      <span>Wallet</span>
                    </div>
                    <div className="ChangeTrustInternal__Metadata__Value">
                      <KeyIdenticon publicKey={publicKey} />
                    </div>
                  </div>
                  <div className="ChangeTrustInternal__Metadata__Row">
                    <div
                      className="ChangeTrustInternal__Metadata__Label"
                      data-testid="ChangeTrustInternal__Metadata__Label__Fee"
                    >
                      <Icon.Route />
                      <span>Fee</span>
                    </div>
                    <div
                      className="ChangeTrustInternal__Metadata__Value"
                      data-testid="ChangeTrustInternal__Metadata__Value__Fee"
                    >
                      <span>{`${fee} XLM`}</span>
                    </div>
                  </div>
                </div>
                <div
                  className="ChangeTrustInternal__TransactionDetailsBtn"
                  onClick={() => setActivePaneIndex(1)}
                >
                  <Icon.List />
                  <span>Transaction details</span>
                </div>
              </div>
            </div>,
            <div className="ChangeTrustInternal__Body">
              <div className="ChangeTrustInternal__Body__Wrapper">
                <div className="ChangeTrustInternal__TransactionDetails">
                  <div className="ChangeTrustInternal__TransactionDetails__Header">
                    <div className="DetailsMark">
                      <Icon.List />
                    </div>
                    <div
                      className="Close"
                      onClick={() => setActivePaneIndex(0)}
                    >
                      <Icon.X />
                    </div>
                  </div>
                  <div className="ChangeTrustInternal__TransactionDetails__Title">
                    <span>Transaction Details</span>
                  </div>
                  <div className="ChangeTrustInternal__TransactionDetails__Summary">
                    <Summary
                      sequenceNumber={sequence}
                      fee={xlmToStroop(fee).toString()}
                      memo={{ value: memo, type: "text" }}
                      xdr={xdrDefined}
                      operationNames={operations.map(
                        (op) => OPERATION_TYPES[op.type] || op.type,
                      )}
                    />
                  </div>
                  <Details
                    operations={operations}
                    flaggedKeys={flaggedKeys}
                    isMemoRequired={isMemoRequired}
                  />
                </div>
              </div>
            </div>,
            <BlockAidAssetScanExpanded
              scanResult={state.data.scanResult}
              onClose={() => setActivePaneIndex(0)}
            />,
          ]}
        />
      )}
      {activeBodyContent === ActiveBodyContent.fee && (
        <Fee
          fee={fee}
          onSaveFee={setFee}
          recommendedFee={recommendedFee}
          goBack={() => setActiveBodyContent(ActiveBodyContent.details)}
        />
      )}
      {activeBodyContent === ActiveBodyContent.timeout && (
        <Timeout
          timeout={timeout}
          onSave={setTimeout}
          goBack={() => setActiveBodyContent(ActiveBodyContent.details)}
        />
      )}
      {activeBodyContent === ActiveBodyContent.memo && (
        <Memo
          memo={memo}
          onSave={setMemo}
          goBack={() => setActiveBodyContent(ActiveBodyContent.details)}
        />
      )}
      {activeBodyContent === ActiveBodyContent.submitTx && (
        <SubmitTransaction
          asset={asset}
          addTrustline={addTrustline}
          icons={icons}
          fee={fee}
          goBack={() => setActiveBodyContent(ActiveBodyContent.details)}
          onSuccess={onCancel}
        />
      )}
      {activeBodyContent === ActiveBodyContent.details && (
        <div className="ChangeTrustInternal__Actions">
          <div className="ChangeTrustInternal__Actions__BtnRow">
            {isSettingsSelectorOpen ? (
              <div
                className="ChangeTrustInternal__options-actions"
                ref={activeOptionsRef}
              >
                <div
                  className="ChangeTrustInternal__options-actions__row"
                  onClick={() => setActiveBodyContent(ActiveBodyContent.fee)}
                >
                  <div className="action-copy">
                    <div className="ChangeTrustInternal__options-actions__label">
                      Fee: {`${fee} XLM`}
                    </div>
                    <Icon.Route />
                  </div>
                </div>
                <div
                  className="ChangeTrustInternal__options-actions__row"
                  onClick={() =>
                    setActiveBodyContent(ActiveBodyContent.timeout)
                  }
                >
                  <div className="action-copy">
                    <div className="ChangeTrustInternal__options-actions__label">
                      Timeout: {`${timeout}(s)`}
                    </div>
                    <Icon.Clock />
                  </div>
                </div>
                <div
                  className="ChangeTrustInternal__options-actions__row"
                  onClick={() => setActiveBodyContent(ActiveBodyContent.memo)}
                >
                  <div className="action-copy">
                    <div className="ChangeTrustInternal__options-actions__label">
                      Memo
                    </div>
                    <Icon.File02 />
                  </div>
                </div>
              </div>
            ) : null}
            <Button
              isRounded
              size="lg"
              variant="tertiary"
              onClick={() => setSettingsSelectorOpen(true)}
            >
              <Icon.Settings04 />
            </Button>
            <Button
              isFullWidth
              isRounded
              size="lg"
              variant="tertiary"
              onClick={onCancel}
            >
              {t("Cancel")}
            </Button>
            <Button
              variant="secondary"
              isFullWidth
              isRounded
              size="lg"
              onClick={() => setActiveBodyContent(ActiveBodyContent.submitTx)}
            >
              {t("Confirm")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
