import { truncatedPublicKey } from "../stellar";

describe("truncatedPublicKey", () => {
  it("truncates keys", () => {
    expect(
      truncatedPublicKey(
        "GAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWU7B3",
      ),
    ).toBe("GAJV…U7B3");
  });
  it("returns empty on no input", () => {
    expect(truncatedPublicKey("")).toBe("");
  });
});
