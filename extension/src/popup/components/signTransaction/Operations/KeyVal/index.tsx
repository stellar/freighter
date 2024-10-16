import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  Asset,
  Claimant,
  LiquidityPoolAsset,
  nativeToScVal,
  Operation,
  Signer,
  SignerKeyOptions,
  StrKey,
  xdr,
} from "stellar-sdk";
import { Loader } from "@stellar/design-system";
import { getContractSpec } from "@shared/api/internal";

import { CLAIM_PREDICATES } from "constants/transaction";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { CopyValue } from "popup/components/CopyValue";
import { truncateString } from "helpers/stellar";
import { formattedBuffer } from "popup/helpers/formatters";

import {
  buildInvocationTree,
  getCreateContractArgs,
  InvocationTree,
  scValByType,
} from "popup/helpers/soroban";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import "./styles.scss";

export const KeyValueList = ({
  operationKey,
  operationValue,
}: {
  operationKey: string;
  operationValue: string | number | React.ReactNode;
}) => (
  <div className="Operations__pair" data-testid="OperationKeyVal">
    <div className="Operations__pair--key" data-testid="OperationKeyVal__key">
      {operationKey}
    </div>
    <div
      className="Operations__pair--value"
      data-testid="OperationKeyVal__value"
    >
      {operationValue}
    </div>
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
            fnName={_invocation.args.function}
            contractId={_invocation.args.source}
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
                operationValue={truncateString(
                  _invocation.args.wasm.salt as string,
                )}
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
          operationValue={line.assetA.getCode()}
        />
        <KeyValueList
          operationKey={t("Asset B")}
          operationValue={line.assetB.getCode()}
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

export const KeyValueInvokeHostFnArgs = ({
  args,
  contractId,
  fnName,
}: {
  args: xdr.ScVal[];
  contractId?: string;
  fnName?: string;
}) => {
  const [isLoading, setLoading] = React.useState(true);
  const [argNames, setArgNames] = React.useState([] as string[]);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  React.useEffect(() => {
    async function getSpec(id: string, name: string) {
      try {
        const spec = await getContractSpec({ contractId: id, networkDetails });
        const { definitions } = spec;
        const invocationSpec = definitions[name];
        const argNamesPositional = invocationSpec.properties?.args
          ?.required as string[];
        setArgNames(argNamesPositional);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    }

    if (contractId && fnName) {
      getSpec(contractId, fnName);
    } else {
      setLoading(false);
    }
  }, [contractId, fnName, networkDetails]);

  return isLoading ? (
    <div className="Operations__pair--invoke" data-testid="OperationKeyVal">
      <Loader size="1rem" />
    </div>
  ) : (
    <div className="Operations__pair--invoke" data-testid="OperationKeyVal">
      <div>Parameters</div>
      <div className="OperationParameters" data-testid="OperationParameters">
        {args.map((arg, ind) => (
          <div
            className="Parameter"
            key={arg.toXDR().toString()}
            data-testid="Parameter"
          >
            {argNames[ind] && (
              <div data-testid="ParameterName">{argNames[ind]}</div>
            )}
            {arg.switch() === xdr.ScValType.scvAddress() ? (
              <CopyValue
                value={scValByType(arg)}
                displayValue={scValByType(arg)}
              />
            ) : (
              scValByType(arg)
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const KeyValueInvokeHostFn = ({
  op,
}: {
  op: Operation.InvokeHostFunction;
}) => {
  const { t } = useTranslation();
  const hostfn = op.func;

  function renderDetails() {
    switch (hostfn.switch()) {
      case xdr.HostFunctionType.hostFunctionTypeCreateContractV2():
      case xdr.HostFunctionType.hostFunctionTypeCreateContract(): {
        const createContractArgs = getCreateContractArgs(hostfn);
        const preimage = createContractArgs.contractIdPreimage;
        const executable = createContractArgs.executable;
        const createV2Args = createContractArgs.constructorArgs;
        const executableType = executable.switch().name;
        const wasmHash = executable.wasmHash();

        if (preimage.switch().name === "contractIdPreimageFromAddress") {
          const preimageFromAddress = preimage.fromAddress();
          const address = preimageFromAddress.address();
          const salt = preimageFromAddress.salt().toString("hex");

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
                <KeyValueList
                  operationKey={t("Salt")}
                  operationValue={
                    <CopyValue
                      value={salt}
                      displayValue={truncateString(salt, 8)}
                    />
                  }
                />
                <KeyValueList
                  operationKey={t("Executable Type")}
                  operationValue={executableType}
                />
                {executable.wasmHash() && (
                  <KeyValueList
                    operationKey={t("Executable Wasm Hash")}
                    operationValue={
                      <CopyValue
                        value={wasmHash.toString("hex")}
                        displayValue={truncateString(
                          wasmHash.toString("hex"),
                          8,
                        )}
                      />
                    }
                  />
                )}
                {createV2Args && (
                  <KeyValueInvokeHostFnArgs args={createV2Args} />
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
              <KeyValueList
                operationKey={t("Salt")}
                operationValue={
                  <CopyValue
                    value={salt}
                    displayValue={truncateString(salt, 8)}
                  />
                }
              />
              <KeyValueList
                operationKey={t("Executable Type")}
                operationValue={executableType}
              />
              {executable.wasmHash() && (
                <KeyValueList
                  operationKey={t("Executable Wasm Hash")}
                  operationValue={
                    <CopyValue
                      value={wasmHash.toString("hex")}
                      displayValue={truncateString(wasmHash.toString("hex"), 8)}
                    />
                  }
                />
              )}
              {createV2Args && <KeyValueInvokeHostFnArgs args={createV2Args} />}
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
            preimageFromAsset.switch().name === "assetTypeCreditAlphanum12" ? (
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
            ) : null}

            <KeyValueList
              operationKey={t("Executable Type")}
              operationValue={executableType}
            />
            {executable.wasmHash() && (
              <KeyValueList
                operationKey={t("Executable Wasm Hash")}
                operationValue={
                  <CopyValue
                    value={wasmHash.toString("hex")}
                    displayValue={truncateString(wasmHash.toString("hex"), 8)}
                  />
                }
              />
            )}
            {createV2Args && <KeyValueInvokeHostFnArgs args={createV2Args} />}
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
              operationValue={
                <CopyValue
                  value={contractId}
                  displayValue={truncateString(contractId, 6)}
                />
              }
            />
            <KeyValueList
              operationKey={t("Function Name")}
              operationValue={fnName}
            />
            <KeyValueInvokeHostFnArgs
              args={args}
              contractId={contractId}
              fnName={fnName}
            />
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
