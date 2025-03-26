import {
  Address,
  scValToBigInt,
  xdr,
  ScInt,
  SorobanRpc,
  contract,
  StrKey,
} from "stellar-sdk";
import { XdrReader } from "@stellar/js-xdr";

export interface TokenArgsDisplay {
  contractId: string;
  amount: string;
  to: string;
  from: string;
}

const TOKEN_SPEC_DEFINITIONS = {
  $schema: "http://json-schema.org/draft-07/schema#",
  definitions: {
    U32: {
      type: "integer",
      minimum: 0,
      maximum: 4294967295,
    },
    I32: {
      type: "integer",
      minimum: -2147483648,
      maximum: 2147483647,
    },
    U64: {
      type: "string",
      pattern: "^([1-9][0-9]*|0)$",
      minLength: 1,
      maxLength: 20,
    },
    I64: {
      type: "string",
      pattern: "^(-?[1-9][0-9]*|0)$",
      minLength: 1,
      maxLength: 21,
    },
    U128: {
      type: "string",
      pattern: "^([1-9][0-9]*|0)$",
      minLength: 1,
      maxLength: 39,
    },
    I128: {
      type: "string",
      pattern: "^(-?[1-9][0-9]*|0)$",
      minLength: 1,
      maxLength: 40,
    },
    U256: {
      type: "string",
      pattern: "^([1-9][0-9]*|0)$",
      minLength: 1,
      maxLength: 78,
    },
    I256: {
      type: "string",
      pattern: "^(-?[1-9][0-9]*|0)$",
      minLength: 1,
      maxLength: 79,
    },
    Address: {
      type: "string",
      format: "address",
      description: "Address can be a public key or contract id",
    },
    ScString: {
      type: "string",
      description: "ScString is a string",
    },
    ScSymbol: {
      type: "string",
      description: "ScString is a string",
    },
    DataUrl: {
      type: "string",
      pattern:
        "^(?:[A-Za-z0-9+\\/]{4})*(?:[A-Za-z0-9+\\/]{2}==|[A-Za-z0-9+\\/]{3}=)?$",
    },
    initialize: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {
            admin: {
              $ref: "#/definitions/Address",
            },
            decimal: {
              $ref: "#/definitions/U32",
            },
            name: {
              $ref: "#/definitions/ScString",
            },
            symbol: {
              $ref: "#/definitions/ScString",
            },
          },
          type: "object",
          required: ["admin", "decimal", "name", "symbol"],
        },
      },
      additionalProperties: false,
    },
    mint: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {
            to: {
              $ref: "#/definitions/Address",
            },
            amount: {
              $ref: "#/definitions/I128",
            },
          },
          type: "object",
          required: ["to", "amount"],
        },
      },
      additionalProperties: false,
    },
    set_admin: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {
            new_admin: {
              $ref: "#/definitions/Address",
            },
          },
          type: "object",
          required: ["new_admin"],
        },
      },
      additionalProperties: false,
    },
    allowance: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {
            from: {
              $ref: "#/definitions/Address",
            },
            spender: {
              $ref: "#/definitions/Address",
            },
          },
          type: "object",
          required: ["from", "spender"],
        },
      },
      additionalProperties: false,
    },
    approve: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {
            from: {
              $ref: "#/definitions/Address",
            },
            spender: {
              $ref: "#/definitions/Address",
            },
            amount: {
              $ref: "#/definitions/I128",
            },
            expiration_ledger: {
              $ref: "#/definitions/U32",
            },
          },
          type: "object",
          required: ["from", "spender", "amount", "expiration_ledger"],
        },
      },
      additionalProperties: false,
    },
    balance: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {
            id: {
              $ref: "#/definitions/Address",
            },
          },
          type: "object",
          required: ["id"],
        },
      },
      additionalProperties: false,
    },
    transfer: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {
            from: {
              $ref: "#/definitions/Address",
            },
            to: {
              $ref: "#/definitions/Address",
            },
            amount: {
              $ref: "#/definitions/I128",
            },
          },
          type: "object",
          required: ["from", "to", "amount"],
        },
      },
      additionalProperties: false,
    },
    transfer_from: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {
            spender: {
              $ref: "#/definitions/Address",
            },
            from: {
              $ref: "#/definitions/Address",
            },
            to: {
              $ref: "#/definitions/Address",
            },
            amount: {
              $ref: "#/definitions/I128",
            },
          },
          type: "object",
          required: ["spender", "from", "to", "amount"],
        },
      },
      additionalProperties: false,
    },
    burn: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {
            from: {
              $ref: "#/definitions/Address",
            },
            amount: {
              $ref: "#/definitions/I128",
            },
          },
          type: "object",
          required: ["from", "amount"],
        },
      },
      additionalProperties: false,
    },
    burn_from: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {
            spender: {
              $ref: "#/definitions/Address",
            },
            from: {
              $ref: "#/definitions/Address",
            },
            amount: {
              $ref: "#/definitions/I128",
            },
          },
          type: "object",
          required: ["spender", "from", "amount"],
        },
      },
      additionalProperties: false,
    },
    decimals: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {},
          type: "object",
        },
      },
      additionalProperties: false,
    },
    name: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {},
          type: "object",
        },
      },
      additionalProperties: false,
    },
    symbol: {
      properties: {
        args: {
          additionalProperties: false,
          properties: {},
          type: "object",
        },
      },
      additionalProperties: false,
    },
    AllowanceDataKey: {
      description: "",
      properties: {
        from: {
          $ref: "#/definitions/Address",
        },
        spender: {
          $ref: "#/definitions/Address",
        },
        additionalProperties: false,
      },
      required: ["from", "spender"],
      type: "object",
    },
    AllowanceValue: {
      description: "",
      properties: {
        amount: {
          $ref: "#/definitions/I128",
        },
        expiration_ledger: {
          $ref: "#/definitions/U32",
        },
        additionalProperties: false,
      },
      required: ["amount", "expiration_ledger"],
      type: "object",
    },
    DataKey: {
      oneOf: [
        {
          type: "object",
          title: "Allowance",
          properties: {
            tag: "Allowance",
            values: {
              type: "array",
              items: [
                {
                  $ref: "#/definitions/AllowanceDataKey",
                },
              ],
            },
          },
          required: ["tag", "values"],
          additionalProperties: false,
        },
        {
          type: "object",
          title: "Balance",
          properties: {
            tag: "Balance",
            values: {
              type: "array",
              items: [
                {
                  $ref: "#/definitions/Address",
                },
              ],
            },
          },
          required: ["tag", "values"],
          additionalProperties: false,
        },
        {
          type: "object",
          title: "Nonce",
          properties: {
            tag: "Nonce",
            values: {
              type: "array",
              items: [
                {
                  $ref: "#/definitions/Address",
                },
              ],
            },
          },
          required: ["tag", "values"],
          additionalProperties: false,
        },
        {
          type: "object",
          title: "State",
          properties: {
            tag: "State",
            values: {
              type: "array",
              items: [
                {
                  $ref: "#/definitions/Address",
                },
              ],
            },
          },
          required: ["tag", "values"],
          additionalProperties: false,
        },
        {
          type: "object",
          title: "Admin",
          properties: {
            tag: "Admin",
          },
          additionalProperties: false,
          required: ["tag"],
        },
      ],
    },
    TokenMetadata: {
      description: "",
      properties: {
        decimal: {
          $ref: "#/definitions/U32",
        },
        name: {
          $ref: "#/definitions/ScString",
        },
        symbol: {
          $ref: "#/definitions/ScString",
        },
        additionalProperties: false,
      },
      required: ["decimal", "name", "symbol"],
      type: "object",
    },
  },
};

