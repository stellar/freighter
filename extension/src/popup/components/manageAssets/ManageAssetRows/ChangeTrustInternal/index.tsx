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
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { View } from "popup/basics/layout/View";
import StellarLogo from "popup/assets/stellar-logo.png";
import { Summary } from "popup/views/SignTransaction/Preview/Summary";
import { Details } from "popup/views/SignTransaction/Preview/Details";
import { OPERATION_TYPES, TRANSACTION_WARNING } from "constants/transaction";
import { Trustline } from "popup/views/SignTransaction";
import { BlockAidAssetScanExpanded } from "popup/components/WarningMessages";
import { BlockaidBanner } from "popup/components/BlockaidBanner";
import { SecurityLevel } from "popup/constants/blockaid";
import {
  useBlockaidOverrideState,
  getAssetSecurityLevel,
} from "popup/helpers/blockaid";
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
    image: string | null;
    domain: string | null;
    contract?: string;
  };
  networkDetails: NetworkDetails;
  publicKey: string;
  addTrustline: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  // Fired once when the trustline transaction succeeds (before any button).
  // The external Add Token flow resolves the dApp request here so the response
  // tracks the actual transaction rather than the Done button.
  onTransactionSuccess?: () => void;
  // Dismiss after a FAILED submit. Defaults to onCancel; the external Add Token
  // flow passes a handler that rejects the dApp request so it doesn't hang.
  onClose?: () => void;
  // Initial fee (in XLM) for the transaction. The external Add Token (SAC)
  // flow passes the network-recommended fee it already displayed so the
  // charged fee matches the disclosed one. Defaults to the base fee.
  initialFee?: string;
  // When rendered as a full popup view (the external Add Token flow) rather
  // than inside the content-sized in-app modal, fill the available height so
  // the action buttons / submit footer pin to the bottom instead of floating.
  isFullHeight?: boolean;
}

