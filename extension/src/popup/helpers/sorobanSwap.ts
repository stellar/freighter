import { xdr } from "stellar-sdk";
import {
  Router,
  Token,
  CurrencyAmount,
  TradeType,
  Networks,
  Protocols,
} from "soroswap-router-sdk";
import BigNumber from "bignumber.js";

import { NetworkDetails } from "@shared/constants/stellar";
import { getSdk } from "@shared/helpers/stellar";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { getTokenDetails } from "@shared/api/internal";
import { SoroswapToken } from "@shared/api/types";
import { buildSorobanServer } from "@shared/helpers/soroban/server";
import { isTestnet, xlmToStroop } from "helpers/stellar";
import { parseTokenAmount, formatTokenAmount } from "popup/helpers/soroban";

export const getSoroswapTokens = async (): Promise<{
  assets: SoroswapToken[];
}> => {
  const res = await fetch(new URL("https://api.soroswap.finance/api/tokens"));

  const data = await res.json();

  return data.find((d: { network: string }) => d.network === "testnet");
};

interface SoroswapGetBestPathParams {
  amount: string;
  sourceContract: string;
  destContract: string;
  networkDetails: NetworkDetails;
  publicKey: string;
}

export const soroswapGetBestPath = async ({
  amount,
  sourceContract,
  destContract,
  networkDetails,
  publicKey,
}: SoroswapGetBestPathParams) => {
  if (!isTestnet(networkDetails)) {
    throw Error("Network not supported");
  }

  const network = Networks.TESTNET;

  const sourceTokenDetails = await getTokenDetails({
    contractId: sourceContract,
    networkDetails,
    publicKey,
  });
  const destTokenDetails = await getTokenDetails({
    contractId: destContract,
    networkDetails,
    publicKey,
  });

  if (!sourceTokenDetails || !destTokenDetails) {
    throw Error("Source token not found");
  }

  const sourceToken = new Token(
    network,
    sourceContract,
    sourceTokenDetails.decimals,
  );

  const destToken = new Token(network, destContract, destTokenDetails.decimals);

  const router = new Router({
    getPairsFns: [
      {
        protocol: Protocols.SOROSWAP,
        fn: async () => {
          const res = await fetch(
            new URL(
              "https://info.soroswap.finance/api/pairs/plain?network=TESTNET",
            ),
          );

          const data = await res.json();

          return data;
        },
      },
    ],
    pairsCacheInSeconds: 60,
    protocols: [Protocols.SOROSWAP],
    network,
    maxHops: 5,
  });

  const parsedAmount = parseTokenAmount(amount, sourceTokenDetails.decimals);
  const currencyAmount = CurrencyAmount.fromRawAmount(
    sourceToken,
    parsedAmount.toNumber(),
  );
  const quoteCurrency = destToken;

  const route = await router.route(
    currencyAmount,
    quoteCurrency,
    TradeType.EXACT_INPUT,
  );

  if (route?.trade) {
    return {
      amountIn: formatTokenAmount(
        new BigNumber(route.trade?.amountIn || ""),
        sourceTokenDetails.decimals,
      ).toString(),
      amountInDecimals: sourceTokenDetails.decimals,
      amountOutMin: formatTokenAmount(
        new BigNumber(route.trade?.amountOutMin || ""),
        destTokenDetails.decimals,
      ).toString(),
      amountOutDecimals: destTokenDetails.decimals,
      path: route.trade?.path,
    };
  }

  return null;
};

interface BuildAndSimulateSoroswapTxParams {
  amountIn: string;
  amountInDecimals?: number;
  amountOut: string;
  amountOutDecimals?: number;
  path: string[];
  networkDetails: NetworkDetails;
  publicKey: string;
  memo: string;
  transactionFee: string;
}

export const buildAndSimulateSoroswapTx = async ({
  amountIn,
  amountInDecimals = 7,
  amountOut,
  amountOutDecimals = 7,
  path,
  networkDetails,
  publicKey,
  memo,
  transactionFee,
}: BuildAndSimulateSoroswapTxParams) => {
  const Sdk = getSdk(networkDetails.networkPassphrase);
  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );

  const sorobanServer = buildSorobanServer(
    networkDetails.sorobanRpcUrl || "",
    networkDetails.networkPassphrase,
  );

  const account = await server.loadAccount(publicKey);
  const routerRes = await fetch(
    new URL("https://api.soroswap.finance/api/testnet/router"),
  );
  const routerData = await routerRes.json();
  const routerAddress: string = routerData.address;

  const tx = new Sdk.TransactionBuilder(account, {
    fee: xlmToStroop(transactionFee).toFixed(),
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: networkDetails.networkPassphrase,
  });

  const parsedAmountIn = parseTokenAmount(
    amountIn,
    amountInDecimals,
  ).toNumber();
  const parsedAmountOut = parseTokenAmount(
    amountOut,
    amountOutDecimals,
  ).toNumber();
  const mappedPath = path.map((address) => new Sdk.Address(address));

  const pathScVal = Sdk.nativeToScVal(mappedPath);

  const swapParams: xdr.ScVal[] = [
    Sdk.nativeToScVal(parsedAmountIn, { type: "i128" }),
    Sdk.nativeToScVal(parsedAmountOut, { type: "i128" }),
    pathScVal,
    new Sdk.Address(publicKey).toScVal(),
    Sdk.nativeToScVal(Date.now() + 3600000, { type: "u64" }),
  ];

  const contractInstance = new Sdk.Contract(routerAddress);
  const contractOperation = contractInstance.call(
    "swap_exact_tokens_for_tokens",
    ...swapParams,
  );

  tx.addOperation(contractOperation);
  if (memo) {
    tx.addMemo(Sdk.Memo.text(memo));
  }
  const builtTx = tx.build();

  const simulationResponse = await sorobanServer.simulateTransaction(builtTx);

  const preparedTransaction = Sdk.SorobanRpc.assembleTransaction(
    builtTx,
    simulationResponse,
  )
    .build()
    .toXDR();

  return {
    simulationResponse,
    preparedTransaction,
  };
};
