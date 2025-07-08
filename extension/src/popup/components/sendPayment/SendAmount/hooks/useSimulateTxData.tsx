import { useReducer } from "react";

import { initialState, isError, reducer } from "helpers/request";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  getAssetFromCanonical,
  isMuxedAccount,
  xlmToStroop,
} from "helpers/stellar";
import {
  Account,
  Asset,
  extractBaseAddress,
  Memo,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";
import { computeDestMinWithSlippage } from "../../SendConfirm/TransactionDetails/hooks/useGetTxDetailsData";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { getBaseAccount } from "popup/helpers/account";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { isContractId } from "popup/helpers/soroban";

interface SimClassic {
  type: "classic";
  sourceAsset: ReturnType<typeof getAssetFromCanonical>;
  destAsset: ReturnType<typeof getAssetFromCanonical>;
  amount: string;
  destinationAmount: string;
  allowedSlippage: string;
  path: string[];
  isPathPayment: boolean;
  isSwap: boolean;
  transactionFee: string;
  transactionTimeout: number;
  memo?: string;
}

interface SimSoroban {
  type: "soroban";
  xdr: string;
}

export interface SimulateTxData {
  transactionXdr: string;
}

const getOperation = (
  sourceAsset: Asset | { code: string; issuer: string },
  destAsset: Asset | { code: string; issuer: string },
  amount: string,
  destinationAmount: string,
  destination: string,
  allowedSlippage: string,
  path: string[],
  isPathPayment: boolean,
  isSwap: boolean,
  isFunded: boolean,
  publicKey: string,
) => {
  // path payment or swap
  if (isPathPayment || isSwap) {
    const destMin = computeDestMinWithSlippage(
      allowedSlippage,
      destinationAmount,
    );
    return Operation.pathPaymentStrictSend({
      sendAsset: sourceAsset as Asset,
      sendAmount: amount,
      destination: isSwap ? publicKey : destination,
      destAsset: destAsset as Asset,
      destMin: destMin.toFixed(7),
      path: path.map((p) => getAssetFromCanonical(p)) as Asset[],
    });
  }

  // create account if unfunded and sending xlm
  if (!isFunded && sourceAsset.code === Asset.native().code) {
    let createAccountDestination = destination;
    if (isMuxedAccount(destination)) {
      // encode muxed account to address
      createAccountDestination = extractBaseAddress(destination);
    }
    return Operation.createAccount({
      destination: createAccountDestination,
      startingBalance: amount,
    });
  }
  // regular payment
  return Operation.payment({
    destination,
    asset: sourceAsset as Asset,
    amount,
  });
};

const getBuiltTx = async (
  publicKey: string,
  opData: {
    sourceAsset: Asset | { code: string; issuer: string };
    destAsset: Asset | { code: string; issuer: string };
    amount: string;
    destinationAmount: string;
    destination: string;
    allowedSlippage: string;
    path: string[];
    isPathPayment: boolean;
    isSwap: boolean;
    isFunded: boolean;
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
    destinationAmount,
    destination,
    allowedSlippage,
    path,
    isPathPayment,
    isSwap,
    isFunded,
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
    destination,
    allowedSlippage,
    path,
    isPathPayment,
    isSwap,
    isFunded,
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
  destination,
  networkDetails,
  destAsset,
  sourceAsset,
  simParams,
  isMainnet,
}: {
  publicKey: string;
  destination: string;
  networkDetails: NetworkDetails;
  destAsset: ReturnType<typeof getAssetFromCanonical>;
  sourceAsset: ReturnType<typeof getAssetFromCanonical>;
  simParams: SimClassic | SimSoroban;
  isMainnet: boolean;
}) {
  const [state, dispatch] = useReducer(
    reducer<SimulateTxData, unknown>,
    initialState,
  );

  const { fetchData: fetchBalancesDest } = useGetBalances({
    showHidden: true,
    includeIcons: false,
  });

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const payload = { transactionXdr: "" } as SimulateTxData;
      let destinationAccount = await getBaseAccount(destination);

      let destBalancesResult = {} as AccountBalances;
      if (destinationAccount && !isContractId(destinationAccount)) {
        const balances = await fetchBalancesDest(
          destinationAccount,
          isMainnet,
          networkDetails,
          true,
        );
        if (isError<AccountBalances>(balances)) {
          throw new Error(balances.message);
        }
        destBalancesResult = balances;
      }

      if (simParams.type === "classic") {
        const {
          amount,
          destinationAmount,
          allowedSlippage,
          path,
          isPathPayment,
          isSwap,
          transactionFee,
          transactionTimeout,
          memo,
        } = simParams;
        const transaction = await getBuiltTx(
          publicKey,
          {
            sourceAsset,
            destAsset,
            amount,
            destinationAmount,
            destination,
            allowedSlippage,
            path,
            isPathPayment,
            isSwap,
            isFunded: destBalancesResult.isFunded!,
          },
          transactionFee,
          transactionTimeout,
          networkDetails,
          memo,
        );
        const xdr = transaction.build().toXDR();
        payload.transactionXdr = xdr;
      }

      if (simParams.type === "soroban") {
        const { xdr } = simParams;
        payload.transactionXdr = xdr;
      }

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