export const ChangeTrustInternal = ({
  asset,
  addTrustline,
  publicKey,
  networkDetails,
  onCancel,
  onSuccess,
  onTransactionSuccess,
  onClose,
  initialFee,
  isFullHeight = false,
}: ChangeTrustInternalProps) => {
  const rootClassName = `ChangeTrustInternal${
    isFullHeight ? " ChangeTrustInternal--standalone" : ""
  }`;
  const activeOptionsRef = useRef<HTMLDivElement>(null);
  const [activePaneIndex, setActivePaneIndex] = useState(0);
  // The expanded Blockaid "Do not proceed" sheet renders in-flow (replacing the
  // body in place) rather than as a horizontal slider pane. Its own boolean
  // gate keeps it out of the slider.
  const [isOnBlockaidSheet, setIsOnBlockaidSheet] = useState(false);
  const [activeBodyContent, setActiveBodyContent] = useState(
    ActiveBodyContent.details,
  );
  const { t } = useTranslation();

  // Check override state (takes precedence, dev mode only)
  const blockaidOverrideState = useBlockaidOverrideState();
  const { recommendedFee } = useNetworkFees();

  const baseFeeStroops = stroopToXlm(BASE_FEE).toString();
  const [fee, setFee] = useState(initialFee ?? baseFeeStroops);
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
    recommendedFee: fee,
  });

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
      <div data-testid="ChangeTrustInternal" className={rootClassName}>
        <div className="ChangeTrustInternal__Loading">
          <Loader size="2rem" />
        </div>
      </div>
    );
  }

  if (state.state === RequestState.ERROR) {
    return (
      <div data-testid="ChangeTrustInternal" className={rootClassName}>
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

  // Check if memo is required based on flaggedKeys (populated by background script)
  // flaggedKeys is already validated when the transaction is built, so no need to re-validate
  const isMemoRequired = Object.values(flaggedKeys).some(
    ({ tags }) => tags.includes(TRANSACTION_WARNING.memoRequired) && !memo,
  );
  const operations = transaction.operations;
  const trustlineChanges = transaction.operations.filter(
    (op) => op.type === "changeTrust",
  );

  // Determine if asset is malicious (Malicious result_type takes precedence over overrides)
  const isMalicious =
    state.data?.scanResult?.result_type === "Malicious" ||
    blockaidOverrideState === SecurityLevel.MALICIOUS;

  // Determine if blockaid warnings should be shown.
  // shouldTreatAssetAsUnableToScan applies the network gate (only mainnet),
  // so we no longer need to AND with isMainnet here.
  const shouldShowBlockaidWarning =
    state.data &&
    (isMalicious ||
      state.data.isAssetSuspicious ||
      state.data.isAssetUnableToScan);

  /**
   * Horizontal slider panes (Blockaid renders in-flow via isOnBlockaidSheet,
   * not as a slider pane):
   * - [Confirm Transaction, Details]
   */
  const paneConfig = {
    confirmIndex: 0,
    detailsIndex: 1,
  };

  // Build panes in order (no hooks on JSX)
  const panes: React.ReactNode[] = [];

  // Blockaid expanded sheet — rendered in-flow, not as a slider pane.
  const blockaidPane = (
    <BlockAidAssetScanExpanded
      scanResult={state.data.scanResult}
      onClose={() => {
        setIsOnBlockaidSheet(false);
      }}
    />
  );

  // Confirm Transaction pane
  const confirmPane = (
    <div
      className="ChangeTrustInternal__Body"
      data-testid="ChangeTrustInternal__Body"
    >
      <div className="ChangeTrustInternal__Body__Wrapper">
        <div
          className="ChangeTrustInternal__TitleRow"
          data-testid="ChangeTrustInternal__TitleRow"
        >
          <img src={StellarLogo} alt={t("Stellar Logo")} />
          <div className="ChangeTrustInternal__TitleRow__Detail">
            <span className="ChangeTrustInternal__TitleRow__Title">
              {t("Confirm Transaction")}
            </span>
            <span
              className="SignTransaction__TitleRow__Domain"
              data-testid="ChangeTrustInternal__TitleRow__Domain"
            >
              {asset.domain}
            </span>
          </div>
        </div>
        <BlockaidBanner
          securityLevel={getAssetSecurityLevel({
            blockaidData: state.data.scanResult,
            blockaidOverrideState,
            networkDetails,
          })}
          entity="token"
          onClick={() => setIsOnBlockaidSheet(true)}
          dataTestId="blockaid-banner-change-trust"
        />
        {trustlineChanges.length > 0 && (
          <Trustline operations={trustlineChanges} icons={icons} />
        )}
        <div className="ChangeTrustInternal__Metadata">
          <div className="ChangeTrustInternal__Metadata__Row">
            <div className="ChangeTrustInternal__Metadata__Label">
              <Icon.Wallet01 />
              <span>{t("Wallet")}</span>
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
              <span>{t("Fee")}</span>
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
          onClick={() => setActivePaneIndex(paneConfig.detailsIndex)}
        >
          <Icon.List />
          <span>{t("Transaction details")}</span>
        </div>
      </div>
    </div>
  );

  // Transaction details pane
  const detailsPane = (
    <div className="ChangeTrustInternal__Body">
      <div className="ChangeTrustInternal__Body__Wrapper">
        <div className="ChangeTrustInternal__TransactionDetails">
          <div className="ChangeTrustInternal__TransactionDetails__Header">
            <div className="DetailsMark">
              <Icon.List />
            </div>
            <div
              className="Close"
              onClick={() => setActivePaneIndex(paneConfig.confirmIndex)}
            >
              <Icon.X />
            </div>
          </div>
          <div className="ChangeTrustInternal__TransactionDetails__Title">
            <span>{t("Transaction Details")}</span>
          </div>
          <div className="ChangeTrustInternal__TransactionDetails__Summary">
            <Summary
              sequenceNumber={sequence}
              fee={xlmToStroop(fee).toString()}
              memo={{ value: memo, type: "text" }}
              xdr={xdrDefined}
              operationNames={operations.map(
                (op) =>
                  OPERATION_TYPES[op.type as keyof typeof OPERATION_TYPES] ||
                  op.type,
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
    </div>
  );

  // Build slider panes in order (Blockaid sheet is rendered in-flow, not here)
  panes.push(confirmPane, detailsPane);

  // Button rendering functions
  const renderBlockaidPaneButtons = () => (
    <>
      <Button
        isFullWidth
        isRounded
        size="lg"
        variant={isMalicious ? "destructive" : "secondary"}
        onClick={(e) => {
          e.preventDefault();
          setIsOnBlockaidSheet(false);
        }}
      >
        {t("Cancel")}
      </Button>
      <button
        type="button"
        className={`ReviewTx__TextAction ReviewTx__TextAction--${
          isMalicious ? "error" : "default"
        }`}
        onClick={(e) => {
          e.preventDefault();
          setIsOnBlockaidSheet(false);
        }}
      >
        {t("Continue")}
      </button>
    </>
  );

  const renderBlockaidWarningButtons = () => (
    <>
      <Button
        isFullWidth
        isRounded
        size="lg"
        variant={isMalicious ? "destructive" : "secondary"}
        onClick={onCancel}
      >
        {t("Cancel")}
      </Button>
      <button
        type="button"
        className={`ReviewTx__TextAction ReviewTx__TextAction--${
          isMalicious ? "error" : "default"
        }`}
        onClick={(e) => {
          e.preventDefault();
          setActiveBodyContent(ActiveBodyContent.submitTx);
        }}
      >
        {t("Confirm anyway")}
      </button>
    </>
  );

  const renderSafeCaseButtons = () => (
    <>
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
    </>
  );

  // The fee / timeout / memo / submit-tx panes are self-contained sub-screens
  // that render their own <View.Content> (and header/footer). Only the
  // "details" pane relies on this wrapper's inset for its horizontal padding.
  // Suppress this wrapper's padding for self-contained panes to avoid doubling
  // the inset around those sheets.
  const isSelfContainedPane =
    activeBodyContent === ActiveBodyContent.fee ||
    activeBodyContent === ActiveBodyContent.timeout ||
    activeBodyContent === ActiveBodyContent.memo ||
    activeBodyContent === ActiveBodyContent.submitTx;

  return (
    <View.Content
      hasNoTopPadding={!isSelfContainedPane}
      hasNoPadding={isSelfContainedPane}
    >
      <div data-testid="ChangeTrustInternal" className={rootClassName}>
        {activeBodyContent === ActiveBodyContent.details && (
          <>
            {isOnBlockaidSheet ? (
              blockaidPane
            ) : (
              <MultiPaneSlider activeIndex={activePaneIndex} panes={panes} />
            )}
            <div className="ChangeTrustInternal__Actions">
              <div
                className={`ChangeTrustInternal__Actions__BtnRow ${!shouldShowBlockaidWarning && !isOnBlockaidSheet ? "ChangeTrustInternal__Actions__BtnRow--side-by-side" : ""}`}
              >
                {isSettingsSelectorOpen ? (
                  <div
                    className="ChangeTrustInternal__options-actions"
                    ref={activeOptionsRef}
                  >
                    <div
                      className="ChangeTrustInternal__options-actions__row"
                      onClick={() =>
                        setActiveBodyContent(ActiveBodyContent.fee)
                      }
                    >
                      <div className="action-copy">
                        <div className="ChangeTrustInternal__options-actions__label">
                          {t("Fee")}: {`${fee} XLM`}
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
                          {t("Timeout (seconds)")}: {`${timeout}(s)`}
                        </div>
                        <Icon.Clock />
                      </div>
                    </div>
                    <div
                      className="ChangeTrustInternal__options-actions__row"
                      onClick={() =>
                        setActiveBodyContent(ActiveBodyContent.memo)
                      }
                    >
                      <div className="action-copy">
                        <div className="ChangeTrustInternal__options-actions__label">
                          {t("Memo")}
                        </div>
                        <Icon.File02 />
                      </div>
                    </div>
                  </div>
                ) : null}
                {isOnBlockaidSheet
                  ? renderBlockaidPaneButtons()
                  : shouldShowBlockaidWarning
                    ? renderBlockaidWarningButtons()
                    : renderSafeCaseButtons()}
              </div>
            </div>
          </>
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
            onSuccess={onSuccess ?? onCancel}
            onTransactionSuccess={onTransactionSuccess}
            onClose={onClose ?? onCancel}
            hideCloseTabHint={isFullHeight}
          />
        )}
      </div>
    </View.Content>
  );
};
