import BigNumber from "bignumber.js";
import {
  Address,
  Asset,
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
  SorobanBalance,
} from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  ArgsForTokenInvocation,
  SorobanTokenInterface,
  TokenInvocationArgs,
} from "@shared/constants/soroban/token";
import { isSorobanIssuer } from "./account";

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
) => {
  if (isSorobanIssuer(asset)) {
    const _balances = balances.balances || ({} as NonNullable<Balances>);
    const balance = _balances[asset];

    if (balance && "decimals" in balance) {
      return Number(balance.decimals);
    }
  }

  return CLASSIC_ASSET_DECIMALS;
};

export const getTokenBalance = (tokenBalance: SorobanBalance) =>
  formatTokenAmount(
    new BigNumber(tokenBalance.total),
    Number(tokenBalance.decimals),
  );

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
): ArgsForTokenInvocation => {
  let amount: bigint | number;
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
      amount = BigInt(0);
  }

  return { from, to, amount };
};

const isSorobanOp = (operation: HorizonOperation) =>
  SOROBAN_OPERATION_TYPES.includes(operation.type);

export const getTokenInvocationArgs = (
  hostFn: Operation.InvokeHostFunction,
): TokenInvocationArgs | null => {
  if (!hostFn?.func?.invokeContract) {
    return null;
  }

  let invokedContract: xdr.InvokeContractArgs;

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

  let opArgs: ArgsForTokenInvocation;

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
  // why does transaction_attr not exist on any horizon types?
  const _op = operation as any;
  if (_op.transaction_attr.contractId) {
    return {
      contractId: _op.transaction_attr.contractId,
      fnName: _op.transaction_attr.fnName,
      ..._op.transaction_attr.args,
    };
  }

  const txEnvelope = TransactionBuilder.fromXDR(
    _op.transaction_attr.envelope_xdr as string,
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

export interface InvocationTree {
  type: string;
  args: any;
  invocations: InvocationTree[];
}

export function buildInvocationTree(root: xdr.SorobanAuthorizedInvocation) {
  const fn = root.function();
  const output = {} as InvocationTree;
  const inner = fn.value();

  switch (fn.switch().value) {
    // sorobanAuthorizedFunctionTypeContractFn
    case 0: {
      const _inner = inner as xdr.InvokeContractArgs;
      output.type = "execute";
      output.args = {
        source: Address.fromScAddress(_inner.contractAddress()).toString(),
        function: _inner.functionName().toString(),
        args: _inner.args().map((arg) => scValToNative(arg)),
      };
      break;
    }

    // sorobanAuthorizedFunctionTypeCreateContractHostFn
    case 1: {
      const _inner = inner as xdr.CreateContractArgs;
      output.type = "create";
      output.args = {} as {
        type: string;
        wasm: any;
      };

      // If the executable is a WASM, the preimage MUST be an address. If it's a
      // token, the preimage MUST be an asset. This is a cheeky way to check
      // that, because wasm=0, token=1 and address=0, asset=1 in the XDR switch
      // values.
      //
      // The first part may not be true in V2, but we'd need to update this code
      // anyway so it can still be an error.
      const [exec, preimage] = [
        _inner.executable(),
        _inner.contractIdPreimage(),
      ];
      if (!!exec.switch().value !== !!preimage.switch().value) {
        throw new Error(
          `creation function appears invalid: ${JSON.stringify(
            inner,
          )} (should be wasm+address or token+asset)`,
        );
      }

      switch (exec.switch().value) {
        // contractExecutableWasm
        case 0: {
          /** @type {xdr.ContractIdPreimageFromAddress} */
          const details = preimage.fromAddress();

          output.args.type = "wasm";
          output.args.wasm = {
            salt: details.salt().toString("hex"),
            hash: exec.wasmHash().toString("hex"),
            address: Address.fromScAddress(details.address()).toString(),
          };
          break;
        }

        // contractExecutableStellarAsset
        case 1:
          output.args.type = "sac";
          output.args.asset = Asset.fromOperation(
            preimage.fromAsset(),
          ).toString();
          break;

        default:
          throw new Error(`unknown creation type: ${JSON.stringify(exec)}`);
      }

      break;
    }

    default:
      throw new Error(
        `unknown invocation type (${fn.switch()}): ${JSON.stringify(fn)}`,
      );
  }

  output.invocations = root.subInvocations().map((i) => buildInvocationTree(i));
  return output;
}

export function pickTransfers(invocationTree: InvocationTree) {
  const transfers = [];
  // the transfer sig is (from, to, amount)
  if (invocationTree.args.function === "transfer") {
    transfers.push({
      contractId: invocationTree.args.source as string,
      amount: invocationTree.args.args[2].toString() as string,
      to: invocationTree.args.args[1] as string,
      from: invocationTree.args.args[0] as string,
    });
  }
  const subTransfers = invocationTree.invocations
    .filter((i) => i.args.function === "transfer")
    .map((i) => ({
      contractId: i.args.source as string,
      amount: i.args.args[2].toString() as string,
      to: i.args.args[1] as string,
      from: i.args.args[0] as string,
    }));
  return [...transfers, ...subTransfers];
}

export const scValByType = (scVal: xdr.ScVal) => {
  switch (scVal.switch()) {
    case xdr.ScValType.scvAddress(): {
      const address = scVal.address();
      const addressType = address.switch();
      if (addressType.name === "scAddressTypeAccount") {
        return StrKey.encodeEd25519PublicKey(address.accountId().ed25519());
      }
      return StrKey.encodeContract(address.contractId());
    }

    case xdr.ScValType.scvBool(): {
      return scVal.b();
    }

    case xdr.ScValType.scvBytes(): {
      return JSON.stringify(scVal.bytes().toJSON().data);
    }

    case xdr.ScValType.scvContractInstance(): {
      const instance = scVal.instance();
      return instance.executable().wasmHash()?.toString();
    }

    case xdr.ScValType.scvError(): {
      const error = scVal.error();
      return error.value();
    }

    case xdr.ScValType.scvTimepoint():
    case xdr.ScValType.scvDuration():
    case xdr.ScValType.scvI128():
    case xdr.ScValType.scvI256():
    case xdr.ScValType.scvI32():
    case xdr.ScValType.scvI64():
    case xdr.ScValType.scvU128():
    case xdr.ScValType.scvU256():
    case xdr.ScValType.scvU32():
    case xdr.ScValType.scvU64(): {
      return scValToNative(scVal).toString();
    }

    case xdr.ScValType.scvLedgerKeyNonce():
    case xdr.ScValType.scvLedgerKeyContractInstance(): {
      if (scVal.switch().name === "scvLedgerKeyNonce") {
        const val = scVal.nonceKey().nonce();
        return val.toString();
      }
      return scVal.value();
    }

    case xdr.ScValType.scvVec():
    case xdr.ScValType.scvMap(): {
      return JSON.stringify(
        scValToNative(scVal),
        (_, val) => (typeof val === "bigint" ? val.toString() : val),
        2,
      );
    }

    case xdr.ScValType.scvString():
    case xdr.ScValType.scvSymbol(): {
      const native = scValToNative(scVal);
      if (native.constructor === "Uint8Array") {
        return native.toString();
      }
      return native;
    }

    case xdr.ScValType.scvVoid(): {
      return null;
    }

    default:
      return null;
  }
};

export function getInvocationDetails(
  invocation: xdr.SorobanAuthorizedInvocation,
) {
  const invocations = [
    getInvocationArgs(invocation),
    ...invocation.subInvocations().map(getInvocationArgs),
  ];
  return invocations.filter(isInvocationArg);
}

export interface FnArgsInvoke {
  type: "invoke";
  fnName: string;
  contractId: string;
  args: xdr.ScVal[];
}

export interface FnArgsCreateWasm {
  type: "wasm";
  salt: string;
  hash: string;
  address: string;
}

export interface FnArgsCreateSac {
  type: "sac";
  asset: string;
}

type InvocationArgs = FnArgsInvoke | FnArgsCreateWasm | FnArgsCreateSac;

const isInvocationArg = (
  invocation: InvocationArgs | undefined,
): invocation is InvocationArgs => !!invocation;

function getInvocationArgs(
  invocation: xdr.SorobanAuthorizedInvocation,
): InvocationArgs | undefined {
  const fn = invocation.function();

  switch (fn.switch().value) {
    // sorobanAuthorizedFunctionTypeContractFn
    case 0: {
      const _invocation = fn.contractFn();
      const contractId = StrKey.encodeContract(
        _invocation.contractAddress().contractId(),
      );
      const fnName = _invocation.functionName().toString();
      const args = _invocation.args();
      return { fnName, contractId, args, type: "invoke" };
    }

    // sorobanAuthorizedFunctionTypeCreateContractHostFn
    case 1: {
      const _invocation = fn.createContractHostFn();
      const [exec, preimage] = [
        _invocation.executable(),
        _invocation.contractIdPreimage(),
      ];

      switch (exec.switch().value) {
        // contractExecutableWasm
        case 0: {
          const details = preimage.fromAddress();

          return {
            type: "wasm",
            salt: details.salt().toString("hex"),
            hash: exec.wasmHash().toString("hex"),
            address: Address.fromScAddress(details.address()).toString(),
          };
        }

        // contractExecutableStellarAsset
        case 1:
          return {
            type: "sac",
            asset: Asset.fromOperation(preimage.fromAsset()).toString(),
          };

        default:
          throw new Error(`unknown creation type: ${JSON.stringify(exec)}`);
      }
    }

    default: {
      return undefined;
    }
  }
}
