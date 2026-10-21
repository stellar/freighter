import { getAnalyticsUserId } from "../analyticsUserId";
import { getDefaultMnemonic } from "background/helpers/secret-sources";
import { deriveAuthKeypair } from "@shared/api/helpers/deriveAuthKeypair";
import { captureException } from "@sentry/browser";

jest.mock("background/helpers/secret-sources", () => ({
  getDefaultMnemonic: jest.fn(),
}));
jest.mock("@shared/api/helpers/deriveAuthKeypair", () => ({
  deriveAuthKeypair: jest.fn(),
}));
jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

const mockTmp = getDefaultMnemonic as jest.Mock;
const mockDerive = deriveAuthKeypair as jest.Mock;
const mockCaptureException = captureException as jest.Mock;

describe("getAnalyticsUserId", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the public userId hex when unlocked", async () => {
    mockTmp.mockResolvedValue({
      sourceId: "id",
      mnemonic: "test mnemonic phrase",
    });
    mockDerive.mockResolvedValue({
      userId: "abcd1234",
      keypair: { SECRET: "x" },
    });
    const id = await getAnalyticsUserId({} as never, {} as never);
    expect(id).toBe("abcd1234");
  });

  it("returns null when the store is locked / no mnemonic", async () => {
    mockTmp.mockResolvedValue(null);
    expect(await getAnalyticsUserId({} as never, {} as never)).toBeNull();
    expect(mockDerive).not.toHaveBeenCalled();
  });

  it("returns null (never throws) on derivation failure", async () => {
    mockTmp.mockResolvedValue({ sourceId: "id", mnemonic: "bad" });
    mockDerive.mockRejectedValue(new Error("Invalid mnemonic (see bip39)"));
    expect(await getAnalyticsUserId({} as never, {} as never)).toBeNull();
  });

  it("captures the exception (telemetry) when derivation fails unexpectedly", async () => {
    mockTmp.mockResolvedValue({ sourceId: "id", mnemonic: "bad" });
    const derivationError = new Error("Invalid mnemonic (see bip39)");
    mockDerive.mockRejectedValue(derivationError);

    await getAnalyticsUserId({} as never, {} as never);

    expect(mockCaptureException).toHaveBeenCalledWith(
      derivationError,
      expect.objectContaining({ extra: expect.any(Object) }),
    );
  });

  it("never returns keypair/private material", async () => {
    mockTmp.mockResolvedValue({ sourceId: "id", mnemonic: "m" });
    mockDerive.mockResolvedValue({
      userId: "pub",
      keypair: { SECRET: "priv" },
    });
    const id = await getAnalyticsUserId({} as never, {} as never);
    expect(typeof id).toBe("string");
    expect(JSON.stringify(id)).not.toContain("priv");
  });
});
