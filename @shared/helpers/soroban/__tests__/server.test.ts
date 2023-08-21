import {
  Memo,
  MemoType,
  Operation,
  Server,
  Transaction,
  TransactionBuilder,
} from "soroban-client";
import { simulateTx } from "../server";

export const FUTURENET_DETAILS = {
  network: "FUTURENET",
  networkUrl: "https://horizon-futurenet.stellar.org",
  networkPassphrase: "Test SDF Future Network ; October 2022",
};

describe("Soroban Helpers - ", () => {
  describe("simulateTx", () => {
    const TEST_XDR =
      "AAAAAgAAAACM6IR9GHiRoVVAO78JJNksy2fKDQNs2jBn8bacsRLcrAAAAGQAALDTAAAAmQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAACAAAAEgAAAAGvUaDMj6075hfTiVH7DPAwLD7vh/GD+dlkZfp6o9gqdgAAAA8AAAAGc3ltYm9sAAAAAAAAAAAAAAAAAAA=";
    const testTx = TransactionBuilder.fromXDR(
      TEST_XDR,
      FUTURENET_DETAILS.networkPassphrase,
    ) as Transaction<Memo<MemoType>, Operation[]>;
    const mockSimResult = {
      auth: [],
      xdr: "AAAAAwAAAAA=",
    };
    const mockSim = jest.fn(
      (_tx: Transaction<Memo<MemoType>, Operation[]>) => ({
        results: [mockSimResult],
      }),
    );
    const mockServer = ({
      simulateTransaction: mockSim,
    } as any) as Server;

    test("should take tx/server and return a native type according to the generic type argument", async () => {
      const result = await simulateTx<number>(testTx, mockServer);
      expect(typeof result).toEqual("number");
    });
  });
});
