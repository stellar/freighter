import { findTokenListIcon } from "../getIconFromTokenList";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const CONTRACT = "CBI7UCH5KGSVQRO5H4SUCZUTZABCITZLRHQQZTWL2TK4RZ72TAR6IHRV";

const list = (name: string, assets: Record<string, string>[]) =>
  ({ name, assets }) as any;

describe("findTokenListIcon", () => {
  it("takes the first list that carries the asset", () => {
    expect(
      findTokenListIcon({
        issuerId: ISSUER,
        code: "USDC",
        assetsListsData: [
          list("first", [{ code: "USDC", issuer: ISSUER, icon: "first.png" }]),
          list("second", [
            { code: "USDC", issuer: ISSUER, icon: "second.png" },
          ]),
        ],
      }),
    ).toEqual({ icon: "first.png", canonicalAsset: `USDC:${ISSUER}` });
  });

  it("matches a contract token by its contract ID", () => {
    expect(
      findTokenListIcon({
        contractId: CONTRACT,
        code: "TKN",
        assetsListsData: [list("l", [{ contract: CONTRACT, icon: "tkn.png" }])],
      }),
    ).toEqual({ icon: "tkn.png", canonicalAsset: `TKN:${CONTRACT}` });
  });

  it("finds nothing for an unlisted asset", () => {
    expect(
      findTokenListIcon({ issuerId: ISSUER, code: "USDC", assetsListsData: [] })
        .icon,
    ).toBeUndefined();
  });
});
