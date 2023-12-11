import {
  Memo,
  MemoType,
  Operation,
  SorobanRpc,
  nativeToScVal,
  Transaction,
  TransactionBuilder,
} from "stellar-sdk";
import { simulateTx } from "../server";

export const FUTURENET_DETAILS = {
  network: "FUTURENET",
  networkUrl: "https://horizon-futurenet.stellar.org",
  networkPassphrase: "Test SDF Future Network ; October 2022",
};

describe("Soroban Helpers - ", () => {
  describe("simulateTx", () => {
    const TEST_XDR =
      "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAGQAAAUcAAAABgAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAAByJKWoF9C6Tt+//t+9ocHp4kExcoTwAseKdAcKEUBTXAAAAAHYmFsYW5jZQAAAAABAAAAEgAAAAAAAAAAZ4AU5m5lMnKhtnADB3KJkkfNHUcxrSs8TOoG98skg+QAAAAAAAAAAAAAAAA=";
    const testTx = TransactionBuilder.fromXDR(
      TEST_XDR,
      FUTURENET_DETAILS.networkPassphrase,
    ) as Transaction<Memo<MemoType>, Operation[]>;
    const mockSimResult = {
      auth: [],
      retval: nativeToScVal(100),
    };
    const mockSim = jest.fn(
      (_tx: Transaction<Memo<MemoType>, Operation[]>) => ({
        result: mockSimResult,
      }),
    );
    const mockServer = ({
      simulateTransaction: mockSim,
    } as any) as SorobanRpc.Server;

    test("should take tx/server and return a native type according to the generic type argument", async () => {
      const result = await simulateTx<bigint>(testTx, mockServer);
      expect(typeof result).toEqual("bigint");
    });
  });
});
