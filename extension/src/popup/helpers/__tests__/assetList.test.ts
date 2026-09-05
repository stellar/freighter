import { assetMatchesListItem } from "popup/helpers/assetList";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const CONTRACT = "CCV3NAKLIBBNSJNNTV2AZVRX6VODUDWK4TVYILE5MW6R45SSQJS5VCAM";

describe("assetMatchesListItem", () => {
  it("matches on a shared issuer", () => {
    expect(assetMatchesListItem({ issuer: ISSUER }, { issuer: ISSUER })).toBe(
      true,
    );
  });

  it("matches on a shared contract", () => {
    expect(
      assetMatchesListItem({ contract: CONTRACT }, { contract: CONTRACT }),
    ).toBe(true);
  });

  it("does not match when both sides are simply absent", () => {
    expect(assetMatchesListItem({}, {})).toBe(false);
  });

  it("does not match a contract-less asset against a contract-less entry", () => {
    expect(
      assetMatchesListItem({ issuer: ISSUER }, { issuer: "GDIFFERENT" }),
    ).toBe(false);
  });
});
