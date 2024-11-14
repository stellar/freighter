import { Address, Keypair, xdr } from "stellar-sdk";

import { getInvocationArgs } from "../soroban";
import { TEST_PUBLIC_KEY } from "popup/__testHelpers__";

describe("getInvocationArgs", () => {
  it("can render a create contract v1", () => {
    const assetCode = "KHL";
    const assetType = new xdr.AlphaNum4({
      assetCode: Buffer.from(assetCode),
      issuer: Keypair.fromPublicKey(TEST_PUBLIC_KEY).xdrAccountId(),
    });
    const args = new xdr.CreateContractArgs({
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAsset(
        xdr.Asset.assetTypeCreditAlphanum4(assetType),
      ),
      executable: xdr.ContractExecutable.contractExecutableStellarAsset(),
    });
    const authorizedFn =
      xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeCreateContractHostFn(
        args,
      );
    const authorizedInvocation = new xdr.SorobanAuthorizedInvocation({
      function: authorizedFn,
      subInvocations: [],
    });
    const invocationArgs = getInvocationArgs(authorizedInvocation);
    expect(invocationArgs).toEqual({
      type: "sac",
      asset: `${assetCode}:${TEST_PUBLIC_KEY}`,
    });
  });
  it("can render a create contract v2", () => {
    const assetCode = "KHL";
    const assetType = new xdr.AlphaNum4({
      assetCode: Buffer.from(assetCode),
      issuer: Keypair.fromPublicKey(TEST_PUBLIC_KEY).xdrAccountId(),
    });
    const args = new xdr.CreateContractArgsV2({
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAsset(
        xdr.Asset.assetTypeCreditAlphanum4(assetType),
      ),
      executable: xdr.ContractExecutable.contractExecutableStellarAsset(),
      constructorArgs: [new Address(TEST_PUBLIC_KEY).toScVal()],
    });
    const authorizedFn =
      xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeCreateContractV2HostFn(
        args,
      );
    const authorizedInvocation = new xdr.SorobanAuthorizedInvocation({
      function: authorizedFn,
      subInvocations: [],
    });
    const invocationArgs = getInvocationArgs(authorizedInvocation);
    expect(invocationArgs).toEqual({
      type: "sac",
      asset: `${assetCode}:${TEST_PUBLIC_KEY}`,
      args: args.constructorArgs(),
    });
  });
});
