import { useReducer } from "react";
import { useSelector } from "react-redux";
import {
  Account,
  Asset,
  Memo,
  Operation,
  TransactionBuilder,
  extractBaseAddress,
} from "stellar-sdk";
import BigNumber from "bignumber.js";

import { NetworkDetails } from "@shared/constants/stellar";

import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import {
  isAssetSuspicious,
  scanAsset,
  useScanTx,
} from "popup/helpers/blockaid";
import { BlockAidScanTxResult } from "@shared/api/types";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { findAssetBalance } from "popup/helpers/balance";
import {
  getAssetFromCanonical,
  xlmToStroop,
  isMuxedAccount,
} from "helpers/stellar";
import { getBaseAccount } from "popup/helpers/account";
import { isContractId } from "popup/helpers/soroban";
import { hasPrivateKeySelector } from "popup/ducks/accountServices";
import { captureException } from "@sentry/browser";

export interface TxDetailsData {
  destAssetIconUrl: string;
  isDestAssetSuspicious: boolean;
  isSourceAssetSuspicious: boolean;
  balances: AccountBalances;
  destinationBalances: AccountBalances;
  scanResult?: BlockAidScanTxResult | null;
  transactionXdr: string;
  hasPrivateKey: boolean;
}

interface ScanClassic {
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

function useGetTxDetailsData(
  publicKey: string,
  destination: string,
  networkDetails: NetworkDetails,
  destAsset: ReturnType<typeof getAssetFromCanonical>,
  sourceAsset: ReturnType<typeof getAssetFromCanonical>,
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
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  const [state, dispatch] = useReducer(
    reducer<TxDetailsData, unknown>,
    initialState,
  );

  const { fetchData: fetchBalances } = useGetBalances(balanceOptions);
  // tx details needs to show icons and filter hidden assets
  // we can't call these APIs with foreign public keys due to the public key mismatch check at the message listener
  // so we need another instance of this hook where we don't call those APIs
  const { fetchData: fetchBalancesDest } = useGetBalances({
    showHidden: true,
    includeIcons: false,
  });

  const { scanTx } = useScanTx();

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      let destinationAccount = await getBaseAccount(destination);
      const balancesResult = await fetchBalances(
        publicKey,
        balanceOptions.isMainnet,
        networkDetails,
        true,
      );

      let destBalancesResult = {} as AccountBalances;
      if (destinationAccount && !isContractId(destinationAccount)) {
        const balances = await fetchBalancesDest(
          destinationAccount,
          balanceOptions.isMainnet,
          networkDetails,
          true,
        );
        if (isError<AccountBalances>(balances)) {
          throw new Error(balances.message);
        }
        destBalancesResult = balances;
      }

      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

      const source = findAssetBalance(balancesResult.balances, sourceAsset);
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
        hasPrivateKey,
        balances: balancesResult,
        destinationBalances: destBalancesResult,
        destAssetIconUrl,
        isSourceAssetSuspicious:
          "blockaidData" in source && isAssetSuspicious(source.blockaidData),
        isDestAssetSuspicious: isAssetSuspicious(scannedDestAsset),
      } as TxDetailsData;

      if (scanOptions.shouldScan && scanOptions.params.type === "classic") {
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
            isFunded: destBalancesResult.isFunded!,
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
      captureException(error);
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
