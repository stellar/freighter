import { getAnalyticsUserId } from "../analyticsUserId";
import { getSigningIdentity } from "background/helpers/signing-identity";

jest.mock("background/helpers/signing-identity", () => ({
  getSigningIdentity: jest.fn(),
}));

const mockResolve = getSigningIdentity as jest.Mock;

const sessionStore = {} as never;
const localStore = {} as never;

describe("getAnalyticsUserId", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the pinned source id when unlocked", async () => {
    mockResolve.mockResolvedValue({
      sourceId: "abcd1234",
      keypair: { SECRET: "x" },
    });

    expect(await getAnalyticsUserId(sessionStore, localStore)).toBe(
      "abcd1234",
    );
    expect(mockResolve).toHaveBeenCalledWith({ sessionStore, localStore });
  });

  it("returns null when the session holds no signer", async () => {
    // Locked, hardware-only, or the resolver reported an unexpected error.
    mockResolve.mockResolvedValue(null);

    expect(await getAnalyticsUserId(sessionStore, localStore)).toBeNull();
  });

  it("never returns keypair/private material", async () => {
    mockResolve.mockResolvedValue({
      sourceId: "pub",
      keypair: { SECRET: "priv" },
    });

    const id = await getAnalyticsUserId(sessionStore, localStore);

    expect(typeof id).toBe("string");
    expect(JSON.stringify(id)).not.toContain("priv");
  });
});
