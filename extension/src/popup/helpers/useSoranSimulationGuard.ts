import { useEffect, useRef } from "react";
import { useSelector, useStore } from "react-redux";
import { NetworkDetails } from "@shared/constants/stellar";
import { AppState } from "popup/App";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsSelector } from "popup/ducks/settings";
import { transactionDataSelector } from "popup/ducks/transactionSubmission";
import { isSoranName } from "./soran";

const snapshot = (state: AppState) => {
  const data = transactionDataSelector(state);
  // Simulation updates transactionFee itself. Only the explicitly edited fee
  // belongs to the user's inputs; including the estimated fee cancels our result.
  return JSON.stringify([
    publicKeySelector(state),
    settingsSelector(state).networkDetails,
    data.amount,
    data.asset,
    data.decimals,
    data.destination,
    data.federationAddress,
    data.memo,
    data.memoType,
    data.destinationAsset,
    data.destinationAmount,
    data.destinationDecimals,
    data.path,
    data.allowedSlippage,
    data.transactionTimeout,
    data.manualTransactionFee,
    data.isToken,
    data.isSoroswap,
    data.isCollectible,
    data.collectibleData.collectionAddress,
    data.collectibleData.tokenId,
  ]);
};

export const useSoranSimulationGuard = ({
  publicKey,
  destination,
  networkDetails,
}: {
  publicKey: string;
  destination: string;
  networkDetails: NetworkDetails;
}) => {
  const store = useStore<AppState>();
  // Re-render to hide a completed review as soon as its inputs change.
  useSelector(snapshot);
  const scope = JSON.stringify([publicKey, destination, networkDetails]);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const requestIdRef = useRef(0);
  const currentRequestRef = useRef<(() => boolean) | undefined>(undefined);
  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [scope],
  );

  const beginRequest = () => {
    const requestId = ++requestIdRef.current;
    const currentState = store.getState();
    const isSoranPayment = isSoranName(
      transactionDataSelector(currentState).federationAddress || "",
    );
    const inputs = snapshot(currentState);
    const isCurrent = () => {
      const latestState = store.getState();
      const protectsSoran =
        isSoranPayment ||
        isSoranName(
          transactionDataSelector(latestState).federationAddress || "",
        );
      return (
        !protectsSoran ||
        (requestId === requestIdRef.current &&
          scope === scopeRef.current &&
          inputs === snapshot(latestState))
      );
    };
    currentRequestRef.current = isCurrent;
    return {
      isCurrent,
      assertCurrent: () => {
        if (!isCurrent()) throw new Error("Soran simulation inputs changed");
      },
    };
  };

  return {
    beginRequest,
    isCurrent: () => currentRequestRef.current?.() ?? true,
  };
};
