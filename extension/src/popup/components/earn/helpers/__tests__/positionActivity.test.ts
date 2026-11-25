import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  xdr,
} from "stellar-sdk";

import { HorizonOperation } from "@shared/api/types";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { NETWORKS, TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import {
  BlendRequestType,
  buildBlendRequestScVal,
  buildBlendSubmitOp,
} from "@shared/helpers/soroban/blend";
import {
  PositionActivityType,
  getBlendActivityFromHistory,
} from "popup/components/earn/helpers/positionActivity";

const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.TESTNET]!;
const USER = Keypair.random().publicKey();
const OTHER = Keypair.random().publicKey();
const USDC_ISSUER = Keypair.random().publicKey();
const USDC = new Asset("USDC", USDC_ISSUER);
const USDC_SAC = USDC.contractId(Networks.TESTNET);
const XLM_SAC = Asset.native().contractId(Networks.TESTNET);

const request = (assetId: string, amount: string, requestType: number) =>
  buildBlendRequestScVal({
    assetId,
    amount,
    requestType,
    networkPassphrase: Networks.TESTNET,
  });

/** The envelope Horizon joins onto the operation, for a given host call. */
const envelopeFor = (op: xdr.Operation, source = USER) =>
  new TransactionBuilder(new Account(source, "1"), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(op)
    .setTimeout(30)
    .build()
    .toXDR();

const submitEnvelope = (requests: xdr.ScVal[], from = USER) =>
  envelopeFor(
    buildBlendSubmitOp({
      poolId: POOL_ID,
      publicKey: from,
      requests,
      networkPassphrase: Networks.TESTNET,
    }),
    from,
  );

const operation = ({
  id = "1",
  envelope,
  successful = true,
  balanceChanges = [],
  createdAt = "2026-08-28T14:33:00Z",
}: {
  id?: string;
  envelope: string;
  successful?: boolean;
  balanceChanges?: HorizonOperation["asset_balance_changes"];
  createdAt?: string;
}) =>
  ({
    id,
    type: "invoke_host_function",
    transaction_successful: successful,
    created_at: createdAt,
    transaction_hash: `hash-${id}`,
    transaction_attr: { envelope_xdr: envelope },
    asset_balance_changes: balanceChanges,
  }) as unknown as HorizonOperation;

const decode = (operations: HorizonOperation[]) =>
  getBlendActivityFromHistory({
    operations,
    poolId: POOL_ID,
    publicKey: USER,
    networkDetails: TESTNET_NETWORK_DETAILS,
  });

describe("getBlendActivityFromHistory", () => {
  it("reads a deposit's token, amount, date and transaction", () => {
    const items = decode([
      operation({
        envelope: submitEnvelope([
          request(USDC_SAC, "5000000000", BlendRequestType.SupplyCollateral),
        ]),
      }),
    ]);

    expect(items).toEqual([
      {
        id: "1:0",
        protocol: "blend",
        positionId: POOL_ID,
        assetId: USDC_SAC,
        type: PositionActivityType.DEPOSIT,
        amount: "5000000000",
        occurredAt: "2026-08-28T14:33:00Z",
        txHash: "hash-1",
        usdValueAtEvent: null,
      },
    ]);
  });

  it("counts a plain supply as a deposit, as Blend's own app can send it", () => {
    const [item] = decode([
      operation({
        envelope: submitEnvelope([
          request(USDC_SAC, "100", BlendRequestType.Supply),
        ]),
      }),
    ]);

    expect(item.type).toBe(PositionActivityType.DEPOSIT);
  });

  // A "withdraw max" asks for more than the position holds and the pool caps
  // it, so the request overstates; the pool's transfer is what was paid out.
  it("takes a withdraw's amount from what the pool actually transferred", () => {
    const [item] = decode([
      operation({
        envelope: submitEnvelope([
          request(
            USDC_SAC,
            "99999999999999",
            BlendRequestType.WithdrawCollateral,
          ),
        ]),
        balanceChanges: [
          {
            asset_type: "credit_alphanum4",
            asset_code: "USDC",
            asset_issuer: USDC_ISSUER,
            type: "transfer",
            from: POOL_ID,
            to: USER,
            amount: "50.2300000",
          },
        ],
      }),
    ]);

    expect(item.type).toBe(PositionActivityType.WITHDRAW);
    expect(item.amount).toBe("502300000");
  });

  it("falls back to a withdraw's requested amount when no transfer is reported", () => {
    const [item] = decode([
      operation({
        envelope: submitEnvelope([
          request(USDC_SAC, "502300000", BlendRequestType.Withdraw),
        ]),
      }),
    ]);

    expect(item.amount).toBe("502300000");
  });

  it("ignores a transfer of a different token when reading a withdraw", () => {
    const [item] = decode([
      operation({
        envelope: submitEnvelope([
          request(USDC_SAC, "502300000", BlendRequestType.Withdraw),
        ]),
        balanceChanges: [
          {
            asset_type: "native",
            type: "transfer",
            from: POOL_ID,
            to: USER,
            amount: "1.0000000",
          },
        ],
      }),
    ]);

    expect(item.amount).toBe("502300000");
  });

  it("gives each request of one submit its own row", () => {
    const items = decode([
      operation({
        id: "7",
        envelope: submitEnvelope([
          request(USDC_SAC, "100", BlendRequestType.SupplyCollateral),
          request(XLM_SAC, "200", BlendRequestType.SupplyCollateral),
        ]),
      }),
    ]);

    expect(items.map((item) => [item.id, item.assetId, item.amount])).toEqual([
      ["7:0", USDC_SAC, "100"],
      ["7:1", XLM_SAC, "200"],
    ]);
  });

  it("leaves out borrows and repays, which are not supply activity", () => {
    const items = decode([
      operation({
        envelope: submitEnvelope([
          request(USDC_SAC, "100", BlendRequestType.SupplyCollateral),
          request(USDC_SAC, "50", 4),
          request(USDC_SAC, "50", 5),
        ]),
      }),
    ]);

    expect(items).toHaveLength(1);
  });

  it("reads submit_with_allowance like submit", () => {
    const user = xdrAddress(USER);
    const items = decode([
      operation({
        envelope: envelopeFor(
          new Contract(POOL_ID).call(
            "submit_with_allowance",
            user,
            user,
            user,
            xdr.ScVal.scvVec([
              request(USDC_SAC, "100", BlendRequestType.SupplyCollateral),
            ]),
          ),
        ),
      }),
    ]);

    expect(items).toHaveLength(1);
  });

  it("skips a failed transaction", () => {
    expect(
      decode([
        operation({
          successful: false,
          envelope: submitEnvelope([
            request(USDC_SAC, "100", BlendRequestType.SupplyCollateral),
          ]),
        }),
      ]),
    ).toEqual([]);
  });

  it("skips a submit on behalf of another account", () => {
    expect(
      decode([
        operation({
          envelope: submitEnvelope(
            [request(USDC_SAC, "100", BlendRequestType.SupplyCollateral)],
            OTHER,
          ),
        }),
      ]),
    ).toEqual([]);
  });

  it("skips calls to other contracts and other functions", () => {
    const otherPool = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;
    const user = xdrAddress(USER);
    expect(
      decode([
        operation({
          id: "a",
          envelope: envelopeFor(
            new Contract(otherPool).call(
              "submit",
              user,
              user,
              user,
              xdr.ScVal.scvVec([
                request(USDC_SAC, "100", BlendRequestType.SupplyCollateral),
              ]),
            ),
          ),
        }),
        operation({
          id: "b",
          envelope: envelopeFor(
            new Contract(USDC_SAC).call(
              "transfer",
              user,
              xdrAddress(OTHER),
              nativeToScVal(BigInt(1), { type: "i128" }),
            ),
          ),
        }),
      ]),
    ).toEqual([]);
  });

  it("skips non-Soroban operations and envelopes it cannot read", () => {
    expect(
      decode([
        { id: "p", type: "payment" } as unknown as HorizonOperation,
        operation({ envelope: "not-xdr" }),
      ]),
    ).toEqual([]);
  });
});

function xdrAddress(publicKey: string) {
  return new Address(publicKey).toScVal();
}
