// Test fixture: consumed only by the derivation unit tests, not by production code.
// It is the canonical cross-platform parity contract — freighter-mobile commits the
// same values and asserts identical output. Nothing in CI cross-checks the two
// files, so every row added here must land in
// freighter-mobile/src/services/auth/authKeypairVectors.ts verbatim.
// SOURCE OF TRUTH: wallet-eng-monorepo design-docs/contact-lists/Freighter Auth Keypair Derivation Design Doc.md
// and design-docs/unified-user-model/v2.md (source identities).
//
// Two derivations are pinned:
//   1. AUTH_KEYPAIR_VECTORS — the phrase source identity, deriveAuthKeypair(mnemonic).
//      Frozen: it is the analytics identity of every shipped wallet.
//   2. SOURCE_IDENTITY_VECTOR / ACCOUNT_SOURCE_VECTORS — the account source
//      identity, deriveSourceIdentity(seed32).
// authSeedHex isolates failures: a wrong authSeedHex => HMAC step diverged
// (e.g. key/message reversed); a right authSeedHex but wrong userId =>
// Ed25519 step diverged.
export interface AuthKeypairVector {
  mnemonic: string;
  authSeedHex: string; // hex of HMAC-SHA256(seedBytes, AUTH_SALT), 32 bytes
  userId: string; // lowercase hex Ed25519 public key, 64 chars
}

export const AUTH_KEYPAIR_VECTORS: AuthKeypairVector[] = [
  {
    mnemonic:
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    authSeedHex:
      "cf8ef34afb730ffd0807ee8731f2378a4f6c702e2f14915976fac4afa711b52d",
    userId: "ec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797",
  },
  {
    mnemonic:
      "illness spike retreat truth genius clock brain pass fit cave bargain toe",
    authSeedHex:
      "882835b30a2c5b011f1b2424a84f4cd39f342f4d12be574e4233dbf9b98976d1",
    userId: "bd9498475c7191c5e9a5e18edda2402ab0ae527580a6c38b2a32a77c65729cd7",
  },
];

// freighter-auth-v1 over a fixed 32-byte ed25519 seed. Pins deriveSourceIdentity
// on its own, independent of any phrase or derivation path.
export interface SourceIdentityVector {
  seed32Hex: string; // 32-byte raw ed25519 secret seed, hex
  sourceId: string; // lowercase hex Ed25519 public key, 64 chars
}

export const SOURCE_IDENTITY_VECTOR: SourceIdentityVector = {
  seed32Hex: "0101010101010101010101010101010101010101010101010101010101010101",
  sourceId: "1e1b96575b948f4caa6b7073fd6e58ca958ce10dda59954e3de9db3d7267a1d5",
};

// (mnemonic, index) -> (S…, G…, sourceId) at m/44'/148'/index'. The test derives
// the source id from the phrase path AND from Keypair.fromSecret(secret) and
// asserts both equal `sourceId`. That equality is what lets a wallet that imports
// one exported account resolve to the phrase's user; if it ever broke, nothing
// would error. Every sourceId must also differ from the phrase's userId above
// and from the account's own public key, or the identity table would reveal
// G addresses.
export interface AccountSourceRow {
  index: number;
  secret: string; // S…, the exported secret key
  publicKey: string; // G…
  sourceId: string; // lowercase hex Ed25519 public key, 64 chars
}

export interface AccountSourceVector {
  mnemonic: string;
  accounts: AccountSourceRow[];
}

export const ACCOUNT_SOURCE_VECTORS: AccountSourceVector[] = [
  {
    mnemonic:
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    accounts: [
      {
        index: 0,
        secret: "SBUV3MRWKNS6AYKZ6E6MOUVF2OYMON3MIUASWL3JLY5E3ISDJFELYBRZ",
        publicKey: "GB3JDWCQJCWMJ3IILWIGDTQJJC5567PGVEVXSCVPEQOTDN64VJBDQBYX",
        sourceId:
          "0b865e3c89637446ff2e203edcfa00f78d3cf49ddf8666ec0789960e1537cc41",
      },
      {
        index: 1,
        secret: "SCHDCVCWGAKGIMTORV6K5DYYV3BY4WG3RA4M6MCBGJLHUCWU2MC6DL66",
        publicKey: "GDVSYYTUAJ3ACHTPQNSTQBDQ4LDHQCMNY4FCEQH5TJUMSSLWQSTG42MV",
        sourceId:
          "6ac3def6a299cad577de5304e66fd32354d2ff0f3e4edb81b339f5b762f2a644",
      },
      {
        index: 2,
        secret: "SAPLVTLUXSDLFRDGCCFLPDZMTCEVMP3ZXTM74EBJCVKZKM34LGQPF7K3",
        publicKey: "GBFPWBTN4AXHPWPTQVQBP4KRZ2YVYYOGRMV2PEYL2OBPPJDP7LECEVHR",
        sourceId:
          "dfb25db00025cbb9b15c2be897d097a8847cb6f4c1182cdd24ad3209a42c2636",
      },
    ],
  },
  {
    // SEP-0005 Test 1, indices 0-2. The S…/G… pairs are the published rows.
    mnemonic:
      "illness spike retreat truth genius clock brain pass fit cave bargain toe",
    accounts: [
      {
        index: 0,
        secret: "SBGWSG6BTNCKCOB3DIFBGCVMUPQFYPA2G4O34RMTB343OYPXU5DJDVMN",
        publicKey: "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ6",
        sourceId:
          "3696cb528343a1cb3033b0da2baaaddb0994607279581ebaa1a75f81accb7a10",
      },
      {
        index: 1,
        secret: "SCEPFFWGAG5P2VX5DHIYK3XEMZYLTYWIPWYEKXFHSK25RVMIUNJ7CTIS",
        publicKey: "GBAW5XGWORWVFE2XTJYDTLDHXTY2Q2MO73HYCGB3XMFMQ562Q2W2GJQX",
        sourceId:
          "92cb82d95fb1a6c9f37147778ff6d33605aec0ec2834ee9fb57eb5cd8087df91",
      },
      {
        index: 2,
        secret: "SDAILLEZCSA67DUEP3XUPZJ7NYG7KGVRM46XA7K5QWWUIGADUZCZWTJP",
        publicKey: "GAY5PRAHJ2HIYBYCLZXTHID6SPVELOOYH2LBPH3LD4RUMXUW3DOYTLXW",
        sourceId:
          "acff8826e67a5f94f1d7d5ca4dd9c623b3f9e2cb1bf98d15aee90e19477a7787",
      },
    ],
  },
];
