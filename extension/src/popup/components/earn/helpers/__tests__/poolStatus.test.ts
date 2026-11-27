import { isPoolFrozen } from "../poolStatus";

const pool = (status: string | null) =>
  ({ id: "CPOOL", name: "Fixed v2.1", status, reserves: [] }) as never;

describe("isPoolFrozen", () => {
  it.each(["ADMIN_FROZEN", "FROZEN", "SETUP"])(
    "is frozen when %s",
    (status) => {
      expect(isPoolFrozen(pool(status))).toBe(true);
    },
  );

  it.each(["ADMIN_ACTIVE", "ACTIVE", "ADMIN_ON_ICE", "ON_ICE"])(
    "takes deposits when %s (on ice stops only borrowing)",
    (status) => {
      expect(isPoolFrozen(pool(status))).toBe(false);
    },
  );

  it("waits for a status rather than calling a pool frozen", () => {
    expect(isPoolFrozen(pool(null))).toBe(false);
    expect(isPoolFrozen(null)).toBe(false);
    expect(isPoolFrozen(undefined)).toBe(false);
  });
});
