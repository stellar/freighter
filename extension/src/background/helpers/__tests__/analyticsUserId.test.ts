import { getAnalyticsUserId } from "../analyticsUserId";
import { getEncryptedTemporaryData } from "background/helpers/session";
import { deriveAuthKeypair } from "@shared/api/helpers/deriveAuthKeypair";

jest.mock("background/helpers/session", () => ({
  getEncryptedTemporaryData: jest.fn(),
}));
jest.mock("@shared/api/helpers/deriveAuthKeypair", () => ({
  deriveAuthKeypair: jest.fn(),
}));

const mockTmp = getEncryptedTemporaryData as jest.Mock;
const mockDerive = deriveAuthKeypair as jest.Mock;

describe("getAnalyticsUserId", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the public userId hex when unlocked", async () => {
    mockTmp.mockResolvedValue("test mnemonic phrase");
    mockDerive.mockResolvedValue({
      userId: "abcd1234",
      keypair: { SECRET: "x" },
    });
    const id = await getAnalyticsUserId({} as never, {} as never);
    expect(id).toBe("abcd1234");
  });

  it("returns null when the store is locked / no mnemonic", async () => {
    mockTmp.mockResolvedValue("");
    expect(await getAnalyticsUserId({} as never, {} as never)).toBeNull();
    expect(mockDerive).not.toHaveBeenCalled();
  });

  it("returns null (never throws) on derivation failure", async () => {
    mockTmp.mockResolvedValue("bad");
    mockDerive.mockRejectedValue(new Error("Invalid mnemonic (see bip39)"));
    expect(await getAnalyticsUserId({} as never, {} as never)).toBeNull();
  });

  it("never returns keypair/private material", async () => {
    mockTmp.mockResolvedValue("m");
    mockDerive.mockResolvedValue({
      userId: "pub",
      keypair: { SECRET: "priv" },
    });
    const id = await getAnalyticsUserId({} as never, {} as never);
    expect(typeof id).toBe("string");
    expect(JSON.stringify(id)).not.toContain("priv");
  });
});