export const accountIdentifier = (account: string) =>
  new Address(account).toScVal();

export const valueToI128String = (value: xdr.ScVal) =>
  scValToBigInt(value).toString();

// How do we decode these in a more generic way?
export const decodei128 = (b64: string) => {
  const value = xdr.ScVal.fromXDR(b64, "base64");
  try {
    return valueToI128String(value);
  } catch (error) {
    console.error(error);
    return 0;
  }
};

export const decodeStr = (b64: string) =>
  xdr.ScVal.fromXDR(b64, "base64").str().toString();

export const decodeU32 = (b64: string) =>
  xdr.ScVal.fromXDR(b64, "base64").u32();

export const numberToI128 = (value: number): xdr.ScVal =>
  new ScInt(value).toI128();

export const getLedgerKeyContractCode = (contractId: string) => {
  const ledgerKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(contractId).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent(),
    }),
  );
  return ledgerKey.toXDR("base64");
};

export const getLedgerEntries = async (
  entryKey: string,
  rpcUrl: string,
  id: number = new Date().getDate(),
): Promise<{
  error: Error;
  result: SorobanRpc.Api.RawGetLedgerEntriesResponse;
}> => {
  let requestBody = {
    jsonrpc: "2.0",
    id: id,
    method: "getLedgerEntries",
    params: {
      keys: [entryKey],
    },
  };

  let res = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  let json = await res.json();
  if (!res.ok) {
    throw new Error(json);
  }
  return json;
};

