import { Buffer } from "buffer";
import { Keypair, xdr } from "stellar-sdk";

import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
  SOURCE_IDENTITY_VECTOR,
} from "@shared/api/helpers/authKeypairVectors";
import {
  deriveAuthKeypair,
  deriveSourceIdentity,
} from "@shared/api/helpers/deriveAuthKeypair";
import {
  buildLinkConsentMessage,
  MAX_LINK_SOURCES,
  UserLinkBody,
} from "@shared/api/helpers/userLinkConsent";
import { SecretSourceType } from "@shared/api/types";
import { getSigningIdentity } from "background/helpers/signing-identity";
import {
  getWalletSources,
  WalletSource,
} from "background/helpers/wallet-sources";

import { buildUserLinkBodies, buildUserLinkRequestBodies } from "../user-link";

jest.mock("background/helpers/signing-identity", () => ({
  getSigningIdentity: jest.fn(),
}));

jest.mock("background/helpers/wallet-sources", () => ({
  getWalletSources: jest.fn(),
}));

const mockGetSigningIdentity = getSigningIdentity as jest.Mock;
const mockGetWalletSources = getWalletSources as jest.Mock;

const IAT = 1_761_000_000;
const [phrase] = ACCOUNT_SOURCE_VECTORS;

/*
  A wallet holding one phrase, its first two derived accounts and one key
  imported on its own, derived for real from the pinned vectors.
*/
const makeWallet = async () => {
  const signers = new Map<string, Keypair>();
  const sources: WalletSource[] = [];
  const add = (id: string, kind: SecretSourceType, keypair: Keypair) => {
    sources.push({ id, kind });
    signers.set(id, keypair);
  };

  const { userId, keypair } = await deriveAuthKeypair(phrase.mnemonic);
  add(userId, SecretSourceType.PHRASE, keypair);
  for (const { secret } of phrase.accounts.slice(0, 2)) {
    const derived = await deriveSourceIdentity(
      Keypair.fromSecret(secret).rawSecretKey(),
    );
    add(derived.sourceId, SecretSourceType.SECRET_KEY, derived.keypair);
  }
  const imported = await deriveSourceIdentity(
    Buffer.from(SOURCE_IDENTITY_VECTOR.seed32Hex, "hex"),
  );
  add(imported.sourceId, SecretSourceType.SECRET_KEY, imported.keypair);

  return {
    sources,
    signers,
    identity: { sourceId: userId, keypair },
  };
};

/* Random secret_key sources, for the size bound. */
const makeManySources = (count: number) => {
  const sources: WalletSource[] = [];
  const signers = new Map<string, Keypair>();
  for (let i = 0; i < count; i += 1) {
    const keypair = Keypair.random();
    const id = xdr.encodeBytes(keypair.rawPublicKey(), "hex");
    sources.push({ id, kind: SecretSourceType.SECRET_KEY });
    signers.set(id, keypair);
  }
  return { sources, signers };
};

const ids = (body: UserLinkBody) => body.sources.map(({ id }) => id);

const expectConsentsVerify = (body: UserLinkBody, sub: string, iat: number) => {
  for (const { id, kind, sig } of body.sources) {
    const message = buildLinkConsentMessage({
      id,
      kind,
      signingSourceId: sub,
      iat,
    });
    const verifier = new Keypair({
      type: "ed25519",
      publicKey: Buffer.from(id, "hex"),
    });
    expect(
      verifier.verify(Buffer.from(message, "utf8"), Buffer.from(sig, "base64")),
    ).toBe(true);
  }
};

