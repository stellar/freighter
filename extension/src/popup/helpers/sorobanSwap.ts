/* eslint-disable */

import {
  Keypair,
  Account,
  Address,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  SorobanRpc,
  Transaction,
  nativeToScVal,
  xdr,
} from "stellar-sdk";
import {
  Router,
  Token,
  CurrencyAmount,
  TradeType,
  Networks,
  Protocols,
} from "soroswap-router-sdk";
import axios from "axios";
import BigNumber from "bignumber.js";

import {
  TESTNET_NETWORK_DETAILS,
  NetworkDetails,
} from "@shared/constants/stellar";
import { getSdk } from "@shared/helpers/stellar";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { getTokenDetails } from "@shared/api/internal";
import { buildSorobanServer } from "@shared/helpers/soroban/server";
import { isTestnet, xlmToStroop } from "helpers/stellar";
import { parseTokenAmount, formatTokenAmount } from "popup/helpers/soroban";

export const getSoroswapTokens = async (): Promise<{
  assets: {
    code: string;
    contract: string;
    decimals: number;
    domain: string;
    icon: string;
    issuer: string;
  }[];
}> => {
  const { data } = await axios.get("https://api.soroswap.finance/api/tokens");

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
    throw "Network not supported";
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
    throw "Source token not found";
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
          const { data } = await axios.get(
            "https://info.soroswap.finance/api/pairs/plain?network=TESTNET",
          );

          return data;
        },
      },
    ],
    pairsCacheInSeconds: 60,
    protocols: [Protocols.SOROSWAP],
    network: network,
    maxHops: 5,
  });

  const parsedAmount = parseTokenAmount(amount, sourceTokenDetails.decimals);
  const currencyAmount = CurrencyAmount.fromRawAmount(
    sourceToken,
    parsedAmount.toNumber(),
  );
  const quoteCurrency = destToken;

  console.log(currencyAmount);
  console.log(quoteCurrency);

  const route = await router.route(
    currencyAmount,
    quoteCurrency,
    TradeType.EXACT_INPUT,
    "CARJOYYBHVV2Y5GXEXIZFJJRRAWQBJ4DB2IJEPVHL2I3XKNHUB2HZWDX",
  );

  console.log(route?.trade);

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

