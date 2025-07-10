import { useReducer } from "react";
import { useSelector } from "react-redux";
import BigNumber from "bignumber.js";
import {
  Account,
  Asset,
  BASE_FEE,
  Memo,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";

import { initialState, reducer } from "helpers/request";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  stroopToXlm,
  xlmToStroop,
} from "helpers/stellar";

import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { transactionDataSelector } from "popup/ducks/transactionSubmission";
import { useScanTx } from "popup/helpers/blockaid";
import { BlockAidScanTxResult } from "@shared/api/types";
import { computeDestMinWithSlippage } from "popup/components/sendPayment/SendConfirm/TransactionDetails/hooks/useGetTxDetailsData";
import { horizonGetBestPath } from "popup/helpers/horizonGetBestPath";

const scanUrlstub = "internal";

interface SimulationParams {
  sourceAsset: ReturnType<typeof getAssetFromCanonical>;
  destAsset: ReturnType<typeof getAssetFromCanonical>;
  amount: string;
  destinationAmount: string;
  allowedSlippage: string;
  path: string[];
  transactionFee: string;
  transactionTimeout: number;
  memo?: string;
}

export interface SimulateTxData {
  transactionXdr: string;
  scanResult?: BlockAidScanTxResult | null;
}

const getOperation = (
  sourceAsset: Asset | { code: string; issuer: string },
  destAsset: Asset | { code: string; issuer: string },
  amount: string,
  destinationAmount: string,
  allowedSlippage: string,
  path: string[],
  publicKey: string,
) => {
  const destMin = computeDestMinWithSlippage(
    allowedSlippage,
    destinationAmount,
  );
  return Operation.pathPaymentStrictSend({
    sendAsset: sourceAsset as Asset,
    sendAmount: amount,
    destination: publicKey,
    destAsset: destAsset as Asset,
    destMin: destMin.toFixed(7),
    path: path.map((p) => getAssetFromCanonical(p)) as Asset[],
  });
};

const getBuiltTx = async (
  publicKey: string,
  opData: {
    sourceAsset: Asset | { code: string; issuer: string };
    destAsset: Asset | { code: string; issuer: string };
    amount: string;
    allowedSlippage: string;
    destinationAmount: string;
    path: string[];
  },
  fee: string,
  transactionTimeout: number,
  networkDetails: NetworkDetails,
  memo?: string,
) => {
  const {
    sourceAsset,
    destAsset,
    amount,
    allowedSlippage,
    destinationAmount,
    path,
  } = opData;
  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );
  const sourceAccount: Account = await server.loadAccount(publicKey);

  const operation = getOperation(
    sourceAsset,
    destAsset,
    amount,
    destinationAmount,
    allowedSlippage,
    path,
    publicKey,
  );

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: xlmToStroop(fee).toFixed(),
    networkPassphrase: networkDetails.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(transactionTimeout);

  if (memo) {
    transaction.addMemo(Memo.text(memo));
  }

  return transaction;
};

function useSimulateTxData({
  publicKey,
  networkDetails,
  simParams,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
  simParams: SimulationParams;
}) {
  const { recommendedFee } = useNetworkFees();
  const { amount, memo } = useSelector(transactionDataSelector);

  const { scanTx } = useScanTx();
  const [state, dispatch] = useReducer(
    reducer<SimulateTxData, unknown>,
    initialState,
  );

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const payload = { transactionXdr: "" } as SimulateTxData;
      const { allowedSlippage, sourceAsset, destAsset, transactionTimeout } =
        simParams;

      const baseFee = new BigNumber(recommendedFee || stroopToXlm(BASE_FEE));

      const bestPath = await horizonGetBestPath({
        amount,
        sourceAsset: getCanonicalFromAsset(
          sourceAsset.code,
          sourceAsset.issuer,
        ),
        destAsset: getCanonicalFromAsset(destAsset.code, destAsset.issuer),
        networkDetails,
      });
      // store in canonical form for easier use
      const path: string[] = [];
      bestPath.path.forEach((p) => {
        if (!p.asset_code && !p.asset_issuer) {
          path.push(p.asset_type);
        } else {
          path.push(getCanonicalFromAsset(p.asset_code, p.asset_issuer));
        }
      });
      const transaction = await getBuiltTx(
        publicKey,
        {
          sourceAsset,
          destAsset,
          amount,
          destinationAmount: bestPath.destination_amount,
          allowedSlippage,
          path,
        },
        baseFee.toString(),
        transactionTimeout,
        networkDetails,
        memo,
      );
      const xdr = transaction.build().toXDR();
      payload.transactionXdr = xdr;
      payload.scanResult = await scanTx(xdr, scanUrlstub, networkDetails);

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useSimulateTxData };
