import { Asset, Networks } from "stellar-sdk";

import { NETWORKS } from "@shared/constants/stellar";
import { SACS } from "./fixtures/sac";

// The fixture spells out addresses production code derives; keep them honest.
describe("SAC fixtures", () => {
  it("match the addresses derived from each asset", () => {
    expect(SACS[NETWORKS.PUBLIC]).toEqual({
      XLM: Asset.native().contractId(Networks.PUBLIC),
      USDC: new Asset(
        "USDC",
        "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      ).contractId(Networks.PUBLIC),
      EURC: new Asset(
        "EURC",
        "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2",
      ).contractId(Networks.PUBLIC),
    });
    expect(SACS[NETWORKS.TESTNET]).toEqual({
      XLM: Asset.native().contractId(Networks.TESTNET),
    });
  });
});
