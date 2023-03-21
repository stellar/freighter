import React, { useEffect, useState, useContext } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { Loader } from "@stellar/design-system";
import { Horizon } from "stellar-sdk";

import { getAccountHistory } from "@shared/api/internal";
import { HorizonOperation, ActionStatus } from "@shared/api/types";

import { publicKeySelector } from "popup/ducks/accountServices";
import {
  sorobanSelector,
  getTokenBalances,
  resetSorobanTokensStatus,
} from "popup/ducks/soroban";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import {
  getIsPayment,
  getIsSorobanTransfer,
  getIsSwap,
  getStellarExpertUrl,
} from "popup/helpers/account";

import {
  historyItemDetailViewProps,
  HistoryItem,
  HistoryItemOperation,
} from "popup/components/accountHistory/HistoryItem";
import { HistoryList } from "popup/components/accountHistory/HistoryList";
import {
  TransactionDetail,
  TransactionDetailProps,
} from "popup/components/accountHistory/TransactionDetail";
import { BottomNav } from "popup/components/BottomNav";
import { SorobanContext } from "../../SorobanContext";

import "./styles.scss";

enum SELECTOR_OPTIONS {
  ALL = "ALL",
  SENT = "SENT",
  RECEIVED = "RECEIVED",
}

export const AccountHistory = () => {
  /*
      t("ALL");
      t("SENT");
      t("RECEIVED");
    */
  type HistorySegments =
    | {
        [key in SELECTOR_OPTIONS]: HistoryItemOperation[] | [];
      }
    | null;

  const sorobanClient = useContext(SorobanContext);

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { isExperimentalModeEnabled } = useSelector(settingsSelector);
  const { tokenBalances, getTokenBalancesStatus } = useSelector(
    sorobanSelector,
  );

  const [selectedSegment, setSelectedSegment] = useState(SELECTOR_OPTIONS.ALL);
  const [historySegments, setHistorySegments] = useState(
    null as HistorySegments,
  );
  const [isDetailViewShowing, setIsDetailViewShowing] = useState(false);

  const defaultDetailViewProps: TransactionDetailProps = {
    ...historyItemDetailViewProps,
    setIsDetailViewShowing,
  };
  const [detailViewProps, setDetailViewProps] = useState(
    defaultDetailViewProps,
  );
  const [isLoading, setIsLoading] = useState(false);

  const stellarExpertUrl = getStellarExpertUrl(networkDetails);

  // differentiate between if data is still loading and if no account history results came back from Horizon
  const isAccountHistoryLoading = isExperimentalModeEnabled
    ? historySegments === null ||
      getTokenBalancesStatus === ActionStatus.IDLE ||
      getTokenBalancesStatus === ActionStatus.PENDING
    : historySegments === null;

  useEffect(() => {
    const isSupportedSorobanAccountItem = (operation: HorizonOperation) =>
      // TODO: add mint and other common token interactions
      getIsSorobanTransfer(operation, networkDetails);

    setIsLoading(true);
    const createSegments = (
      operations: HorizonOperation[],
      showSorobanTxs = false,
    ) => {
      const _operations = showSorobanTxs
        ? operations.filter(
            (op) => op.type_i !== 24 || isSupportedSorobanAccountItem(op),
          )
        : operations.filter((op) => op.type_i !== 24);
      const segments = {
        [SELECTOR_OPTIONS.ALL]: [] as HistoryItemOperation[],
        [SELECTOR_OPTIONS.SENT]: [] as HistoryItemOperation[],
        [SELECTOR_OPTIONS.RECEIVED]: [] as HistoryItemOperation[],
      };
      _operations.forEach((operation) => {
        const isPayment = getIsPayment(operation.type);
        const isSorobanXfer = getIsSorobanTransfer(operation, networkDetails);
        const isSwap = getIsSwap(operation);
        const isCreateExternalAccount =
          operation.type === Horizon.OperationResponseType.createAccount &&
          operation.account !== publicKey;
        const historyOperation = {
          ...operation,
          isPayment,
          isSwap,
          isCreateExternalAccount,
        };

        if (isPayment || (isSorobanXfer && !isSwap)) {
          if (operation.source_account === publicKey) {
            segments[SELECTOR_OPTIONS.SENT].push(historyOperation);
          } else if (operation.to === publicKey) {
            segments[SELECTOR_OPTIONS.RECEIVED].push(historyOperation);
          }
        }

        if (isCreateExternalAccount) {
          segments[SELECTOR_OPTIONS.SENT].push(historyOperation);
        }

        segments[SELECTOR_OPTIONS.ALL].push(historyOperation);
      });

      return segments;
    };

    const fetchAccountHistory = async () => {
      try {
        const res = await getAccountHistory({ publicKey, networkDetails });
        setHistorySegments(
          createSegments(res.operations, isExperimentalModeEnabled),
        );

        if (isExperimentalModeEnabled) {
          dispatch(getTokenBalances({ sorobanClient }));
        }
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    };
    fetchAccountHistory();

    return () => {
      if (isExperimentalModeEnabled) {
        dispatch(resetSorobanTokensStatus());
      }
    };
  }, [
    publicKey,
    networkDetails,
    isExperimentalModeEnabled,
    sorobanClient,
    dispatch,
  ]);

  return isDetailViewShowing ? (
    <TransactionDetail {...detailViewProps} />
  ) : (
    <div className="AccountHistory">
      {isLoading ? (
        <div className="AccountHistory__loader">
          <Loader size="2rem" />
        </div>
      ) : (
        <div className="AccountHistory__wrapper">
          <header className="AccountHistory__header">
            {t("Transactions")}
          </header>
          <div className="AccountHistory__selector">
            {Object.values(SELECTOR_OPTIONS).map((option) => (
              <div
                key={option}
                className={`AccountHistory__selector__item ${
                  option === selectedSegment
                    ? "AccountHistory__selector__item--active"
                    : ""
                }`}
                onClick={() => setSelectedSegment(option)}
              >
                {t(option)}
              </div>
            ))}
          </div>
          <div className="AccountHistory__list">
            {historySegments?.[SELECTOR_OPTIONS[selectedSegment]].length ? (
              <HistoryList>
                <>
                  {historySegments![SELECTOR_OPTIONS[selectedSegment]].map(
                    (operation: HistoryItemOperation) => (
                      <HistoryItem
                        key={operation.id}
                        tokenBalances={tokenBalances}
                        operation={operation}
                        publicKey={publicKey}
                        url={stellarExpertUrl}
                        networkDetails={networkDetails}
                        setDetailViewProps={setDetailViewProps}
                        setIsDetailViewShowing={setIsDetailViewShowing}
                      />
                    ),
                  )}
                </>
              </HistoryList>
            ) : (
              <div>
                {isAccountHistoryLoading ? null : t("No transactions to show")}
              </div>
            )}
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
};
