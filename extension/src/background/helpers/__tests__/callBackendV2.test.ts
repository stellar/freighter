import { Buffer } from "buffer";
import { Keypair } from "stellar-sdk";

import { callBackendV2 } from "../callBackendV2";
import * as deriveMod from "@shared/api/helpers/deriveAuthKeypair";
import * as sessionMod from "background/helpers/session";

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
    jest
      .spyOn(deriveMod, "deriveAuthKeypair")
      .mockResolvedValue({
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
});
