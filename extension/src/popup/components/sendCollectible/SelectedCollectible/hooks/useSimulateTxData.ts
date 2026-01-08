import { useReducer } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import BigNumber from "bignumber.js";
import { BASE_FEE } from "stellar-sdk";
import { captureException } from "@sentry/browser";

import { initialState, reducer } from "helpers/request";
import { NetworkDetails } from "@shared/constants/stellar";
import { stroopToXlm } from "helpers/stellar";
import { getBaseAccount } from "popup/helpers/account";
import {
  CLASSIC_ASSET_DECIMALS,
  formatTokenAmount,
} from "popup/helpers/soroban";
import { simulateSendCollectible } from "@shared/api/internal";
import { BlockAidScanTxResult } from "@shared/api/types";
import {
  saveSimulation,
  saveTransactionFee,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import { AppDispatch, AppState } from "popup/App";
import { useScanTx } from "popup/helpers/blockaid";

export interface SimulateTxData {
  transactionXdr: string;
  scanResult?: BlockAidScanTxResult | null;
}

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

  const { scanTx } = useScanTx();
  const [state, dispatch] = useReducer(
    reducer<SimulateTxData, string>,
    initialState,
  );

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      // Read transactionFee from Redux state inside fetchData to get the latest values
      // Memos should not be allowed for collectible transactions
      const currentTransactionData = transactionDataSelector(
        store.getState() as AppState,
      );
      const currentTransactionFee =
        currentTransactionData.transactionFee || transactionFee;

      const payload = { transactionXdr: "" } as SimulateTxData;
      let destinationAccount = await getBaseAccount(destination);

      if (collectibleData.tokenId === null) {
        throw new Error("Token ID is required");
      }

      if (!destinationAccount) {
        throw new Error("Destination account not found");
      }

      const simResponse = await simulateTx({
        recommendedFee: currentTransactionFee,
        options: {
          sendCollectible: {
            collectionAddress: collectibleData.collectionAddress,
            publicKey,
            params: {
              collectionAddress: collectibleData.collectionAddress,
              tokenId: collectibleData.tokenId,
              publicKey,
              destination: destinationAccount,
            },
            networkDetails,
            transactionFee: currentTransactionFee,
          },
        },
      });
      const simulationResponse =
        simResponse.payload && "simulationTransaction" in simResponse.payload
          ? simResponse.payload?.simulationTransaction
          : "";
      reduxDispatch(saveTransactionFee(simResponse.recommendedFee));
      reduxDispatch(
        saveSimulation({
          preparedTransaction: simResponse.payload?.preparedTransaction,
          response: simulationResponse,
        }),
      );

      const scanUrlstub = "internal";

      payload.transactionXdr = simResponse.payload?.preparedTransaction!;
      payload.scanResult = await scanTx(
        payload.transactionXdr,
        scanUrlstub,
        networkDetails,
      );

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({
        type: "FETCH_DATA_ERROR",
        payload:
          "We had an issue retrieving your transaction details. Please try again.",
      });
      captureException(
        `error simulating collectible transaction: ${JSON.stringify(error)}`,
      );
      return error;
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useSimulateTxData };
