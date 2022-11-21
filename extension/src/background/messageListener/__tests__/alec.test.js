import { SERVICE_TYPES } from "@shared/constants/services";
import { popupMessageListener } from "background/messageListener/popupMessageListener";

console.error = jest.fn((e) => console.log(e));

describe("", () => {
  describe("", () => {
    it("", async () => {
      const r = {};
      r.type = SERVICE_TYPES.CREATE_ACCOUNT;
      r.password = "test";
      res = await popupMessageListener(r);

      // ALEC TODO - remove
      console.log({ res });
    });
  });
});
