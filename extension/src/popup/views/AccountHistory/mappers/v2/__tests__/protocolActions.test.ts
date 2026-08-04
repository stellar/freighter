import {
  StateChangeCategory,
  StateChangeReason,
  V2StateChange,
} from "@shared/api/types/backend-api";
import {
  PROTOCOL_ACTION_LABELS,
  PROTOCOL_NAMES,
  resolveProtocolAction,
} from "../protocolActions";

/** Minimal state change with only the fields resolveProtocolAction reads */
const change = (
  type: StateChangeCategory,
  reason: StateChangeReason,
): V2StateChange =>
  ({
    variant: "BlendEmissionsClaimChange",
    type,
    reason,
    ledger_number: 1,
    ledger_created_at: "2026-06-10T19:56:19Z",
    ingested_at: "2026-06-10T19:56:19Z",
  }) as unknown as V2StateChange;

describe("resolveProtocolAction", () => {
  const cases: [StateChangeCategory, StateChangeReason, string][] = [
    ["BLEND_SUPPLY", "CREDIT", "Supplied"],
    ["BLEND_SUPPLY", "DEBIT", "Withdrew supply"],
    ["BLEND_COLLATERAL", "CREDIT", "Posted collateral"],
    ["BLEND_COLLATERAL", "DEBIT", "Released collateral"],
    ["BLEND_DEBT", "BORROW", "Borrowed"],
    ["BLEND_DEBT", "REPAY", "Repaid"],
    ["BLEND_DEBT", "FLASH_LOAN", "Flash loan"],
    ["BLEND_DEBT", "BAD_DEBT", "Debt defaulted"],
    ["BLEND_DEBT", "BURN", "Debt written off"],
    ["BLEND_AUCTION", "FILL", "Auction filled"],
    ["BLEND_EMISSIONS", "CLAIM", "Claimed emissions"],
    ["BLEND_BACKSTOP_EMISSIONS", "CLAIM", "Claimed backstop emissions"],
    ["BLEND_BACKSTOP", "CREDIT", "Deposited to backstop"],
    ["BLEND_BACKSTOP", "DEBIT", "Withdrew from backstop"],
    ["BLEND_BACKSTOP_QUEUE", "ADD", "Queued backstop withdrawal"],
    ["BLEND_BACKSTOP_QUEUE", "REMOVE", "Cancelled backstop withdrawal"],
  ];

  it.each(cases)("labels (%s, %s) as %s", (type, reason, label) => {
    expect(resolveProtocolAction([change(type, reason)])).toEqual({
      label,
      protocolName: "Blend",
    });
  });

  it("returns null for a non-protocol category", () => {
    expect(resolveProtocolAction([change("BALANCE", "CREDIT")])).toBeNull();
  });

  it("returns null for a protocol category with an unmapped reason", () => {
    // BLEND_EMISSIONS only defines CLAIM; a half-label must never render
    expect(
      resolveProtocolAction([change("BLEND_EMISSIONS", "SET")]),
    ).toBeNull();
  });

  it("returns null for an empty change list", () => {
    expect(resolveProtocolAction([])).toBeNull();
  });

  it("skips unrecognized rows and returns the first recognized one", () => {
    const changes = [
      change("BALANCE", "CREDIT"),
      change("BALANCE", "DEBIT"),
      change("BLEND_EMISSIONS", "CLAIM"),
      change("BLEND_BACKSTOP", "CREDIT"),
    ];
    expect(resolveProtocolAction(changes)).toEqual({
      label: "Claimed emissions",
      protocolName: "Blend",
    });
  });
});

describe("PROTOCOL_ACTION_LABELS / PROTOCOL_NAMES agreement", () => {
  it("has a PROTOCOL_NAMES entry for every PROTOCOL_ACTION_LABELS category", () => {
    const missing = Object.keys(PROTOCOL_ACTION_LABELS).filter((key) => {
      const category = key.split(":")[0] as StateChangeCategory;
      return !PROTOCOL_NAMES[category];
    });
    expect(missing).toEqual([]);
  });
});