interface buildAndSimulateSoroswapTxParams {
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
}: buildAndSimulateSoroswapTxParams) => {
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
  const { data } = await axios.get(
    "https://api.soroswap.finance/api/testnet/factory",
  );
  const swapContractAddress = data.address;
  console.log(swapContractAddress);

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

  const contractInstance = new Contract(
    "CBHNQTKJD76Q55TINIT3PPP3BKLIKIQEXPTQ32GUUU7I3CHBD5JECZLW",
  );
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

  const preparedTransaction = SorobanRpc.assembleTransaction(
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

export const swap = async () => {
  const XLM_ADDRESS =
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
  const USDC_ADDRESS =
    "CCKW6SMINDG6TUWJROIZ535EW2ZUJQEDGSKNIK3FBK26PAMBZDVK2BZA";

  const XLM_TOKEN = new Token(
    Networks.TESTNET,
    XLM_ADDRESS,
    7,
    "XLM",
    "Stellar Lumens",
  );

  const USDC_TOKEN = new Token(
    Networks.TESTNET,
    USDC_ADDRESS,
    7,
    "USDC",
    "USD Coin",
  );

  const amount = 10000000; // In stellar Stroops

  // const router = new Router({
  //   pairsCacheInSeconds: 20, // pairs cache duration
  //   protocols: [Protocols.SOROSWAP], // protocols to be used
  //   network: Networks.TESTNET, // network to be used
  // });

  const router = new Router({
    // getPairsFn: async () => {
    //   // const { data } = await axios.get(
    //   //   "https://info.soroswap.finance/api/pairs?network=TESTNET",
    //   // );

    //   // return data;
    //   return Promise.resolve([
    //     {
    //       tokenA: USDC_ADDRESS,
    //       tokenB: XLM_ADDRESS,
    //       reserveA: "6019011995679",
    //       reserveB: "5225492708",
    //     },
    //   ]);
    // },
    pairsCacheInSeconds: 60,
    protocols: [Protocols.SOROSWAP],
    network: Networks.TESTNET,
    maxHops: 5,
  });

  const currencyAmount = CurrencyAmount.fromRawAmount(XLM_TOKEN, amount);
  const quoteCurrency = USDC_TOKEN;

  console.log(currencyAmount);
  console.log(quoteCurrency);

  console.log(1);

  const route = await router.route(
    currencyAmount,
    quoteCurrency,
    TradeType.EXACT_INPUT,
  );

  console.log(route?.trade?.path);

  const Sdk = getSdk(TESTNET_NETWORK_DETAILS.networkPassphrase);
  const server = stellarSdkServer(
    TESTNET_NETWORK_DETAILS.networkUrl,
    TESTNET_NETWORK_DETAILS.networkPassphrase,
  );

  const sorobanServer = buildSorobanServer(
    TESTNET_NETWORK_DETAILS.sorobanRpcUrl || "",
    TESTNET_NETWORK_DETAILS.networkPassphrase,
  );

  const createTx = async (
    routerAddress: string,
    method: string,
    params: any,
  ) => {
    const createTxBuilder = async (
      account: Account,
    ): Promise<TransactionBuilder> => {
      try {
        return new Sdk.TransactionBuilder(account, {
          fee: BASE_FEE,
          timebounds: { minTime: 0, maxTime: 0 },
          networkPassphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
        });
      } catch (e: any) {
        console.error(e);
        throw Error("unable to create txBuilder");
      }
    };
    const contractInstance = new Contract(routerAddress);
    const contractOperation = contractInstance.call(method, ...params);
    const acc = await server.loadAccount(
      "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
    );
    const txBuilder = await createTxBuilder(acc);
    txBuilder.addOperation(contractOperation);
    const tx = txBuilder.build();
    return tx;
  };

  const invokeTransaction = async (tx: Transaction, source: Keypair) => {
    const simulatedTx = await sorobanServer.simulateTransaction(tx);
    //If you only want to review the transaction, you can return the simulatedTx object to explore it in detail.
    // return simulatedTx;

    console.log(simulatedTx);

    const assemble_tx = SorobanRpc.assembleTransaction(tx, simulatedTx).build();
    // sim_tx_data.resourceFee(
    //   xdr.Int64.fromString((Number(sim_tx_data.resourceFee().toString()) + 100000).toString())
    // );
    // const prepped_tx = assemble_tx.setSorobanData(sim_tx_data).build();
    // prepped_tx.sign(source);
    // const tx_hash = prepped_tx.hash().toString("hex");

    assemble_tx.sign(source);

    console.log("submitting tx...");
    // let response = await sorobanServer.sendTransaction(assemble_tx);
    // let status = response.status;

    // console.log(response);
    return "submitted";
  };

  const account = Sdk.Keypair.fromSecret(
    "SANJ4VT7GYJKGOOFA6ABL5GCOTUVI57N3H2JLMLFUAJ6VDOJ6UFGZMAB",
  );

  const method = "swap_exact_tokens_for_tokens";
  const amount_in = 2500000; //In stellar stroops
  const amount_out_min = 0; //In stellar stroops
  const path = route?.trade?.path || ["", ""];
  console.log(path);
  const path2 = path.map((address) => new Sdk.Address(address));
  console.log(path2);

  const pathScVal = nativeToScVal(path2);

  console.log(pathScVal);

  const swapParams: xdr.ScVal[] = [
    nativeToScVal(amount_in, { type: "i128" }),
    nativeToScVal(amount_out_min, { type: "i128" }),
    pathScVal,
    new Address(
      "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
    ).toScVal(),
    nativeToScVal(Date.now() + 3600000, { type: "u64" }),
  ];

  const tx = await createTx(
    "CB74KXQXEGKGPU5C5FI22X64AGQ63NANVLRZBS22SSCMLJDXNHED72MO",
    method,
    swapParams,
  );

  // console.log(invokeTransaction);

  // console.log(tx);
  // console.log(account);
  const res = await invokeTransaction(tx, account);

  console.log(res);
};
