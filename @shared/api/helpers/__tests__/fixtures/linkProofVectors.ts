// Test fixture: consumed only by the /user/link consent tests, not by production
// code. A verbatim copy of the vectors freighter-backend-v2 verifies against.
// SOURCE OF TRUTH: freighter-backend-v2 internal/auth/link_proof_vectors.json
// (stellar/freighter-backend-v2#166). That file is frozen: a new message format
// gets a new domain prefix and a new vector file, never an edit here. Nothing in
// CI cross-checks the copies, so freighter-mobile must pin the same rows.
//
// Each vector reproduces one consent. `seed` is the signing source's raw ed25519
// seed and `id` its public key; `message` is built from id/kind/signingSourceId/
// iat; `sig` is standard base64. Negative vectors carry a sig made before one
// field was altered and must fail verification.
export interface LinkProofVector {
  name: string;
  seed: string; // 32-byte raw ed25519 seed, hex
  id: string; // lowercase hex Ed25519 public key, 64 chars
  kind: "phrase" | "secret_key";
  signingSourceId: string;
  iat: number; // unix seconds
  message: string;
  sig: string; // standard base64
  expectVerify: boolean;
}

export const LINK_PROOF_DOMAIN = "freighter-user-link-v2";

export const LINK_PROOF_VECTORS: LinkProofVector[] = [
  {
    name: "phrase-self",
    seed: "cf8ef34afb730ffd0807ee8731f2378a4f6c702e2f14915976fac4afa711b52d",
    id: "ec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797",
    kind: "phrase",
    signingSourceId:
      "ec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797",
    iat: 1761000000,
    message:
      "freighter-user-link-v2\nsource\nec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797\nphrase\nec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797\n1761000000",
    sig: "zTFGc+Y4WHHr0ndj78mgw2sX0bepeI3aE2uaTk+E278/YxIjzJ2j8MagABklSykU2/xLTF8YeB4sjVflsH1zAg==",
    expectVerify: true,
  },
  {
    name: "secret-key-signed-by-phrase",
    seed: "52061811ce096e5ea862245ab0094e7711fa15a7300adc8f1d9fb44a844a7202",
    id: "0b865e3c89637446ff2e203edcfa00f78d3cf49ddf8666ec0789960e1537cc41",
    kind: "secret_key",
    signingSourceId:
      "ec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797",
    iat: 1761000000,
    message:
      "freighter-user-link-v2\nsource\n0b865e3c89637446ff2e203edcfa00f78d3cf49ddf8666ec0789960e1537cc41\nsecret_key\nec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797\n1761000000",
    sig: "xcOhPAncXBVqumnLjplWNagain2ctbUDXrh/HTcyr/HXYl1tK1/GwzYc/BggX597LreB4obz7Tk3fV18OfLzCg==",
    expectVerify: true,
  },
  {
    name: "phrase-signed-by-secret-key",
    seed: "882835b30a2c5b011f1b2424a84f4cd39f342f4d12be574e4233dbf9b98976d1",
    id: "bd9498475c7191c5e9a5e18edda2402ab0ae527580a6c38b2a32a77c65729cd7",
    kind: "phrase",
    signingSourceId:
      "6ac3def6a299cad577de5304e66fd32354d2ff0f3e4edb81b339f5b762f2a644",
    iat: 1761000000,
    message:
      "freighter-user-link-v2\nsource\nbd9498475c7191c5e9a5e18edda2402ab0ae527580a6c38b2a32a77c65729cd7\nphrase\n6ac3def6a299cad577de5304e66fd32354d2ff0f3e4edb81b339f5b762f2a644\n1761000000",
    sig: "E36GtglWS9vhcUIPdqFk7eRn0N81kuXFHU4bPHliuHF2m00v3vweFpkGqaTT/pt2vZIO9IEROY4MuUPRyXZ0BQ==",
    expectVerify: true,
  },
  {
    name: "secret-key-self",
    seed: "02f6fef72ecdc03ce8c35817759ffd44c91240e25d4d9b9353bb622cbe2f5dd0",
    id: "6ac3def6a299cad577de5304e66fd32354d2ff0f3e4edb81b339f5b762f2a644",
    kind: "secret_key",
    signingSourceId:
      "6ac3def6a299cad577de5304e66fd32354d2ff0f3e4edb81b339f5b762f2a644",
    iat: 1761000000,
    message:
      "freighter-user-link-v2\nsource\n6ac3def6a299cad577de5304e66fd32354d2ff0f3e4edb81b339f5b762f2a644\nsecret_key\n6ac3def6a299cad577de5304e66fd32354d2ff0f3e4edb81b339f5b762f2a644\n1761000000",
    sig: "o/xuTg6UVW62QUOtQoG10AsuMFpkWKH9CkcBGBJGfuhXFrnnrhPX89ol3rHsIiMAFXbv1oCzbvDIOp0M/pM/DQ==",
    expectVerify: true,
  },
  {
    name: "negative-kind-altered",
    seed: "52061811ce096e5ea862245ab0094e7711fa15a7300adc8f1d9fb44a844a7202",
    id: "0b865e3c89637446ff2e203edcfa00f78d3cf49ddf8666ec0789960e1537cc41",
    kind: "phrase",
    signingSourceId:
      "ec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797",
    iat: 1761000000,
    message:
      "freighter-user-link-v2\nsource\n0b865e3c89637446ff2e203edcfa00f78d3cf49ddf8666ec0789960e1537cc41\nphrase\nec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797\n1761000000",
    sig: "xcOhPAncXBVqumnLjplWNagain2ctbUDXrh/HTcyr/HXYl1tK1/GwzYc/BggX597LreB4obz7Tk3fV18OfLzCg==",
    expectVerify: false,
  },
  {
    name: "negative-signer-altered",
    seed: "882835b30a2c5b011f1b2424a84f4cd39f342f4d12be574e4233dbf9b98976d1",
    id: "bd9498475c7191c5e9a5e18edda2402ab0ae527580a6c38b2a32a77c65729cd7",
    kind: "phrase",
    signingSourceId:
      "ec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797",
    iat: 1761000000,
    message:
      "freighter-user-link-v2\nsource\nbd9498475c7191c5e9a5e18edda2402ab0ae527580a6c38b2a32a77c65729cd7\nphrase\nec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797\n1761000000",
    sig: "E36GtglWS9vhcUIPdqFk7eRn0N81kuXFHU4bPHliuHF2m00v3vweFpkGqaTT/pt2vZIO9IEROY4MuUPRyXZ0BQ==",
    expectVerify: false,
  },
];
