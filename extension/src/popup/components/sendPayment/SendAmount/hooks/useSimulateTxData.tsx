import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import BigNumber from "bignumber.js";

import { initialState, isError, reducer } from "helpers/request";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  getAssetFromCanonical,
  isMuxedAccount,
  stroopToXlm,
  xlmToStroop,
} from "helpers/stellar";
import {
  Account,
  Asset,
  BASE_FEE,
  extractBaseAddress,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";
import { computeDestMinWithSlippage } from "../../SendConfirm/TransactionDetails/hooks/useGetTxDetailsData";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { getBaseAccount } from "popup/helpers/account";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import {
  CLASSIC_ASSET_DECIMALS,
  formatTokenAmount,
  isContractId,
  parseTokenAmount,
} from "popup/helpers/soroban";
import { simulateTokenTransfer } from "@shared/api/internal";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import {
  saveSimulation,
  saveTransactionFee,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import { getAssetSacAddress } from "@shared/helpers/soroban/token";
import { findAddressBalance } from "popup/helpers/balance";
import { AppDispatch } from "popup/App";
import { useScanTx } from "popup/helpers/blockaid";
import { BlockAidScanTxResult } from "@shared/api/types";

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
  scanResult?: BlockAidScanTxResult | null;
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

const simulateTx = async ({
  type,
  options,
  recommendedFee,
}: {
  type: "classic" | "soroban";
  recommendedFee: string;
  options: {
    tokenPayment: {
      address: string;
      publicKey: string;
      memo?: string;
      params: {
        publicKey: string;
        destination: string;
        amount: number;
      };
      networkDetails: NetworkDetails;
      transactionFee: string;
    };
  };
}) => {
  const baseFee = new BigNumber(recommendedFee || stroopToXlm(BASE_FEE));

  switch (type) {
    case "soroban": {
      const {
        address,
        publicKey,
        memo,
        params,
        networkDetails,
        transactionFee,
      } = options.tokenPayment;
      const { ok, response } = await simulateTokenTransfer({
        address,
        publicKey,
        memo,
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
    }

    case "classic": {
      return {
        recommendedFee: baseFee.toString(),
      };
    }

    default:
      throw new Error("simulation type not supported");
  }
};

function getAssetAddress(
  asset: string,
  destination: string,
  networkDetails: NetworkDetails,
) {
  if (asset === "native") {
    return asset;
  }
  if (
    isContractId(destination) &&
    !isContractId(getAssetFromCanonical(asset).issuer)
  ) {
    return getAssetSacAddress(
      asset,
      networkDetails.networkPassphrase as Networks,
    );
  }
  const [_, issuer] = asset.split(":");
  return issuer;
}

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
  const { recommendedFee } = useNetworkFees();
  const reduxDispatch = useDispatch<AppDispatch>();
  const { asset, amount, transactionFee, memo } = useSelector(
    transactionDataSelector,
  );
  const assetAddress = getAssetAddress(asset, destination, networkDetails);

  const { scanTx } = useScanTx();
  const [state, dispatch] = useReducer(
    reducer<SimulateTxData, unknown>,
    initialState,
  );

  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: true,
    includeIcons: false,
  });
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

      const balancesResult = await fetchBalances(
        publicKey,
        isMainnet,
        networkDetails,
        true,
      );

      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

      const assetBalance = findAddressBalance(
        balancesResult.balances,
        assetAddress,
        networkDetails.networkPassphrase as Networks,
      );
      if (!assetBalance) {
        throw new Error("asset balance not found");
      }

      const tokenAddress =
        assetAddress === "native"
          ? Asset.native().contractId(networkDetails.networkPassphrase)
          : assetAddress;
      const parsedAmount = parseTokenAmount(
        amount,
        Number("decimals" in assetBalance ? assetBalance.decimals : 7),
      );

      const simResponse = await simulateTx({
        type: simParams.type,
        recommendedFee,
        options: {
          tokenPayment: {
            address: tokenAddress,
            publicKey,
            memo,
            params: {
              amount: parsedAmount.toNumber(),
              publicKey,
              destination,
            },
            networkDetails,
            transactionFee,
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
      if (simParams.type === "classic") {
        const {
          amount,
          destinationAmount,
          allowedSlippage,
          path,
          isPathPayment,
          isSwap,
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
          simResponse.recommendedFee,
          transactionTimeout,
          networkDetails,
          memo,
        );
        const xdr = transaction.build().toXDR();
        payload.transactionXdr = xdr;
        payload.scanResult = await scanTx(xdr, scanUrlstub, networkDetails);
      }

      if (simParams.type === "soroban") {
        payload.transactionXdr = simResponse.payload?.preparedTransaction!;
        payload.scanResult = await scanTx(
          payload.transactionXdr,
          scanUrlstub,
          networkDetails,
        );
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
