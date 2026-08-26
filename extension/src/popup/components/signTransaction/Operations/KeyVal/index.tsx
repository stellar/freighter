import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  Asset,
  Claimant,
  hash,
  LiquidityPoolAsset,
  nativeToScVal,
  Operation,
  Signer,
  StrKey,
  xdr,
} from "stellar-sdk";
import { CopyText, Icon, Loader } from "@stellar/design-system";

import { getContractSpec } from "@shared/api/internal";
import { CLAIM_PREDICATES } from "constants/transaction";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { CopyValue } from "popup/components/CopyValue";
import { truncateString } from "helpers/stellar";
import { useIsLargeWidthScreen } from "helpers/hooks/useIsLargeWidthScreen";
import { formattedBuffer } from "popup/helpers/formatters";

import {
  addressToString,
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
      <span className={"Operations__pair--value-text"}>{operationValue}</span>
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
}) => {
  const { t } = useTranslation();
  return (
    <>
      <KeyValueList operationKey={t("Sub Invocation")} operationValue="" />
      <InvocationByType _invocation={invocation} />
      {invocation.invocations.map((subInvocation) => (
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
    <>
      <KeyValueList operationKey={t("Token Code")} operationValue={line.code} />
      <KeyValueList
        operationKey={t("Token Issuer")}
        operationValue={
          <CopyValue
            value={line.issuer ?? ""}
            displayValue={truncateString(line.issuer ?? "")}
          />
        }
      />{" "}
    </>
  );
};

export const KeyValueClaimants = ({ claimants }: { claimants: Claimant[] }) => {
  const { t } = useTranslation();

  function claimPredicateValue(
    predicate: xdr.ClaimPredicate,
    hideKey: boolean = false,
  ): React.ReactNode {
    switch (predicate.type) {
      case "claimPredicateUnconditional": {
        return (
          <KeyValueList
            operationKey={hideKey ? "" : t("Predicate")}
            operationValue={CLAIM_PREDICATES[predicate.type]}
          />
        );
      }

      case "claimPredicateAnd": {
        return (
          <>
            <KeyValueList
              operationKey={hideKey ? "" : t("Predicate")}
              operationValue={CLAIM_PREDICATES[predicate.type]}
            />
            {predicate.andPredicates.map((p) => claimPredicateValue(p, true))}
          </>
        );
      }

      case "claimPredicateBeforeAbsoluteTime": {
        return (
          <>
            <KeyValueList
              operationKey={hideKey ? "" : t("Predicate")}
              operationValue={CLAIM_PREDICATES[predicate.type]}
            />
            <KeyValueList
              operationKey=""
              operationValue={predicate.absBefore.toString()}
            />
          </>
        );
      }

      case "claimPredicateBeforeRelativeTime": {
        return (
          <>
            <KeyValueList
              operationKey={hideKey ? "" : t("Predicate")}
              operationValue={CLAIM_PREDICATES[predicate.type]}
            />
            <KeyValueList
              operationKey=""
              operationValue={predicate.relBefore.toString()}
            />
          </>
        );
      }

      case "claimPredicateNot": {
        const not = predicate.notPredicate;
        if (not) {
          return (
            <>
              <KeyValueList
                operationKey={hideKey ? "" : t("Predicate")}
                operationValue={CLAIM_PREDICATES[predicate.type]}
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
              operationValue={CLAIM_PREDICATES[predicate.type]}
            />
            {predicate.orPredicates.map((p) => claimPredicateValue(p, true))}
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
        <React.Fragment key={claimant.destination + claimant.predicate.type}>
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

export const KeyValueSignerKeyOptions = ({ signer }: { signer: Signer }) => {
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
        operationValue={formattedBuffer(signer.sha256Hash)}
      />
    );
  }

  if ("preAuthTx" in signer) {
    return (
      <KeyValueList
        operationKey={t("Pre Auth Transaction")}
        operationValue={formattedBuffer(signer.preAuthTx)}
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
  showHeader = true,
  isAuthEntry = false,
}: {
  args: xdr.ScVal[];
  contractId?: string;
  fnName?: string;
  showHeader?: boolean;
  isAuthEntry?: boolean;
}) => {
  const { t } = useTranslation();
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

    if (contractId && fnName && !isAuthEntry) {
      getSpec(contractId, fnName);
    } else {
      setLoading(false);
    }
  }, [contractId, fnName, networkDetails, isAuthEntry]);

  return isLoading ? (
    <div className="Operations__pair--invoke" data-testid="OperationKeyVal">
      <Loader size="1rem" />
    </div>
  ) : (
    <div className="Operations__pair--invoke" data-testid="OperationKeyVal">
      {showHeader && (
        <div className="Operations--header">
          <Icon.BracketsEllipses />
          <span>{t("Parameters")}</span>
        </div>
      )}
      <div className="OperationParameters" data-testid="OperationParameters">
        {args.map((arg, ind) => (
          <CopyText textToCopy={scValByType(arg)} key={arg.toXdr("base64")}>
            <div className="Parameters">
              <div className="ParameterKey" data-testid="ParameterKey">
                {argNames[ind] && argNames[ind]}
                <Icon.Copy01 />
              </div>
              <div className="ParameterValue" data-testid="ParameterValue">
                {scValByType(arg)}
              </div>
            </div>
          </CopyText>
        ))}
      </div>
    </div>
  );
};

/**
 * Explains that a CAP-85 externally managed executable is not pinned by the
 * transaction being signed. Rendered as a full-width banner so the text wraps
 * instead of being truncated in the right-aligned value column.
 */
export const ExternalExecutableNote = () => {
  const { t } = useTranslation();

  return (
    <div className="ExecutableNote" data-testid="ExternalExecutableNote">
      <Icon.InfoCircle aria-hidden="true" />
      <span>
        {t(
          "This contract's code is managed by the owner contract above and can change after you sign.",
        )}
      </span>
    </div>
  );
};

/**
 * Renders the executable of a contract-creation host function. CAP-85
 * (protocol 28) adds a third arm whose code lives behind a reference into
 * another contract's storage -- we show the owner and tag that identify the
 * reference, and deliberately no wasm hash, because the owner can change the
 * code the reference resolves to after this transaction is signed.
 */
const ExecutableDetails = ({
  executable,
}: {
  executable: xdr.ContractExecutable;
}) => {
  const { t } = useTranslation();

  const wasmHash =
    executable.type === "contractExecutableWasm"
      ? xdr.encodeBytes(executable.wasmHash.toBytes(), "hex")
      : null;
  const externalRef =
    executable.type === "contractExecutableExternalRef"
      ? executable.externalRef
      : null;
  const externalRefOwner = externalRef
    ? addressToString(externalRef.executableOwner)
    : null;

  return (
    <>
      <KeyValueList
        operationKey={t("Executable Type")}
        operationValue={executable.type}
      />
      {wasmHash && (
        <KeyValueList
          operationKey={t("Executable Wasm Hash")}
          operationValue={
            <CopyValue
              value={wasmHash}
              displayValue={truncateString(wasmHash, 8)}
            />
          }
        />
      )}
      {externalRef && externalRefOwner && (
        <>
          <KeyValueList
            operationKey={t("Executable Owner")}
            operationValue={
              <CopyValue
                value={externalRefOwner}
                displayValue={truncateString(externalRefOwner)}
              />
            }
          />
          <KeyValueList
            operationKey={t("Executable Tag")}
            operationValue={externalRef.tag.toString()}
          />
          <ExternalExecutableNote />
        </>
      )}
    </>
  );
};

export const KeyValueInvokeHostFn = ({
  op,
}: {
  op: Operation.InvokeHostFunction;
}) => {
  const { t } = useTranslation();
  const isWide = useIsLargeWidthScreen();
  const hostfn = op.func;

  function renderDetails() {
    switch (hostfn.type) {
      case "hostFunctionTypeCreateContractV2":
      case "hostFunctionTypeCreateContract": {
        const createContractArgs = getCreateContractArgs(hostfn);
        const preimage = createContractArgs.contractIdPreimage;
        const executable = createContractArgs.executable;
        const createV2Args = createContractArgs.constructorArgs;

        if (preimage.type === "contractIdPreimageFromAddress") {
          const preimageFromAddress = preimage.fromAddress;
          const address = preimageFromAddress.address;
          const salt = xdr.encodeBytes(
            preimageFromAddress.salt.toBytes(),
            "hex",
          );

          if (address.type === "scAddressTypeAccount") {
            const accountId = StrKey.encodeEd25519PublicKey(
              address.accountId.ed25519.toBytes(),
            );
            return (
              <>
                <KeyValueList
                  operationKey={t("Type")}
                  operationValue={t("Create Contract")}
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
                <ExecutableDetails executable={executable} />
              </>
            );
          }
          const contractId = addressToString(address);
          return (
            <>
              <KeyValueList
                operationKey={t("Type")}
                operationValue={t("Create Contract")}
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
              <ExecutableDetails executable={executable} />
              {createV2Args && <KeyValueInvokeHostFnArgs args={createV2Args} />}
            </>
          );
        }

        // contractIdPreimageFromAsset
        const preimageFromAsset = preimage.fromAsset;
        const preimageValue = preimageFromAsset.value!;

        return (
          <>
            <KeyValueList
              operationKey={t("Type")}
              operationValue={t("Create Contract")}
            />
            {preimageFromAsset.type === "assetTypeCreditAlphanum4" ||
            preimageFromAsset.type === "assetTypeCreditAlphanum12" ? (
              <>
                <KeyValueList
                  operationKey={t("Asset Code")}
                  operationValue={
                    // v17: BytesValue.toString() base64-encodes; toJson()
                    // yields the trimmed ASCII asset code.
                    (
                      preimageValue as xdr.AlphaNum12
                    ).assetCode.toJson() as string
                  }
                />
                <KeyValueList
                  operationKey={t("Issuer")}
                  operationValue={
                    <CopyValue
                      value={StrKey.encodeEd25519PublicKey(
                        (
                          preimageValue as xdr.AlphaNum12
                        ).issuer.ed25519.toBytes(),
                      )}
                      displayValue={truncateString(
                        StrKey.encodeEd25519PublicKey(
                          (
                            preimageValue as xdr.AlphaNum12
                          ).issuer.ed25519.toBytes(),
                        ),
                      )}
                    />
                  }
                />
              </>
            ) : null}

            <ExecutableDetails executable={executable} />
            {createV2Args && <KeyValueInvokeHostFnArgs args={createV2Args} />}
          </>
        );
      }

      case "hostFunctionTypeInvokeContract": {
        const invocation = hostfn.invokeContract;
        const contractId = addressToString(invocation.contractAddress);

        const fnName = invocation.functionName.toString();

        return (
          <>
            <KeyValueList
              operationKey={t("Type")}
              operationValue={t("Invoke Contract")}
            />
            <div className="Operations__pair" data-testid="OperationKeyVal">
              <div
                className="Operations__pair--key"
                data-testid="OperationKeyVal__key"
              >
                {t("Contract ID")}
              </div>
              <div
                className={`Operations__pair--value${isWide ? " Operations__pair--value-expanded" : ""}`}
                data-testid="OperationKeyVal__value"
              >
                <span className="Operations__pair--value-text">
                  <CopyValue
                    value={contractId}
                    displayValue={
                      isWide ? contractId : truncateString(contractId)
                    }
                  />
                </span>
              </div>
            </div>
            <KeyValueList
              operationKey={t("Function Name")}
              operationValue={fnName}
            />
          </>
        );
      }

      case "hostFunctionTypeUploadContractWasm": {
        const wasmHash = hash(hostfn.wasm);
        return (
          <>
            <KeyValueList
              operationKey={t("Type")}
              operationValue={t("Upload Contract Wasm")}
            />
            <KeyValueList
              operationKey={t("Wasm Hash")}
              operationValue={truncateString(
                xdr.encodeBytes(wasmHash, "hex"),
                8,
              )}
            />
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

  if (!paths.length) {
    return null;
  }

  return (
    <div className="PathList">
      <div className="PathList__header">
        <Icon.Shuffle01 />
        <span>{t("Path")}</span>
      </div>
      {paths.map(({ code, issuer }, i) => (
        <div className="PathList__card" key={`${code} ${i + 1}`}>
          <div className="PathList__badge">#{i + 1}</div>
          <div className="PathList__row PathList__row--labels">
            <span>{t("Token")}</span>
            {issuer ? <span>{t("Issuer")}</span> : null}
          </div>
          <div className="PathList__row">
            <span>{code}</span>
            {issuer ? <KeyIdenticon publicKey={issuer} isSmall /> : null}
          </div>
        </div>
      ))}
    </div>
  );
};
