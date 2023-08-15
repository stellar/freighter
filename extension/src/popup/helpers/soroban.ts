import BigNumber from "bignumber.js";
import * as SorobanClient from "soroban-client";

import { HorizonOperation, TokenBalances } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { SorobanContextInterface } from "popup/SorobanContext";

export enum SorobanTokenInterface {
  transfer = "transfer",
  mint = "mint",
}

export const SOROBAN_OPERATION_TYPES = [
  "invoke_host_function",
  "invokeHostFunction",
];

// All assets on the classic side have 7 decimals
// https://developers.stellar.org/docs/fundamentals-and-concepts/stellar-data-structures/assets#amount-precision
export const CLASSIC_ASSET_DECIMALS = 7;

export const simulateTx = async <ArgType>(
  tx: SorobanClient.Transaction<
    SorobanClient.Memo<SorobanClient.MemoType>,
    SorobanClient.Operation[]
  >,
  server: SorobanClient.Server,
): Promise<ArgType> => {
  const { results } = await server.simulateTransaction(tx);
  if (!results || results.length !== 1) {
    throw new Error("Invalid response from simulateTransaction");
  }
  const result = results[0];
  const scVal = SorobanClient.xdr.ScVal.fromXDR(result.xdr, "base64");
  let convertedScVal: any;
  try {
    // handle a case where scValToNative doesn't properly handle scvString
    convertedScVal = scVal.str().toString();
    return convertedScVal;
  } catch (e) {
    console.error(e);
  }
  return SorobanClient.scValToNative(scVal);
};

export const getAssetDecimals = (
  asset: string,
  balances: TokenBalances,
  isToken: boolean,
) => {
  if (isToken) {
    const contractId = asset.split(":")[1];
    const balance = balances.find(({ contractId: id }) => id === contractId);

    if (balance) {
      return Number(balance.decimals);
    }
  }

  return CLASSIC_ASSET_DECIMALS;
};

// Adopted from https://github.com/ethers-io/ethers.js/blob/master/packages/bignumber/src.ts/fixednumber.ts#L27
export const formatTokenAmount = (amount: BigNumber, decimals: number) => {
  let formatted = amount.toString();

  if (decimals > 0) {
    formatted = amount.shiftedBy(-decimals).toFixed(decimals).toString();

    // Trim trailing zeros
    while (formatted[formatted.length - 1] === "0") {
      formatted = formatted.substring(0, formatted.length - 1);
    }

    if (formatted.endsWith(".")) {
      formatted = formatted.substring(0, formatted.length - 1);
    }
  }

  return formatted;
};

export const parseTokenAmount = (value: string, decimals: number) => {
  const comps = value.split(".");

  let whole = comps[0];
  let fraction = comps[1];
  if (!whole) {
    whole = "0";
  }
  if (!fraction) {
    fraction = "0";
  }

  // Trim trailing zeros
  while (fraction[fraction.length - 1] === "0") {
    fraction = fraction.substring(0, fraction.length - 1);
  }

  // If decimals is 0, we have an empty string for fraction
  if (fraction === "") {
    fraction = "0";
  }

  // Fully pad the string with zeros to get to value
  while (fraction.length < decimals) {
    fraction += "0";
  }

  const wholeValue = new BigNumber(whole);
  const fractionValue = new BigNumber(fraction);

  return wholeValue.shiftedBy(decimals).plus(fractionValue);
};

export const getTokenBalance = (
  tokenBalances: TokenBalances,
  contractId: string,
) => {
  const balance = tokenBalances.find(({ contractId: id }) => id === contractId);

  if (!balance) {
    throw new Error("Balance not found");
  }

  return formatTokenAmount(
    new BigNumber(balance.total),
    Number(balance.decimals),
  );
};

