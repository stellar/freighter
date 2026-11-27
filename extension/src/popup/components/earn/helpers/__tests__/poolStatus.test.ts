import { isPoolDepositPaused } from "../poolStatus";

const pool = (status: string | null) =>
  ({ id: "CPOOL", name: "Fixed v2.1", status, reserves: [] }) as never;

describe("isPoolDepositPaused", () => {
  it.each(["ADMIN_FROZEN", "FROZEN", "SETUP"])(
    "is paused when %s",
    (status) => {
      expect(isPoolDepositPaused(pool(status))).toBe(true);
    },
  );

  it.each(["ADMIN_ACTIVE", "ACTIVE", "ADMIN_ON_ICE", "ON_ICE"])(
    "takes deposits when %s (on ice stops only borrowing)",
    (status) => {
      expect(isPoolDepositPaused(pool(status))).toBe(false);
    },
  );

  it("waits for a status rather than calling a pool paused", () => {
    expect(isPoolDepositPaused(pool(null))).toBe(false);
    expect(isPoolDepositPaused(null)).toBe(false);
    expect(isPoolDepositPaused(undefined)).toBe(false);
  });
});
