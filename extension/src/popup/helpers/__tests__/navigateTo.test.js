import { history } from "popup/constants/history";
import { navigateTo } from "../navigateTo";

const PATH = "/path-name";
const QUERY_PARAM = "?test";

describe("navigateTo", () => {
  it("should call history.push with path", () => {
    history.push = jest.fn();

    navigateTo(PATH);
    expect(history.push).toHaveBeenCalledWith({ pathname: PATH });
  });
  it("should call history.push with path and query params", () => {
    history.push = jest.fn();

    navigateTo(PATH, QUERY_PARAM);
    expect(history.push).toHaveBeenCalledWith({
      pathname: `${PATH}${QUERY_PARAM}`,
    });
  });
});
