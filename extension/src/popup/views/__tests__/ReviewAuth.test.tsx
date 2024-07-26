import React from "react";
import { ReviewAuth } from "../ReviewAuth";
import { render, waitFor, screen } from "@testing-library/react";
import * as helpersUrls from "helpers/urls";
import * as ApiInternal from "@shared/api/internal";

import { Wrapper, mockAccounts } from "../../__testHelpers__";

it("renders", async () => {
  jest.spyOn(helpersUrls, "decodeString").mockImplementation(() =>
    JSON.stringify({
      transactionXdr:
        "AAAAAgAAAAAlcrcfutDJ+hMUZuxPA1qNvyXSgOFZlat7wZhqYFdBhgASjNUACl7RAAAABgAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABLUQMY5fXQ4rCPgi1dMe6IbAhzoD4Jd0SOFgC+wjBVnUAAAAEbWludAAAAAIAAAASAAAAAAAAAAAlcrcfutDJ+hMUZuxPA1qNvyXSgOFZlat7wZhqYFdBhgAAAAoAAAAAAAAAAA3gtrOnZAAAAAAAAQAAAAAAAAAAAAAAAS1EDGOX10OKwj4ItXTHuiGwIc6A+CXdEjhYAvsIwVZ1AAAABG1pbnQAAAACAAAAEgAAAAAAAAAAJXK3H7rQyfoTFGbsTwNajb8l0oDhWZWre8GYamBXQYYAAAAKAAAAAAAAAAAN4Lazp2QAAAAAAAEAAAAAAAAAAVisuXJvxu7hB1oH9bObqpJQreqKFXev2x3zbbD4437JAAAAGXZhbGlkYXRlX21pbnRfZWxpZ2liaWxpdHkAAAAAAAACAAAAEgAAAAAAAAAAJXK3H7rQyfoTFGbsTwNajb8l0oDhWZWre8GYamBXQYYAAAASAAAAAS1EDGOX10OKwj4ItXTHuiGwIc6A+CXdEjhYAvsIwVZ1AAAAAQAAAAAAAAABKtjThvnRwMXQdmmYllVl3HQdiddNCh78uYDjwz8adYYAAAAIdHJhbnNmZXIAAAADAAAAEgAAAAAAAAAAJXK3H7rQyfoTFGbsTwNajb8l0oDhWZWre8GYamBXQYYAAAASAAAAAAAAAACPjoWcsgROhduBNYzoI+oVTZdoq74KhJkDY4PGsEK/QQAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABgAAAAYAAAABKtjThvnRwMXQdmmYllVl3HQdiddNCh78uYDjwz8adYYAAAAUAAAAAQAAAAYAAAABLUQMY5fXQ4rCPgi1dMe6IbAhzoD4Jd0SOFgC+wjBVnUAAAAUAAAAAQAAAAYAAAABWKy5cm/G7uEHWgf1s5uqklCt6ooVd6/bHfNtsPjjfskAAAAUAAAAAQAAAAdSIN3Wl0XMPDpwfX5uY3ar3P+cqUdsak+qFp6yD/YH7gAAAAegQ22pdkFsSCwBbD5hv/ZDhWQxzfCO/GQagNGgGwu54wAAAAfD0RJ8Zsr9/2wYjtR+1W4M60RC8CTACQzPpI4At++M0QAAAAMAAAAGAAAAASrY04b50cDF0HZpmJZVZdx0HYnXTQoe/LmA48M/GnWGAAAAEAAAAAEAAAACAAAADwAAAAdCYWxhbmNlAAAAABIAAAAAAAAAACVytx+60Mn6ExRm7E8DWo2/JdKA4VmVq3vBmGpgV0GGAAAAAQAAAAYAAAABKtjThvnRwMXQdmmYllVl3HQdiddNCh78uYDjwz8adYYAAAAQAAAAAQAAAAIAAAAPAAAAB0JhbGFuY2UAAAAAEgAAAAAAAAAAj46FnLIEToXbgTWM6CPqFU2XaKu+CoSZA2ODxrBCv0EAAAABAAAABgAAAAEtRAxjl9dDisI+CLV0x7ohsCHOgPgl3RI4WAL7CMFWdQAAABAAAAABAAAAAgAAAA8AAAAHQmFsYW5jZQAAAAASAAAAAAAAAAAlcrcfutDJ+hMUZuxPA1qNvyXSgOFZlat7wZhqYFdBhgAAAAEASLCUAAA37AAAAbwAAAAAAANKlQAAAAFgV0GGAAAAQELR8DReG0+YTYP3cwOe7VhbRTwQPUF+9TZB1x09X6rVL9QGaAhcstu6p9YiqOnyepq0fP1+nhIGsRuUv/924gA=",
      domain: "",
    }),
  );

  jest
    .spyOn(ApiInternal, "getIsTokenSpec")
    .mockImplementation(() => Promise.resolve(true));

  const defaultSettingsState = {
    networkDetails: {
      isTestnet: false,
      network: "",
      networkName: "",
      otherNetworkName: "",
      networkUrl: "",
      networkPassphrase: "foo",
    },
  };

  render(
    <Wrapper
      state={{
        auth: {
          allAccounts: mockAccounts,
          publicKey: mockAccounts[0].publicKey,
        },
        settings: {
          isExperimentalModeEnabled: true,
          networkDetails: {
            ...defaultSettingsState.networkDetails,
            networkPassphrase: "Test SDF Future Network ; October 2022",
          },
        },
      }}
    >
      <ReviewAuth />
    </Wrapper>,
  );

  await waitFor(() => screen.getByTestId("ReviewAuth"));
  screen.debug();
  expect(screen.getByTestId("ReviewAuth")).toBeDefined();
  const invocations = screen.queryAllByTestId("ManageAssetRow");
  expect(invocations.length).toBe(3);
});
