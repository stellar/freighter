import {
  assertSoranTransactionRoute,
  getSoranTokenAmount,
  unsupportedSoranMuxed,
  UnsupportedSoranMuxedError,
  UnsupportedSoranMemoError,
} from "popup/helpers/soranTransaction";
import { isSoranName, verifySoranDestination } from "popup/helpers/soran";
import { StrKey } from "stellar-sdk";
import { useReducer } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import BigNumber from "bignumber.js";
import { BASE_FEE } from "stellar-sdk";
import { captureException } from "@sentry/browser";

import { initialState, reducer } from "helpers/request";
import { NetworkDetails } from "@shared/constants/stellar";
import { stroopToXlm } from "helpers/stellar";
import { getBaseAccount } from "popup/helpers/account";
import { getCurrentTransactionFee } from "popup/helpers/fees";
import {
  CLASSIC_ASSET_DECIMALS,
  formatTokenAmount,
} from "popup/helpers/soroban";
import { simulateSendCollectible } from "@shared/api/internal";
import {
  saveSimulation,
  saveTransactionFee,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import { AppDispatch, AppState } from "popup/App";
import { useScanTx } from "popup/helpers/blockaid";
import { SimulateTxData, SimulateResult } from "types/transactions";
import { useSoranSimulationGuard } from "popup/helpers/useSoranSimulationGuard";

export type { SimulateTxData };

const simulateTx = async ({
  options,
  recommendedFee,
}: {
  recommendedFee: string;
  options: {
    sendCollectible: {
      collectionAddress: string;
      publicKey: string;
      params: {
        publicKey: string;
        destination: string;
        collectionAddress: string;
        tokenId: number;
      };
      networkDetails: NetworkDetails;
      transactionFee: string;
    };
  };
}) => {
  const baseFee = new BigNumber(recommendedFee || stroopToXlm(BASE_FEE));
  const {
    collectionAddress,
    publicKey,
    params,
    networkDetails,
    transactionFee,
  } = options.sendCollectible;

  const { ok, response } = await simulateSendCollectible({
    collectionAddress,
    publicKey,
    params,
    networkDetails,
    transactionFee,
  });

  if (!ok) {
    throw new Error("failed to simulate token transfer");
  }

  const minResourceFee = formatTokenAmount(
    new BigNumber(response.simulationResponse.minResourceFee),
    CLASSIC_ASSET_DECIMALS,
  );
  return {
    payload: response,
    recommendedFee: baseFee.plus(new BigNumber(minResourceFee)).toString(),
    inclusionFee: baseFee.toString(),
    resourceFee: minResourceFee,
  };
};

function useSimulateTxData({
  publicKey,
  destination,
  networkDetails,
}: {
  publicKey: string;
  destination: string;
  networkDetails: NetworkDetails;
}) {
  const reduxDispatch = useDispatch<AppDispatch>();
  const store = useStore();
  const { transactionFee, collectibleData } = useSelector(
    transactionDataSelector,
  );
  const simulationGuard = useSoranSimulationGuard({
    publicKey,
    destination,
    networkDetails,
  });

  const { scanTx } = useScanTx();
  const [state, dispatch] = useReducer(
    reducer<SimulateTxData, string>,
    initialState,
  );

  const fetchData = async () => {
    const request = simulationGuard.beginRequest();
    dispatch({ type: "FETCH_DATA_START" });
    try {
      // Read transactionFee from Redux state inside fetchData to get the latest values
      // Memos should not be allowed for collectible transactions
      const currentTransactionData = transactionDataSelector(
        store.getState() as AppState,
      );
      const soranName = currentTransactionData.federationAddress || "";
      const isSoranPayment = isSoranName(soranName);
      const currentCollectibleData = isSoranPayment
        ? currentTransactionData.collectibleData
        : collectibleData;
      if (isSoranPayment) {
        if (StrKey.isValidMed25519PublicKey(destination))
          throw unsupportedSoranMuxed();
        await verifySoranDestination(
          soranName,
          { address: destination, memo: "", memoType: "" },
          networkDetails,
        );
        request.assertCurrent();
      }
      const currentTransactionFee = getCurrentTransactionFee({
        currentTransactionFee: currentTransactionData.transactionFee,
        fallbackTransactionFee: transactionFee,
      });

      const payload = { transactionXdr: "" } as SimulateTxData;
      let destinationAccount = await getBaseAccount(destination);

      if (currentCollectibleData.tokenId === null) {
        throw new Error("Token ID is required");
      }

      if (!destinationAccount) {
        throw new Error("Destination account not found");
      }

      request.assertCurrent();
      const simResponse = await simulateTx({
        recommendedFee: currentTransactionFee,
        options: {
          sendCollectible: {
            collectionAddress: currentCollectibleData.collectionAddress,
            publicKey,
            params: {
              collectionAddress: currentCollectibleData.collectionAddress,
              tokenId: currentCollectibleData.tokenId,
              publicKey,
              destination: destinationAccount,
            },
            networkDetails,
            transactionFee: currentTransactionFee,
          },
        },
      });
      request.assertCurrent();
      if (isSoranPayment) {
        assertSoranTransactionRoute(
          simResponse.payload?.preparedTransaction || "",
          { address: destination, memo: "", memoType: "" },
          networkDetails,
          {
            publicKey,
            asset: currentTransactionData.asset,
            isCollectible: true,
            collectionAddress: currentCollectibleData.collectionAddress,
            tokenId: currentCollectibleData.tokenId,
            expectedFee: getSoranTokenAmount(
              simResponse.recommendedFee,
              CLASSIC_ASSET_DECIMALS,
            ),
          },
        );
      }
      const simulationResponse =
        simResponse.payload && "simulationTransaction" in simResponse.payload
          ? simResponse.payload?.simulationTransaction
          : "";
      const saveSimulationResult = () => {
        reduxDispatch(saveTransactionFee(simResponse.recommendedFee));
        reduxDispatch(
          saveSimulation({
            preparedTransaction: simResponse.payload?.preparedTransaction,
            response: simulationResponse,
          }),
        );
      };
      if (!isSoranPayment) saveSimulationResult();

      if (simResponse.inclusionFee !== undefined) {
        payload.inclusionFee = simResponse.inclusionFee;
      }
      if (simResponse.resourceFee !== undefined) {
        payload.resourceFee = simResponse.resourceFee;
      }

      const scanUrlstub = "internal";

      payload.transactionXdr = simResponse.payload?.preparedTransaction!;
      payload.scanResult = await scanTx(
        payload.transactionXdr,
        scanUrlstub,
        networkDetails,
      );

      request.assertCurrent();
      if (isSoranPayment) saveSimulationResult();
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return { ok: true, data: payload } as SimulateResult;
    } catch (error) {
      if (!request.isCurrent()) {
        return {
          ok: false,
          error:
            "We had an issue retrieving your transaction details. Please try again.",
        } as SimulateResult;
      }
      const errorMessage =
        error instanceof UnsupportedSoranMuxedError ||
        error instanceof UnsupportedSoranMemoError
          ? error.message
          : "We had an issue retrieving your transaction details. Please try again.";
      dispatch({ type: "FETCH_DATA_ERROR", payload: errorMessage });
      captureException(
        `error simulating collectible transaction: ${JSON.stringify(error)}`,
      );
      return { ok: false, error: errorMessage } as SimulateResult;
    }
  };

  return {
    state: simulationGuard.isCurrent() ? state : initialState,
    fetchData,
  };
}

export { useSimulateTxData };