describe("buildUserLinkBodies", () => {
  it("carries a phrase, its derived accounts and an imported key with their kinds", async () => {
    const wallet = await makeWallet();

    const bodies = buildUserLinkBodies({ ...wallet, iat: IAT });

    expect(bodies).toHaveLength(1);
    const [body] = bodies;
    expect(body.sources.map(({ id, kind }) => ({ id, kind }))).toEqual([
      {
        id: AUTH_KEYPAIR_VECTORS[0].userId,
        kind: SecretSourceType.PHRASE,
      },
      { id: phrase.accounts[0].sourceId, kind: SecretSourceType.SECRET_KEY },
      { id: phrase.accounts[1].sourceId, kind: SecretSourceType.SECRET_KEY },
      {
        id: SOURCE_IDENTITY_VECTOR.sourceId,
        kind: SecretSourceType.SECRET_KEY,
      },
    ]);
    expectConsentsVerify(body, wallet.identity.sourceId, IAT);
  });

  it("puts the signing source in every body, even once it is linked", async () => {
    const wallet = await makeWallet();
    const sub = wallet.identity.sourceId;

    const bodies = buildUserLinkBodies({
      ...wallet,
      linkedIds: new Set([sub, phrase.accounts[0].sourceId]),
      iat: IAT,
    });

    expect(bodies.map(ids)).toEqual([
      [sub, phrase.accounts[1].sourceId, SOURCE_IDENTITY_VECTOR.sourceId],
    ]);
  });

  it("puts the signing source in the body when a key, not the phrase, signs", async () => {
    const wallet = await makeWallet();
    const keySigner = wallet.sources[3].id;

    const [body] = buildUserLinkBodies({
      ...wallet,
      identity: {
        sourceId: keySigner,
        keypair: wallet.signers.get(keySigner)!,
      },
      iat: IAT,
    });

    expect(ids(body)[0]).toBe(keySigner);
    expect(ids(body)).toHaveLength(4);
    expectConsentsVerify(body, keySigner, IAT);
  });

  it("sends the signing source alone when nothing else is held", async () => {
    const wallet = await makeWallet();
    const [sub] = wallet.sources;

    expect(
      buildUserLinkBodies({ ...wallet, sources: [sub], iat: IAT }).map(ids),
    ).toEqual([[sub.id]]);
  });

  it("sends nothing once every source is linked", async () => {
    const wallet = await makeWallet();

    expect(
      buildUserLinkBodies({
        ...wallet,
        linkedIds: new Set(wallet.sources.map(({ id }) => id)),
        iat: IAT,
      }),
    ).toEqual([]);
  });

  it("dedupes by id, one consent per id", async () => {
    const wallet = await makeWallet();

    const [body] = buildUserLinkBodies({
      ...wallet,
      sources: [...wallet.sources, wallet.sources[2], wallet.sources[0]],
      iat: IAT,
    });

    expect(ids(body)).toEqual(wallet.sources.map(({ id }) => id));
  });

  it("splits a large set into bodies of at most MAX_LINK_SOURCES, each carrying the signer", async () => {
    const wallet = await makeWallet();
    const many = makeManySources(300);
    const sources = [...wallet.sources, ...many.sources];
    const signers = new Map([...wallet.signers, ...many.signers]);
    const sub = wallet.identity.sourceId;

    const bodies = buildUserLinkBodies({
      identity: wallet.identity,
      sources,
      signers,
      iat: IAT,
    });

    // `sub` takes one slot in every body.
    expect(bodies.length).toBe(
      Math.ceil((sources.length - 1) / (MAX_LINK_SOURCES - 1)),
    );
    expect(bodies[0].sources).toHaveLength(MAX_LINK_SOURCES);
    for (const body of bodies) {
      expect(body.sources.length).toBeLessThanOrEqual(MAX_LINK_SOURCES);
      expect(ids(body)[0]).toBe(sub);
      expect(new Set(ids(body)).size).toBe(body.sources.length);
    }
    const others = bodies.flatMap((body) => ids(body).slice(1));
    expect(others).toHaveLength(sources.length - 1);
    expect(new Set([sub, ...others])).toEqual(
      new Set(sources.map(({ id }) => id)),
    );
    expectConsentsVerify(bodies[bodies.length - 1], sub, IAT);
  });

  it("binds every consent to the signer and iat", async () => {
    const wallet = await makeWallet();
    const [body] = buildUserLinkBodies({ ...wallet, iat: IAT });

    expect(() =>
      expectConsentsVerify(body, wallet.identity.sourceId, IAT + 1),
    ).toThrow();
    expect(() =>
      expectConsentsVerify(body, SOURCE_IDENTITY_VECTOR.sourceId, IAT),
    ).toThrow();
  });

  it("throws when the signing source is not among the sources", async () => {
    const wallet = await makeWallet();

    expect(() =>
      buildUserLinkBodies({
        ...wallet,
        sources: wallet.sources.slice(1),
        iat: IAT,
      }),
    ).toThrow("the signing source is not held");
  });
});

describe("buildUserLinkRequestBodies", () => {
  const stores = { sessionStore: {} as any, localStore: {} as any };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when the session holds no signer", async () => {
    mockGetSigningIdentity.mockResolvedValue(null);

    expect(await buildUserLinkRequestBodies(stores)).toBeNull();
    expect(mockGetWalletSources).not.toHaveBeenCalled();
  });

  it("returns null when the session locks after the identity resolves", async () => {
    const wallet = await makeWallet();
    mockGetSigningIdentity.mockResolvedValue(wallet.identity);
    // A lock landed during getSigningIdentity's pin read: the sources are gone.
    mockGetWalletSources.mockResolvedValue({ sources: [], signers: new Map() });

    expect(await buildUserLinkRequestBodies(stores)).toBeNull();
  });

  it("signs every body under the iat of the given clock reading", async () => {
    const wallet = await makeWallet();
    const many = makeManySources(200);
    mockGetSigningIdentity.mockResolvedValue(wallet.identity);
    mockGetWalletSources.mockResolvedValue({
      sources: [...wallet.sources, ...many.sources],
      signers: new Map([...wallet.signers, ...many.signers]),
    });

    const result = await buildUserLinkRequestBodies({
      ...stores,
      now: IAT * 1000 + 999,
    });

    expect(result?.iat).toBe(IAT);
    expect(result?.identity).toBe(wallet.identity);
    expect(result!.bodies.length).toBeGreaterThan(1);
    for (const body of result!.bodies) {
      expectConsentsVerify(body, wallet.identity.sourceId, IAT);
    }
  });
});
