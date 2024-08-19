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

/*
 * getSoroswapTokens
 * Get the list of tokens that Soroswap supports for swapping.
 * This is useful to display in the UI to show the user what tokens they can swap between.
 * Returns just the list you'll need to use for Testnet.
 */
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

/*
 * soroswapGetBestPath
 * Given 2 assets, constructs a path to swap between them.
 * Returns the path for a swap as well as the `amountIn` and `amountOutMin` values (the conversion rate).
 */
export const soroswapGetBestPath = async ({
  amount,
  sourceContract,
  destContract,
  networkDetails,
  publicKey,
}: SoroswapGetBestPathParams) => {
  // For Freighter's purposes, we only support Testnet. Therefore, we error if this is called by another network
  if (!isTestnet(networkDetails)) {
    throw Error("Network not supported");
  }

  // We can default to Testnet as we only support Testnet, but for your purposes, you may configure this to any network you'd like.
  const network = Networks.TESTNET;

  // Construct the details for the source and destination tokens

  // In Freighter, we have a helper method that fetches the token details for a given contract ID.
  // Our helper simulates tx's on the given contract ID to get read-only information about each token.
  // The important information we're trying to retrieve is each token's `decimals`. You can retrieve this information however you'd like.
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

  // Here we start interacting with `soroswap-router-sdk`
  // For each token, we create a `Token` object with the token's network, contract ID, and the decimals we retrieved.
  const sourceToken = new Token(
    network,
    sourceContract,
    sourceTokenDetails.decimals,
  );

  const destToken = new Token(network, destContract, destTokenDetails.decimals);

  // The `Router` is used to find the best path for a swap between two tokens.
  const router = new Router({
    getPairsFns: [
      {
        protocol: Protocols.SOROSWAP,
        fn: async () => {
          const res = await fetch(
            // this endpoint is used to get the pairs for Testnet which `Router` will used to determine conversion rate
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

  // Now that we have `Router` setup, we can tell it to find the best path between our source and destination tokens.

  // When determining the best path, we need to format our source amount because in the UI, we use a more human-readable format.
  // But here, we need to pass an argument using the token's decimals. (For ex: 1 XLM will become 10000000 because the `decimals` value is 7).
  // Freighter has a helper method called `parseTokenAmount`, to do this
  const parsedAmount = parseTokenAmount(amount, sourceTokenDetails.decimals);

  // We then create a `CurrencyAmount` object using `soroswap-router-sdk` with the source token and this parsed amount.
  const currencyAmount = CurrencyAmount.fromRawAmount(
    sourceToken,
    parsedAmount.toNumber(),
  );
  const quoteCurrency = destToken;

  // Now we can generate the path between the amount of source token and the destination token.
  const route = await router.route(
    currencyAmount,
    quoteCurrency,
    TradeType.EXACT_INPUT,
  );

  if (route?.trade) {
    // The path is an array of strings that represent the contract IDs of the tokens in the path. This may not be useful for the user, but we'll need it in the next step.
    // The amounIn and amountOutMin are useful for the UI: it will show the user what they're putting and what they expect to receive for it.
    // We're removing the trailing decimals using `formatTokenAmount` before returning just to make it a little more readbale for the user.
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

// After constructing the path and showing the user their conversion rate, we'll ask them to confirm the swap.
// From there, we can use the `buildAndSimulateSoroswapTx` method to simulate the swap and build the transaction.

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

/*
 * buildAndSimulateSoroswapTx
 * Given our 2 assets and the path between them, we can build and simulate our transaction to confirm it will behave as expected when submitted to the network.
 * Returns the simulation response as well as the transaction that will be submitted to the network.
 */
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
  // This is some custom logic specific just to Freighter that we use to utilize the stellar-sdk. You can ignore this.
  // Anytime you see `Sdk`, it's just a reference to the stellar-sdk.
  // For example: import `Sdk` from "stellar-sdk";
  const Sdk = getSdk(networkDetails.networkPassphrase);
  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );

  /* 
  import Sdk from "soroban-sdk";
  const sorobanServer = new Sdk.SorobanRpc.Server(serverUrl);

  is equivalent to the code below:
  */
  const sorobanServer = buildSorobanServer(
    networkDetails.sorobanRpcUrl || "",
    networkDetails.networkPassphrase,
  );

  // Load the user's account
  const account = await server.loadAccount(publicKey);

  // This endpoint will return the contract address for the router on Testnet, which will be needed later
  const routerRes = await fetch(
    new URL("https://api.soroswap.finance/api/testnet/router"),
  );
  const routerData = await routerRes.json();
  const routerAddress: string = routerData.address;

  // Just like in other stellar-sdk flows, we construct a Transaction using TransactionBuilder
  // More info here: https://developers.stellar.org/docs/smart-contracts/guides/transactions
  const tx = new Sdk.TransactionBuilder(account, {
    fee: xlmToStroop(transactionFee).toFixed(),
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: networkDetails.networkPassphrase,
  });

  // Similar to the `soroswapGetBestPath` method, we again need to format our amounts using the token's decimals.
  // .i.e, going from the human-readable 1 XLM to 10000000
  const parsedAmountIn = parseTokenAmount(
    amountIn,
    amountInDecimals,
  ).toNumber();
  const parsedAmountOut = parseTokenAmount(
    amountOut,
    amountOutDecimals,
  ).toNumber();

  // Now we'll utilize the `path` we generated in `soroswapGetBestPath`.
  // The path we generated before was just an array of strings. Here we'll build an array of Address objects
  const mappedPath = path.map((address) => new Sdk.Address(address));

  // We'll use a helper method from stellar-sdk to generate the `SCVal` for each of the parameters of the swap
  const swapParams: xdr.ScVal[] = [
    // the amount the user is sending
    Sdk.nativeToScVal(parsedAmountIn, { type: "i128" }),
    // the amount the user expects to receive
    Sdk.nativeToScVal(parsedAmountOut, { type: "i128" }),
    // the path between the source and destination tokens
    Sdk.nativeToScVal(mappedPath),
    // the user's public key
    new Sdk.Address(publicKey).toScVal(),
    // the deadline for the swap
    Sdk.nativeToScVal(Date.now() + 3600000, { type: "u64" }),
  ];

  // We then create a contract instance using the router address
  const contractInstance = new Sdk.Contract(routerAddress);
  // And create a contract operation to swap the tokens using the `swap_exact_tokens_for_tokens` method
  const contractOperation = contractInstance.call(
    "swap_exact_tokens_for_tokens",
    ...swapParams,
  );

  // We add the contract operation to the transaction
  tx.addOperation(contractOperation);

  // And, if applicable, add a memo to the transaction
  if (memo) {
    tx.addMemo(Sdk.Memo.text(memo));
  }
  const builtTx = tx.build();

  // Now we can simulate and see if we have any issues
  const simulationTransaction = await sorobanServer.simulateTransaction(
    builtTx,
  );

  // If the simulation response is valid, we can prepare the transaction to be submitted to the network
  // This is the transaction the user will sign and then submit to complete the swap
  const preparedTransaction = Sdk.SorobanRpc.assembleTransaction(
    builtTx,
    simulationTransaction,
  )
    .build()
    .toXDR();

  if (Sdk.SorobanRpc.Api.isSimulationError(simulationTransaction)) {
    throw new Error(simulationTransaction.error);
  }

  return {
    simulationTransaction,
    preparedTransaction,
  };
};
