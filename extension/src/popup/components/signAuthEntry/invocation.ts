import { Asset, Address, scValToNative, xdr } from "soroban-client";

interface RootOutput {
  type: string;
  args: Record<string, any>;
  subInvocations: RootOutput[];
}

export function buildInvocationTree(root: xdr.SorobanAuthorizedInvocation) {
  const fn = root.function();
  const output = {} as RootOutput;

  switch (fn.switch().value) {
    // sorobanAuthorizedFunctionTypeContractFn
    case 0: {
      const inner = fn.value() as xdr.InvokeContractArgs;
      output.type = "execute";
      output.args = {
        source: Address.fromScAddress(inner.contractAddress()).toString(),
        function: inner.functionName(),
        args: inner.args().map((arg) => scValToNative(arg).toString()),
      };
      break;
    }

    // sorobanAuthorizedFunctionTypeCreateContractHostFn
    case 1: {
      const inner = fn.value() as xdr.CreateContractArgs;
      output.type = "create";
      output.args = {
        type: "sac",
      };

      // If the executable is a WASM, the preimage MUST be an address. If it's a
      // token, the preimage MUST be an asset. This is a cheeky way to check
      // that, because wasm=0, address=1 and token=1, asset=0 in the XDR switch
      // values.
      //
      // The first part may not be true in V2, but we'd need to update this code
      // anyway so it can still be an error.
      const [exec, preimage] = [inner.executable(), inner.contractIdPreimage()];
      if (!exec.switch().value !== !!preimage.switch().value) {
        throw new Error(
          `creation function appears invalid: ${JSON.stringify(inner)}`,
        );
      }

      switch (exec.switch().value) {
        // contractExecutableWasm
        case 0: {
          const details = preimage.fromAddress();

          output.args.type = "wasm";
          output.args.args = {
            hash: exec.wasmHash().toString("hex"),
            address: Address.fromScAddress(details.address()).toString(),
            salt: details.salt().toString("hex"),
          };
          break;
        }

        // contractExecutableToken
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

  output.subInvocations = root
    .subInvocations()
    .map((i) => buildInvocationTree(i));
  return output;
}
