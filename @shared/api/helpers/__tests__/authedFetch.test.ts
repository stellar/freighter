import { Buffer } from "buffer";
import { Keypair } from "stellar-sdk";

import { authedFetch } from "../authedFetch";

const KP = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 9));
const resp = (status: number): Response => new Response(null, { status });

const authHeaderOf = (call: unknown[]): string =>
  ((call[1] as RequestInit).headers as Record<string, string>).Authorization;

describe("authedFetch", () => {
  it("returns the response and does not retry on success", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(resp(200));
    const r = await authedFetch({
      keypair: KP,
      baseUrl: "http://x",
      method: "GET",
      path: "/p",
      fetchImpl,
    });
    expect(r.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(authHeaderOf(fetchImpl.mock.calls[0])).toMatch(/^Bearer .+/);
  });

  it("regenerates the JWT and retries once on 401, returning the retry result", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(resp(401))
      .mockResolvedValueOnce(resp(200));
    const r = await authedFetch({
      keypair: KP,
      baseUrl: "http://x",
      method: "GET",
      path: "/p",
      fetchImpl,
    });
    expect(r.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(authHeaderOf(fetchImpl.mock.calls[1])).toMatch(/^Bearer .+/);
  });

  it("retries at most once on persistent 401", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(resp(401));
    const r = await authedFetch({
      keypair: KP,
      baseUrl: "http://x",
      method: "GET",
      path: "/p",
      fetchImpl,
    });
    expect(r.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("sets Content-Type: application/json for non-GET by default", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(resp(201));
    await authedFetch({
      keypair: KP,
      baseUrl: "http://x",
      method: "POST",
      path: "/p",
      body: "{}",
      fetchImpl,
    });
    const hdrs = (fetchImpl.mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(hdrs["Content-Type"]).toBe("application/json");
  });

  it("upper-cases the wire method so it matches the signed methodAndPath", async () => {
    // fetch does not auto-uppercase PATCH/custom verbs; authedFetch must, or the
    // server's r.Method ("patch") won't match the JWT's "PATCH ..." claim -> 401.
    const fetchImpl = jest.fn().mockResolvedValue(resp(200));
    await authedFetch({
      keypair: KP,
      baseUrl: "http://x",
      method: "patch",
      path: "/p",
      body: "{}",
      fetchImpl,
    });
    expect((fetchImpl.mock.calls[0][1] as RequestInit).method).toBe("PATCH");
  });

  it("strips a trailing slash from baseUrl when building the URL", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(resp(200));
    await authedFetch({
      keypair: KP,
      baseUrl: "http://x/",
      method: "GET",
      path: "/p",
      fetchImpl,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe("http://x/p");
  });
});
