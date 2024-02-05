import BigNumber from "bignumber.js";
import {
  Memo,
  MemoType,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  scValToNative,
  xdr,
} from "stellar-sdk";

import {
  AccountBalancesInterface,
  Balances,
  HorizonOperation,
} from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";

export const SOROBAN_OPERATION_TYPES = [
  "invoke_host_function",
  "invokeHostFunction",
];

// All assets on the classic side have 7 decimals
// https://developers.stellar.org/docs/fundamentals-and-concepts/stellar-data-structures/assets#amount-precision
export const CLASSIC_ASSET_DECIMALS = 7;

export const getAssetDecimals = (
  asset: string,
  balances: AccountBalancesInterface,
  isToken: boolean,
) => {
  if (isToken) {
    const _balances = balances.balances || ({} as NonNullable<Balances>);
    const balance = _balances[asset];

    if (balance && "decimals" in balance) {
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

export const getArgsForTokenInvocation = (
  fnName: string,
  args: xdr.ScVal[],
) => {
  let amount: BigNumber;
  let from = "";
  let to = "";

  switch (fnName) {
    case SorobanTokenInterface.transfer:
      from = StrKey.encodeEd25519PublicKey(
        args[0].address().accountId().ed25519(),
      );
      to = StrKey.encodeEd25519PublicKey(
        args[1].address().accountId().ed25519(),
      );
      amount = scValToNative(args[2]);
      break;
    case SorobanTokenInterface.mint:
      to = StrKey.encodeEd25519PublicKey(
        args[0].address().accountId().ed25519(),
      );
      amount = scValToNative(args[1]);
      break;
    default:
      amount = new BigNumber(0);
  }

  return { from, to, amount };
};

const isSorobanOp = (operation: HorizonOperation) =>
  SOROBAN_OPERATION_TYPES.includes(operation.type);

export const getTokenInvocationArgs = (
  hostFn: Operation.InvokeHostFunction,
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

  const contractId = StrKey.encodeContract(
    invokedContract.contractAddress().contractId(),
  );
  const fnName = invokedContract.functionName().toString();
  const args = invokedContract.args();

  if (
    fnName !== SorobanTokenInterface.transfer &&
    fnName !== SorobanTokenInterface.mint
  ) {
    return null;
  }

  let opArgs;

  try {
    opArgs = getArgsForTokenInvocation(fnName, args);
  } catch (e) {
    return null;
  }

  return {
    fnName,
    contractId,
    ...opArgs,
  };
};

export const getAttrsFromSorobanHorizonOp = (
  operation: HorizonOperation,
  networkDetails: NetworkDetails,
) => {
  if (!isSorobanOp(operation)) {
    return null;
  }

  // operation record from Mercury
  if (operation.transaction_attr.contractId) {
    return {
      contractId: operation.transaction_attr.contractId,
      fnName: operation.transaction_attr.fnName,
      ...operation.transaction_attr.args,
    };
  }

  const txEnvelope = TransactionBuilder.fromXDR(
    operation.transaction_attr.envelope_xdr,
    networkDetails.networkPassphrase,
  ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;

  const invokeHostFn = txEnvelope.operations[0]; // only one op per tx in Soroban right now

  return getTokenInvocationArgs(invokeHostFn);
};

export const isContractId = (contractId: string) => {
  try {
    StrKey.decodeContract(contractId);
    return true;
  } catch (error) {
    return false;
  }
};
