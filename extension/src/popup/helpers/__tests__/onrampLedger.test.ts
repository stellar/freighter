import { Buffer } from "buffer";

import { WalletType } from "@shared/constants/hardwareWallet";
import { ADDRESS_PROOF_DOMAIN } from "helpers/onrampProof";

// Mock the redux store (non-hook module reads state via store.getState()).
jest.mock("popup/App", () => ({
  store: {
    getState: jest.fn(),
  },
}));

// Mock the bipPath source to return a fixed path.
const MOCK_BIP_PATH = "44'/148'/0'";
jest.mock("popup/ducks/accountServices", () => ({
  bipPathSelector: jest.fn(() => MOCK_BIP_PATH),
}));

// Mock the device. WalletType.LEDGER has the string value "Ledger", so key on
// that value to match how onrampLedger.ts indexes the map.
jest.mock("popup/helpers/hardwareConnect", () => ({
  hardwareSignMessage: {
    Ledger: jest.fn(),
  },
}));

import { hardwareSignMessage } from "popup/helpers/hardwareConnect";
import {
  signOnrampProofWithLedger,
  LedgerOnrampUnsupportedError,
} from "popup/helpers/onrampLedger";

const mockSignMessage = hardwareSignMessage[
  WalletType.LEDGER
] as jest.MockedFunction<(typeof hardwareSignMessage)[WalletType.LEDGER]>;

const PUBLIC_KEY = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

describe("signOnrampProofWithLedger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a proof token and signs the SEP-53 framed message", async () => {
    const signature = Buffer.from([1, 2, 3, 4]);
    mockSignMessage.mockResolvedValue({ signature, appVersion: "5.0.0" });

    const token = await signOnrampProofWithLedger({
      publicKey: PUBLIC_KEY,
      body: {},
      hardwareWalletType: WalletType.LEDGER,
    });

    // Token shape: "<b64url(canonical)>.<b64url(sig)>" (no scheme — body field)
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const [canonicalB64, sigB64] = token.split(".");
    const canonical = Buffer.from(canonicalB64, "base64url").toString("utf8");
    expect(canonical).toContain(`"sub":"${PUBLIC_KEY}"`);
    expect(Buffer.from(sigB64, "base64url").equals(signature)).toBe(true);

    // Device was called once with the fixed bipPath and a message that begins
    // with the ADDRESS_PROOF_DOMAIN domain tag bytes.
    expect(mockSignMessage).toHaveBeenCalledTimes(1);
    const callArg = mockSignMessage.mock.calls[0][0];
    expect(callArg.bipPath).toBe(MOCK_BIP_PATH);
    const domainBytes = Buffer.from(ADDRESS_PROOF_DOMAIN, "utf8");
    expect(callArg.message.subarray(0, domainBytes.length)).toEqual(
      domainBytes,
    );
    // The remaining bytes after the domain tag are exactly the canonical payload.
    expect(callArg.message.subarray(domainBytes.length).toString("utf8")).toBe(
      canonical,
    );
  });

  it("throws LedgerOnrampUnsupportedError when the device rejects signMessage", async () => {
    mockSignMessage.mockRejectedValue(new Error("APDU 0x6d00 not supported"));

    await expect(
      signOnrampProofWithLedger({
        publicKey: PUBLIC_KEY,
        body: {},
        hardwareWalletType: WalletType.LEDGER,
      }),
    ).rejects.toThrow(LedgerOnrampUnsupportedError);

    await expect(
      signOnrampProofWithLedger({
        publicKey: PUBLIC_KEY,
        body: {},
        hardwareWalletType: WalletType.LEDGER,
      }),
    ).rejects.toThrow("Update your Ledger Stellar app to buy with Coinbase");
  });

  it("throws LedgerOnrampUnsupportedError for a non-LEDGER wallet without touching the device", async () => {
    await expect(
      signOnrampProofWithLedger({
        publicKey: PUBLIC_KEY,
        body: {},
        hardwareWalletType: WalletType.NONE,
      }),
    ).rejects.toThrow(LedgerOnrampUnsupportedError);

    expect(mockSignMessage).not.toHaveBeenCalled();
  });
});
