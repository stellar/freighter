import {
  Address,
  Keypair,
  Operation,
  scValToNative,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";
import BigNumber from "bignumber.js";

import {
  getInvocationArgs,
  buildInvocationTree,
  getAvailableBalance,
} from "../soroban";
import { TEST_PUBLIC_KEY } from "popup/__testHelpers__";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";

describe("getInvocationArgs", () => {
  it("can parse a create contract v1 xdr class", () => {
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
  it("can parse a create contract v2 xdr class", () => {
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
  it("can parse a create contract v2 xdr for the deployer pattern", () => {
    const xdr =
      "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";
    const tx = TransactionBuilder.fromXDR(
      xdr,
      TESTNET_NETWORK_DETAILS.networkPassphrase,
    );
    const op = tx.operations[0];
    for (const authEntry of op.auth || []) {
      const rootInvocation = authEntry.rootInvocation();
      const tree = buildInvocationTree(rootInvocation);
      expect(tree.type).toEqual("execute");
      expect(tree.args.source).toEqual(
        "CDWNAFG6Q2MIE2LJKLF7GZPXXVKHH3KU7WDAF7QRNAIWU4X3KAEMLZTN",
      );
      expect(tree.args.function).toEqual("deploy");
      for (const subInvocation of tree.invocations) {
        if (subInvocation.type === "create") {
          expect(subInvocation.args.constructorArgs).toStrictEqual([]);
        }
      }
    }
  });
  it("can calculate the available balance of XLM", () => {
    const availableBalance = getAvailableBalance({
      assetCanonical: "native",
      balances: [
        {
          token: { type: "native", code: "XLM" },
          total: new BigNumber("2.5"),
          available: new BigNumber("2.5"),
          minimumBalance: "1",
        },
      ],
      subentryCount: 0,
      recommendedFee: ".11",
    });
    expect(availableBalance).toEqual("1.39");
  });
  it("can calculate the available balance of XLM if the minimum balance is a BigNumber (custom network)", () => {
    const availableBalance = getAvailableBalance({
      assetCanonical: "native",
      balances: [
        {
          token: { type: "native", code: "XLM" },
          total: new BigNumber("2.5"),
          available: new BigNumber("2.5"),
          minimumBalance: new BigNumber("1"),
        },
      ],
      subentryCount: 0,
      recommendedFee: ".11",
    });
    expect(availableBalance).toEqual("1.39");
  });
  it("can calculate the available balance of XLM when there is not enough balance to cover the recommended fee", () => {
    const availableBalance = getAvailableBalance({
      assetCanonical: "native",
      balances: [
        {
          token: { type: "native", code: "XLM" },
          total: new BigNumber("3"),
          available: new BigNumber("3"),
          minimumBalance: "1.5",
        },
      ],
      subentryCount: 1,
      recommendedFee: "300",
    });
    expect(availableBalance).toEqual("0");
  });
  it("can calculate the available balance if the asset is not in the balances", () => {
    const availableBalance = getAvailableBalance({
      assetCanonical:
        "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      balances: [
        {
          token: { type: "native", code: "XLM" },
          total: new BigNumber("50"),
          available: new BigNumber("50"),
        },
      ],
      subentryCount: 1,
      recommendedFee: "300",
    });
    expect(availableBalance).toEqual("0");
  });
  it("can calculate the available balance of another asset correctly", () => {
    const availableBalance = getAvailableBalance({
      assetCanonical:
        "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      balances: [
        {
          token: {
            code: "USDC",
            issuer: {
              key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
            },
          },
          total: new BigNumber("100"),
          available: new BigNumber("100"),
        },
      ],
      subentryCount: 5,
      recommendedFee: ".11",
    });
    expect(availableBalance).toEqual("100");
  });
});
