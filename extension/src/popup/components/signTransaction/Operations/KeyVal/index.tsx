import React from "react";
import { useTranslation } from "react-i18next";
import {
  Asset,
  Claimant,
  LiquidityPoolAsset,
  nativeToScVal,
  Operation,
  scValToNative,
  Signer,
  SignerKeyOptions,
  StrKey,
  xdr,
} from "stellar-sdk";

import { CLAIM_PREDICATES } from "constants/transaction";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { truncatedPublicKey, truncateString } from "helpers/stellar";

import { buildInvocationTree, InvocationTree } from "popup/helpers/soroban";
import "./styles.scss";

const ScValByType = ({ scVal }: { scVal: xdr.ScVal }) => {
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
      return scVal.bytes().toString();
    }

    case xdr.ScValType.scvContractInstance(): {
      const instance = scVal.instance();
      return instance.executable().wasmHash()?.toString();
    }

    case xdr.ScValType.scvError(): {
      const error = scVal.error();
      return `${error.contractCode()} - ${error.code().name}`;
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
      return scValToNative(scVal);
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

const formattedBuffer = (data: Buffer) =>
  truncatedPublicKey(Buffer.from(data).toString("hex").toUpperCase());

export const KeyValueList = ({
  operationKey,
  operationValue,
}: {
  operationKey: string;
  operationValue: string | number | React.ReactNode;
}) => (
  <div className="Operations__pair" data-testid="OperationKeyVal">
    <div>{operationKey}</div>
    <div>{operationValue}</div>
  </div>
);

export const KeyValueWithPublicKey = ({
  operationKey,
  operationValue,
}: {
  operationKey: string;
  operationValue: string;
}) => (
  <KeyValueList
    operationKey={operationKey}
    operationValue={<KeyIdenticon publicKey={operationValue} isSmall />}
  />
);

const InvocationByType = ({ _invocation }: { _invocation: InvocationTree }) => {
  const { t } = useTranslation();
  switch (_invocation.type) {
    case "execute": {
      return (
        <>
          <KeyValueWithPublicKey
            operationKey={t("Source")}
            operationValue={_invocation.args.source}
          />
          <KeyValueList
            operationKey={t("Function Name")}
            operationValue={_invocation.args.function}
          />
          <KeyValueInvokeHostFnArgs
            args={_invocation.args.args.map(nativeToScVal)}
          />
        </>
      );
    }

    case "create": {
      return (
        <>
          <KeyValueList
            operationKey={t("Type")}
            operationValue={_invocation.args.type}
          />
          {_invocation.args.wasm && (
            <>
              <KeyValueList
                operationKey={t("Salt")}
                operationValue={_invocation.args.wasm.salt}
              />
              <KeyValueList
                operationKey={t("Hash")}
                operationValue={_invocation.args.wasm.hash}
              />
              <KeyValueWithPublicKey
                operationKey={t("Address")}
                operationValue={_invocation.args.wasm.address}
              />
            </>
          )}
          {_invocation.args.asset && (
            <KeyValueList
              operationKey={t("Asset")}
              operationValue={_invocation.args.asset}
            />
          )}
        </>
      );
    }

    default:
      return <></>;
  }
};

export const KeyValueInvocation = ({
  invocation,
}: {
  invocation: InvocationTree;
}) => (
  <>
    <KeyValueList operationKey="Sub Invocation" operationValue="" />
    <InvocationByType _invocation={invocation} />
    {invocation.invocations.map((subInvocation) => (
      <KeyValueInvocation key={subInvocation.type} invocation={subInvocation} />
    ))}
  </>
);

export const KeyValueAuthEntry = ({
  entry,
}: {
  entry: xdr.SorobanAuthorizationEntry;
}) => {
  const invocation = entry.rootInvocation();
  const invocationTree = buildInvocationTree(invocation);

  return (
    <>
      <KeyValueList operationKey="Root Invocation" operationValue="" />
      <InvocationByType _invocation={invocationTree} />
      {invocationTree.invocations.map((subInvocation) => (
        <KeyValueInvocation
          key={subInvocation.type}
          invocation={subInvocation}
        />
      ))}
    </>
  );
};

export const KeyValueSigner = ({ signer }: { signer: Signer }) => {
  const { t } = useTranslation();

  function renderSignerType() {
    if ("ed25519PublicKey" in signer) {
      return (
        <KeyValueWithPublicKey
          operationKey={t("Signer")}
          operationValue={signer.ed25519PublicKey}
        />
      );
    }

    if ("sha256Hash" in signer) {
      return (
        <KeyValueList
          operationKey={t("Signer")}
          operationValue={formattedBuffer(signer.sha256Hash)}
        />
      );
    }

    if ("preAuthTx" in signer) {
      return (
        <KeyValueList
          operationKey={t("Signer")}
          operationValue={formattedBuffer(signer.preAuthTx)}
        />
      );
    }

    if ("ed25519SignedPayload" in signer) {
      return (
        <KeyValueList
          operationKey={t("Signer")}
          operationValue={truncateString(signer.ed25519SignedPayload)}
        />
      );
    }
    return <></>;
  }

  return (
    <>
      {renderSignerType()}
      <KeyValueList
        operationKey={t("Signer Weight")}
        operationValue={signer.weight}
      />
    </>
  );
};

export const KeyValueLine = ({
  line,
}: {
  line: Asset | LiquidityPoolAsset;
}) => {
  const { t } = useTranslation();
  if ("assetA" in line) {
    return (
      <>
        <KeyValueList
          operationKey={t("Asset A")}
          operationValue={line.assetA}
        />
        <KeyValueList
          operationKey={t("Asset B")}
          operationValue={line.assetB}
        />
        <KeyValueList operationKey={t("Fee")} operationValue={line.fee} />
      </>
    );
  }
  return (
    <KeyValueList operationKey={t("Asset Code")} operationValue={line.code} />
  );
};

export const KeyValueClaimants = ({ claimants }: { claimants: Claimant[] }) => {
  const { t } = useTranslation();

  function claimPredicateValue(
    predicate: xdr.ClaimPredicate,
    hideKey: boolean = false,
  ): React.ReactNode {
    switch (predicate.switch().name) {
      case "claimPredicateUnconditional": {
        return (
          <KeyValueList
            operationKey={hideKey ? "" : t("Predicate")}
            operationValue={CLAIM_PREDICATES[predicate.switch().name]}
          />
        );
      }

      case "claimPredicateAnd": {
        return (
          <>
            <KeyValueList
              operationKey={hideKey ? "" : t("Predicate")}
              operationValue={CLAIM_PREDICATES[predicate.switch().name]}
            />
            {predicate.andPredicates().map((p) => claimPredicateValue(p, true))}
          </>
        );
      }

      case "claimPredicateBeforeAbsoluteTime": {
        return (
          <>
            <KeyValueList
              operationKey={hideKey ? "" : t("Predicate")}
              operationValue={CLAIM_PREDICATES[predicate.switch().name]}
            />
            <KeyValueList
              operationKey=""
              operationValue={predicate.absBefore().toString()}
            />
          </>
        );
      }

      case "claimPredicateBeforeRelativeTime": {
        return (
          <>
            <KeyValueList
              operationKey={hideKey ? "" : t("Predicate")}
              operationValue={CLAIM_PREDICATES[predicate.switch().name]}
            />
            <KeyValueList
              operationKey=""
              operationValue={predicate.relBefore().toString()}
            />
          </>
        );
      }

      case "claimPredicateNot": {
        const not = predicate.notPredicate();
        if (not) {
          return (
            <>
              <KeyValueList
                operationKey={hideKey ? "" : t("Predicate")}
                operationValue={CLAIM_PREDICATES[predicate.switch().name]}
              />
              {claimPredicateValue(not, true)}
            </>
          );
        }
        return <></>;
      }

      case "claimPredicateOr": {
        return (
          <>
            <KeyValueList
              operationKey={hideKey ? "" : t("Predicate")}
              operationValue={CLAIM_PREDICATES[predicate.switch().name]}
            />
            {predicate.orPredicates().map((p) => claimPredicateValue(p, true))}
          </>
        );
      }

      default: {
        return <></>;
      }
    }
  }
  return (
    <>
      {claimants.map((claimant, i) => (
        <React.Fragment
          key={claimant.destination + claimant.predicate.switch().name}
        >
          <KeyValueWithPublicKey
            operationKey={t(`Destination #${i + 1}`)}
            operationValue={claimant.destination}
          />
          {claimPredicateValue(claimant.predicate)}
        </React.Fragment>
      ))}
    </>
  );
};

export const KeyValueSignerKeyOptions = ({
  signer,
}: {
  signer: SignerKeyOptions;
}) => {
  const { t } = useTranslation();

  if ("ed25519PublicKey" in signer) {
    return (
      <KeyValueWithPublicKey
        operationKey={t("Signer Key")}
        operationValue={signer.ed25519PublicKey}
      />
    );
  }

  if ("sha256Hash" in signer) {
    return (
      <KeyValueList
        operationKey={t("Signer Sha256 Hash")}
        operationValue={signer.sha256Hash}
      />
    );
  }

  if ("preAuthTx" in signer) {
    return (
      <KeyValueList
        operationKey={t("Pre Auth Transaction")}
        operationValue={signer.preAuthTx}
      />
    );
  }

  if ("ed25519SignedPayload" in signer) {
    return (
      <KeyValueList
        operationKey={t("Signed Payload")}
        operationValue={signer.ed25519SignedPayload}
      />
    );
  }
  return <></>;
};

export const KeyValueInvokeHostFnArgs = ({ args }: { args: xdr.ScVal[] }) => (
  <div className="Operations__pair--invoke" data-testid="OperationKeyVal">
    <div>Parameters</div>
    <div className="OperationParameters">
      {args.map((arg) => (
        <div className="Parameter">
          <ScValByType scVal={arg} />
        </div>
      ))}
    </div>
  </div>
);

export const KeyValueInvokeHostFn = ({
  op,
}: {
  op: Operation.InvokeHostFunction;
}) => {
  const { t } = useTranslation();
  const hostfn = op.func;

  function renderDetails() {
    switch (hostfn.switch()) {
      case xdr.HostFunctionType.hostFunctionTypeCreateContract(): {
        const createContractArgs = hostfn.createContract();
        const preimage = createContractArgs.contractIdPreimage();
        const executable = createContractArgs.executable();
        const executableType = executable.switch().name;

        if (preimage.switch().name === "contractIdPreimageFromAddress") {
          const preimageFromAddress = preimage.fromAddress();
          const address = preimageFromAddress.address();
          const salt = preimageFromAddress.salt().toString();

          const addressType = address.switch();
          if (addressType.name === "scAddressTypeAccount") {
            const accountId = StrKey.encodeEd25519PublicKey(
              address.accountId().ed25519(),
            );
            return (
              <>
                <KeyValueList
                  operationKey={t("Invocation Type")}
                  operationValue="Create Contract"
                />
                <KeyValueWithPublicKey
                  operationKey={t("Account ID")}
                  operationValue={accountId}
                />
                <KeyValueList operationKey={t("Salt")} operationValue={salt} />
                <KeyValueList
                  operationKey={t("Executable Type")}
                  operationValue={executableType}
                />
                {executable.wasmHash() && (
                  <KeyValueList
                    operationKey={t("Executable Wasm Hash")}
                    operationValue={executable.wasmHash().toString()}
                  />
                )}
              </>
            );
          }
          const contractId = StrKey.encodeContract(address.contractId());
          return (
            <>
              <KeyValueList
                operationKey={t("Invocation Type")}
                operationValue="Create Contract"
              />
              <KeyValueWithPublicKey
                operationKey={t("Contract ID")}
                operationValue={contractId}
              />
              <KeyValueList operationKey={t("Salt")} operationValue={salt} />
              <KeyValueList
                operationKey={t("Executable Type")}
                operationValue={executableType}
              />
              {executable.wasmHash() && (
                <KeyValueList
                  operationKey={t("Executable Wasm Hash")}
                  operationValue={executable.wasmHash().toString()}
                />
              )}
            </>
          );
        }

        // contractIdPreimageFromAsset
        const preimageFromAsset = preimage.fromAsset();
        const preimageValue = preimageFromAsset.value()!;

        return (
          <>
            <KeyValueList
              operationKey={t("Invocation Type")}
              operationValue="Create Contract"
            />
            {preimageFromAsset.switch().name === "assetTypeCreditAlphanum4" ||
              (preimageFromAsset.switch().name ===
                "assetTypeCreditAlphanum12" && (
                <>
                  <KeyValueList
                    operationKey={t("Asset Code")}
                    operationValue={(preimageValue as xdr.AlphaNum12)
                      .assetCode()
                      .toString()}
                  />
                  <KeyValueList
                    operationKey={t("Issuer")}
                    operationValue={StrKey.encodeEd25519PublicKey(
                      (preimageValue as xdr.AlphaNum12).issuer().ed25519(),
                    )}
                  />
                </>
              ))}

            <KeyValueList
              operationKey={t("Executable Type")}
              operationValue={executableType}
            />
            {executable.wasmHash() && (
              <KeyValueList
                operationKey={t("Executable Wasm Hash")}
                operationValue={executable.wasmHash().toString()}
              />
            )}
          </>
        );
      }

      case xdr.HostFunctionType.hostFunctionTypeInvokeContract(): {
        const invocation = hostfn.invokeContract();
        const contractId = StrKey.encodeContract(
          invocation.contractAddress().contractId(),
        );
        const fnName = invocation.functionName().toString();
        const args = invocation.args();

        return (
          <>
            <KeyValueList
              operationKey={t("Invocation Type")}
              operationValue="Invoke Contract"
            />
            <KeyValueList
              operationKey={t("Contract ID")}
              operationValue={truncateString(contractId)}
            />
            <KeyValueList
              operationKey={t("Function Name")}
              operationValue={fnName}
            />
            <KeyValueInvokeHostFnArgs args={args} />
          </>
        );
      }

      case xdr.HostFunctionType.hostFunctionTypeUploadContractWasm(): {
        const wasm = hostfn.wasm().toString();
        return (
          <>
            <KeyValueList
              operationKey={t("Invocation Type")}
              operationValue="Upload Contract Wasm"
            />
            <KeyValueList operationKey={t("wasm")} operationValue={wasm} />
          </>
        );
      }

      default:
        return <></>;
    }
  }
  return renderDetails();
};

export const PathList = ({ paths }: { paths: Asset[] }) => {
  const { t } = useTranslation();

  return (
    <>
      <div>{t("Paths")}: </div>
      {paths.map(({ code, issuer }, i) => (
        <div className="Operations--list--item" key={`${code} ${i + 1}`}>
          <div>#{i + 1}</div>
          <KeyValueList operationKey="Asset Code" operationValue={code} />
          {issuer ? (
            <KeyValueList
              operationKey="Issuer"
              operationValue={<KeyIdenticon publicKey={issuer} isSmall />}
            />
          ) : null}
        </div>
      ))}
    </>
  );
};
