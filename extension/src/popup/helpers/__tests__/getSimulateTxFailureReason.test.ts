import { getSimulateTxFailureReason } from "popup/helpers/blendDeposit";

// What the v1 backend's /simulate-tx sends back when it rejects a simulation:
// "Error: <name> - <message>", then the stack.
const reply = (message: string) =>
  `Error: Error - ${message}\n    at simulateTx (/app/src/helper/soroban.ts:1:1)`;

describe("getSimulateTxFailureReason", () => {
  it("keeps the host error's first line from a failed simulation", () => {
    const simulation = JSON.stringify({
      error:
        "HostError: Error(Contract, #1206)\n\nEvent log (newest first):\n   0: [Diagnostic Event] …",
      events: [],
      latestLedger: 100,
    });

    expect(
      getSimulateTxFailureReason(reply(`simulation incorrect: ${simulation}`)),
    ).toBe("HostError: Error(Contract, #1206)");
  });

  it("keeps the backend's message, without its stack, for anything else", () => {
    expect(getSimulateTxFailureReason(reply("Bad Request"))).toBe(
      "Bad Request",
    );
  });

  it("keeps the message when what follows the prefix isn't JSON", () => {
    expect(
      getSimulateTxFailureReason(reply("simulation incorrect: not json")),
    ).toBe("simulation incorrect: not json");
  });

  it("passes a reply in no known shape through", () => {
    expect(getSimulateTxFailureReason("Pool is frozen")).toBe("Pool is frozen");
  });
});
