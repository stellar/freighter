import { useReducer } from "react";
import {
  Account,
  Asset,
  Memo,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";
import BigNumber from "bignumber.js";

import { NetworkDetails } from "@shared/constants/stellar";

import { initialState, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import {
  isAssetSuspicious,
  scanAsset,
  useScanTx,
} from "popup/helpers/blockaid";
import { BlockAidScanTxResult } from "@shared/api/types";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { getAssetFromCanonical, xlmToStroop } from "helpers/stellar";

interface TxDetailsData {
  destAssetIconUrl: string;
  isDestAssetSuspicious: boolean;
  isSourceAssetSuspicious: boolean;
  balances: AccountBalances;
  scanResult?: BlockAidScanTxResult | null;
  transactionXdr: string;
}

interface ScanClassic {
  type: "classic";
  sourceAsset: Asset;
  destAsset: Asset;
  amount: string;
  destinationAmount: string;
  destination: string;
  allowedSlippage: string;
  path: string[];
  isPathPayment: boolean;
  isSwap: boolean;
  // isFunded: boolean; needs to come from dest balances
  transactionFee: string;
  transactionTimeout: number;
  memo?: string;
}

interface ScanSoroban {
  type: "soroban";
  xdr: string;
}

export const computeDestMinWithSlippage = (
  slippage: string,
  destMin: string,
): BigNumber => {
  const mult = 1 - parseFloat(slippage) / 100;
  return new BigNumber(destMin).times(new BigNumber(mult));
};

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
    return Operation.createAccount({
      destination,
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

function useGetTxDetailsData(
  publicKey: string,
  networkDetails: NetworkDetails,
  destAsset: Asset,
  sourceAsset: Asset,
  scanOptions: {
    shouldScan: boolean;
    url: string;
    params: ScanClassic | ScanSoroban;
  },
  balanceOptions: {
    isMainnet: boolean;
    showHidden: boolean;
    includeIcons: boolean;
  },
) {
  const [state, dispatch] = useReducer(
    reducer<TxDetailsData, unknown>,
    initialState,
  );
  // TODO: get destination balances
  const { fetchData: fetchBalances } = useGetBalances(
    publicKey,
    networkDetails,
    balanceOptions,
  );
  const { scanTx } = useScanTx();

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const balancesResult = await fetchBalances();

      // TODO: make type narrow functions
      if (!("balances" in balancesResult)) {
        throw new Error(balancesResult.message);
      }

      const source = balancesResult.balances.find(
        (balance) => balance.contractId === sourceAsset.issuer,
      );
      if (!source) {
        throw new Error("source asset not found");
      }

      const destAssetIconUrl = await getIconUrlFromIssuer({
        key: destAsset.issuer,
        code: destAsset.code,
        networkDetails,
      });

      const scannedDestAsset = await scanAsset(
        `${destAsset.code}-${destAsset.issuer}`,
        networkDetails,
      );

      const payload = {
        balances: balancesResult,
        destAssetIconUrl,
        isSourceAssetSuspicious: isAssetSuspicious(source.blockaidData),
        isDestAssetSuspicious: isAssetSuspicious(scannedDestAsset),
      } as TxDetailsData;

      if (scanOptions.shouldScan && scanOptions.params.type === "classic") {
        const {
          amount,
          destinationAmount,
          destination,
          allowedSlippage,
          path,
          isPathPayment,
          isSwap,
          transactionFee,
          transactionTimeout,
          memo,
        } = scanOptions.params;
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
            isFunded: true, // TODO: destinationBalances.isFunded!
          },
          transactionFee,
          transactionTimeout,
          networkDetails,
          memo,
        );
        const xdr = transaction.build().toXDR();
        const scanResult = await scanTx(xdr, scanOptions.url, networkDetails);
        payload.scanResult = scanResult;
        payload.transactionXdr = xdr;
      }

      if (scanOptions.params.type === "soroban") {
        const { xdr } = scanOptions.params;
        payload.transactionXdr = xdr;
        if (scanOptions.shouldScan) {
          const scanResult = await scanTx(xdr, scanOptions.url, networkDetails);
          payload.scanResult = scanResult;
        }
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

export { useGetTxDetailsData };