export const getLedgerKeyWasmId = (contractLedgerEntryData: string) => {
  const contractCodeWasmHash = xdr.LedgerEntryData.fromXDR(
    contractLedgerEntryData,
    "base64",
  )
    .contractData()
    .val()
    .instance()
    .executable()
    .wasmHash();
  const ledgerKey = xdr.LedgerKey.contractCode(
    new xdr.LedgerKeyContractCode({
      hash: contractCodeWasmHash,
    }),
  );
  return ledgerKey.toXDR("base64");
};

export const parseWasmXdr = async (xdrContents: string) => {
  const wasmBuffer = xdr.LedgerEntryData.fromXDR(xdrContents, "base64")
    .contractCode()
    .code();
  const wasmModule = await WebAssembly.compile(wasmBuffer);
  const reader = new XdrReader(
    Buffer.from(
      WebAssembly.Module.customSections(wasmModule, "contractspecv0")[0],
    ),
  );

  const specs = [];
  do {
    specs.push(xdr.ScSpecEntry.read(reader));
  } while (!reader.eof);
  const contractSpec = new contract.Spec(specs);
  return contractSpec.jsonSchema();
};

export const getContractSpec = async (
  contractId: string,
  serverUrl: string,
) => {
  const contractDataKey = getLedgerKeyContractCode(contractId);
  const { error, result } = await getLedgerEntries(contractDataKey, serverUrl);
  const entries = result.entries || [];
  if (error || !entries.length) {
    throw new Error("Unable to fetch contract spec");
  }

  const contractCodeLedgerEntryData = entries[0].xdr;
  const wasmId = getLedgerKeyWasmId(contractCodeLedgerEntryData);
  const { error: wasmError, result: wasmResult } = await getLedgerEntries(
    wasmId,
    serverUrl,
  );
  const wasmEntries = wasmResult.entries || [];
  if (wasmError || !wasmEntries.length) {
    throw new Error("Unable to fetch contract spec");
  }

  const spec = await parseWasmXdr(wasmEntries[0].xdr);
  return spec;
};

const isTokenSpec = (spec: Record<string, any>) => {
  return JSON.stringify(spec) === JSON.stringify(TOKEN_SPEC_DEFINITIONS);
};

export const getIsTokenSpec = async (contractId: string, serverUrl: string) => {
  const spec = await getContractSpec(contractId, serverUrl);
  return isTokenSpec(spec);
};

export const isContractId = (contractId: string) => {
  try {
    StrKey.decodeContract(contractId);
    return true;
  } catch (error) {
    return false;
  }
};