export const getTokenDecimals = async (
  sorobanClient: SorobanContextInterface,
  contractId: string,
) => {
  const contract = new SorobanClient.Contract(contractId);
  const server = sorobanClient.server;

  const tx = sorobanClient
    .newTxBuilder()
    .addOperation(contract.call("decimals"))
    .setTimeout(SorobanClient.TimeoutInfinite)
    .build();

  const result = await simulateTx<number>(tx, server);
  return result;
};

export const getTokenName = async (
  sorobanClient: SorobanContextInterface,
  contractId: string,
) => {
  const contract = new SorobanClient.Contract(contractId);
  const server = sorobanClient.server;

  const tx = sorobanClient
    .newTxBuilder()
    .addOperation(contract.call("name"))
    .setTimeout(SorobanClient.TimeoutInfinite)
    .build();

  const result = await simulateTx<string>(tx, server);
  return result;
};

export const getTokenSymbol = async (
  sorobanClient: SorobanContextInterface,
  contractId: string,
) => {
  const contract = new SorobanClient.Contract(contractId);
  const server = sorobanClient.server;

  const tx = sorobanClient
    .newTxBuilder()
    .addOperation(contract.call("symbol"))
    .setTimeout(SorobanClient.TimeoutInfinite)
    .build();

  const result = await simulateTx<string>(tx, server);
  return result;
};

export const getOpArgs = (fnName: string, args: SorobanClient.xdr.ScVal[]) => {
  let amount;
  let from;
  let to;

  switch (fnName) {
    case SorobanTokenInterface.transfer:
      from = SorobanClient.StrKey.encodeEd25519PublicKey(
        args[0].address().accountId().ed25519(),
      );
      to = SorobanClient.StrKey.encodeEd25519PublicKey(
        args[1].address().accountId().ed25519(),
      );
      amount = SorobanClient.scValToNative(args[2]);
      break;
    case SorobanTokenInterface.mint:
      to = SorobanClient.StrKey.encodeEd25519PublicKey(
        args[0].address().accountId().ed25519(),
      );
      amount = SorobanClient.scValToNative(args[1]);
      break;
    default:
      amount = 0;
  }

  return { from, to, amount };
};

const isSorobanOp = (operation: HorizonOperation) =>
  SOROBAN_OPERATION_TYPES.includes(operation.type);

const getRootInvocationArgs = (
  hostFn: SorobanClient.Operation.InvokeHostFunction,
) => {
  if (!hostFn?.func?.invokeContract) {
    return null;
  }

  let invokedContract;

  try {
    invokedContract = hostFn.func.invokeContract();
  } catch (e) {
    return null;
  }

  const contractId = SorobanClient.StrKey.encodeContract(
    invokedContract[0].address().contractId(),
  );
  const fnName = invokedContract[1].sym().toString();
  const args = invokedContract.slice(2);

  // TODO: figure out how to make this extensible to all contract functions
  if (
    fnName !== SorobanTokenInterface.transfer &&
    fnName !== SorobanTokenInterface.mint
  ) {
    return null;
  }

  let opArgs;

  try {
    opArgs = getOpArgs(fnName, args);
  } catch (e) {
    return null;
  }

  return {
    fnName,
    contractId,
    ...opArgs,
  };
};

export const getAttrsFromSorobanTxOp = (operation: HorizonOperation) => {
  if (!isSorobanOp(operation)) {
    return null;
  }
  return getRootInvocationArgs(operation);
};

export const getAttrsFromSorobanHorizonOp = (
  operation: HorizonOperation,
  networkDetails: NetworkDetails,
) => {
  if (!isSorobanOp(operation)) {
    return null;
  }

  const txEnvelope = SorobanClient.TransactionBuilder.fromXDR(
    operation.transaction_attr.envelope_xdr,
    networkDetails.networkPassphrase,
  ) as SorobanClient.Transaction<
    SorobanClient.Memo<SorobanClient.MemoType>,
    SorobanClient.Operation.InvokeHostFunction[]
  >;

  const invokeHostFn = txEnvelope.operations[0]; // only one op per tx in Soroban right now

  return getRootInvocationArgs(invokeHostFn);
};
