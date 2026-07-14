import { Buffer } from "buffer";
import { Keypair } from "stellar-sdk";

import * as Sentry from "@sentry/browser";

import { callBackendV2 } from "../callBackendV2";
import * as deriveMod from "@shared/api/helpers/deriveAuthKeypair";
import * as sessionMod from "background/helpers/session";

jest.mock("@sentry/browser");
jest.mock("@shared/constants/mercury", () => ({
  INDEXER_V2_URL: "https://be.example.test/api/v1",
}));

const KP = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 5));
const VECTOR_MNEMONIC =
  "illness spike retreat truth genius clock brain pass fit cave bargain toe";

const sessionStore = {} as never;
const localStore = {} as never;

const okResponse = (bodyObj: unknown): Response =>
  new Response(JSON.stringify(bodyObj), { status: 200 });

describe("callBackendV2", () => {
  afterEach(() => jest.restoreAllMocks());

  it("when unlocked, signs the full server path and attaches a Bearer token", async () => {
    jest
      .spyOn(sessionMod, "getEncryptedTemporaryData")
      .mockResolvedValue(VECTOR_MNEMONIC);
    jest.spyOn(deriveMod, "deriveAuthKeypair").mockResolvedValue({
      userId: KP.rawPublicKey().toString("hex"),
      keypair: KP,
    });

    const fetchImpl = jest
      .fn()
      .mockResolvedValue(okResponse({ data: { ok: true } }));

    const result = await callBackendV2({
      method: "GET",
      path: "/protocols",
      sessionStore,
      localStore,
      fetchImpl,
    });

    expect(result).toEqual({ status: 200, body: { data: { ok: true } } });
    // fetched against the full URL
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://be.example.test/api/v1/protocols",
    );
    const headers = (fetchImpl.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^Bearer .+\..+\..+$/);
    // the JWT's methodAndPath must carry the full /api/v1 path
    const jwt = headers.Authorization.replace("Bearer ", "");
    const claims = JSON.parse(
      Buffer.from(
        jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
    );
    expect(claims.methodAndPath).toBe("GET /api/v1/protocols");
  });

  it("when locked, sends no Authorization header", async () => {
    jest.spyOn(sessionMod, "getEncryptedTemporaryData").mockResolvedValue("");
    const fetchImpl = jest.fn().mockResolvedValue(okResponse({ data: 1 }));

    await callBackendV2({
      method: "GET",
      path: "/protocols",
      sessionStore,
      localStore,
      fetchImpl,
    });

    const headers = ((fetchImpl.mock.calls[0][1] as RequestInit).headers ??
      {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("with skipAuth, sends anonymously and never derives a keypair even when unlocked", async () => {
    const getMnemonic = jest
      .spyOn(sessionMod, "getEncryptedTemporaryData")
      .mockResolvedValue(VECTOR_MNEMONIC);
    // Mocked so a skipAuth regression fails fast instead of running real PBKDF2.
    const derive = jest
      .spyOn(deriveMod, "deriveAuthKeypair")
      .mockResolvedValue({ userId: KP.rawPublicKey().toString("hex"), keypair: KP });
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(okResponse({ status: "healthy" }));

    const result = await callBackendV2({
      method: "GET",
      path: "/rpc-health?network=PUBLIC",
      sessionStore,
      localStore,
      fetchImpl,
      skipAuth: true,
    });

    expect(result).toEqual({ status: 200, body: { status: "healthy" } });
    // No session read and no key derivation (avoids the PBKDF2 cost).
    expect(getMnemonic).not.toHaveBeenCalled();
    expect(derive).not.toHaveBeenCalled();
    // No Authorization header.
    const headers = ((fetchImpl.mock.calls[0][1] as RequestInit).headers ??
      {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("forwards a POST body and sets Content-Type", async () => {
    jest.spyOn(sessionMod, "getEncryptedTemporaryData").mockResolvedValue("");
    const fetchImpl = jest.fn().mockResolvedValue(okResponse({ data: [] }));

    await callBackendV2({
      method: "POST",
      path: "/ledger-key/accounts?network=PUBLIC",
      body: JSON.stringify({ public_keys: ["G..."] }),
      sessionStore,
      localStore,
      fetchImpl,
    });

    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ public_keys: ["G..."] }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("when unlocked, authed POST carries Bearer token, Content-Type, and signs the query path", async () => {
    jest
      .spyOn(sessionMod, "getEncryptedTemporaryData")
      .mockResolvedValue(VECTOR_MNEMONIC);
    jest.spyOn(deriveMod, "deriveAuthKeypair").mockResolvedValue({
      userId: KP.rawPublicKey().toString("hex"),
      keypair: KP,
    });

    const fetchImpl = jest
      .fn()
      .mockResolvedValue(okResponse({ data: { ok: true } }));

    await callBackendV2({
      method: "POST",
      path: "/ledger-key/accounts?network=PUBLIC",
      body: JSON.stringify({ public_keys: ["G1"] }),
      sessionStore,
      localStore,
      fetchImpl,
    });

    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;

    // Must carry a valid JWT
    expect(headers.Authorization).toMatch(/^Bearer .+\..+\..+$/);
    // Must set Content-Type for the POST body
    expect(headers["Content-Type"]).toBe("application/json");

    // The signed methodAndPath must include the query string
    const jwt = headers.Authorization.replace("Bearer ", "");
    const claims = JSON.parse(
      Buffer.from(
        jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
    );
    expect(claims.methodAndPath).toBe(
      "POST /api/v1/ledger-key/accounts?network=PUBLIC",
    );
  });

  it("returns { status, body: null } on a non-2xx response", async () => {
    jest.spyOn(sessionMod, "getEncryptedTemporaryData").mockResolvedValue("");
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(new Response("nope", { status: 500 }));

    const result = await callBackendV2({
      method: "GET",
      path: "/protocols",
      sessionStore,
      localStore,
      fetchImpl,
    });

    expect(result).toEqual({ status: 500, body: null });
  });

  it("preserves a JSON error body on a non-2xx response (for Sentry detail)", async () => {
    jest.spyOn(sessionMod, "getEncryptedTemporaryData").mockResolvedValue("");
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "boom", code: 42 }), {
          status: 500,
        }),
      );

    const result = await callBackendV2({
      method: "GET",
      path: "/protocols",
      sessionStore,
      localStore,
      fetchImpl,
    });

    // The server's error detail must survive so callers can surface it to
    // Sentry — not be flattened to null.
    expect(result).toEqual({ status: 500, body: { error: "boom", code: 42 } });
  });

  it("captures and falls back to anonymous when key derivation throws unexpectedly", async () => {
    (Sentry.captureException as jest.Mock).mockClear();
    jest
      .spyOn(sessionMod, "getEncryptedTemporaryData")
      .mockResolvedValue(VECTOR_MNEMONIC);
    const deriveError = new Error("corrupted temporaryStoreExtra");
    jest
      .spyOn(deriveMod, "deriveAuthKeypair")
      .mockRejectedValue(deriveError);
    const fetchImpl = jest.fn().mockResolvedValue(okResponse({ data: 1 }));

    const result = await callBackendV2({
      method: "GET",
      path: "/protocols",
      sessionStore,
      localStore,
      fetchImpl,
    });

    // Unexpected derivation failure must emit telemetry (not be swallowed), and
    // the original Error is captured (preserving the stack) with the context in
    // `extra` — not a JSON.stringify that would flatten it to "{}".
    expect(Sentry.captureException).toHaveBeenCalledWith(
      deriveError,
      expect.objectContaining({
        extra: expect.objectContaining({
          context: expect.stringContaining("deriving auth keypair"),
        }),
      }),
    );
    // …and the request still goes out anonymously (no Authorization header).
    const headers = ((fetchImpl.mock.calls[0][1] as RequestInit).headers ??
      {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(result).toEqual({ status: 200, body: { data: 1 } });
  });
});
