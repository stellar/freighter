import { history } from "popup/constants/history";
import { navigateTo } from "../navigateTo";

describe("navigateTo", () => {
  it("should call history.push", () => {
    history.push = jest.fn();
    const PATH = "/path-name";

    navigateTo(PATH);
    expect(history.push).toHaveBeenCalledWith({ pathname: PATH });
  });
});
