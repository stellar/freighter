import React from "react";
import { ReviewAuth } from "../ReviewAuth";
import { render, waitFor, screen } from "@testing-library/react";
import * as helpersUrls from "helpers/urls";
import * as ApiInternal from "@shared/api/internal";

import { Wrapper, mockAccounts } from "../../__testHelpers__";

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

it("renders mint token invocation", async () => {
  jest.spyOn(helpersUrls, "decodeString").mockImplementation(() =>
    JSON.stringify({
      transactionXdr:
        "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AADZ7YAAAk8AAAAWgAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABD30ujYcwpqZjIW2lyK64wL5BHP79GvdZoYSIpV2n2WgAAAAEbWludAAAAAIAAAASAAAAAAAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAoAAAAAAAAAAAAAAAAAB6EgAAAAAQAAAAAAAAAAAAAAAQ99Lo2HMKamYyFtpciuuMC+QRz+/Rr3WaGEiKVdp9loAAAABG1pbnQAAAACAAAAEgAAAAAAAAAAZ4AU5m5lMnKhtnADB3KJkkfNHUcxrSs8TOoG98skg+QAAAAKAAAAAAAAAAAAAAAAAAehIAAAAAAAAAABAAAAAAAAAAIAAAAGAAAAAQ99Lo2HMKamYyFtpciuuMC+QRz+/Rr3WaGEiKVdp9loAAAAFAAAAAEAAAAHJmw5RMkkfHXUWpeineQRv/RHraNRdWdTf7FfoulrGcsAAAABAAAABgAAAAEPfS6NhzCmpmMhbaXIrrjAvkEc/v0a91mhhIilXafZaAAAABAAAAABAAAAAgAAAA8AAAAHQmFsYW5jZQAAAAASAAAAAAAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAEAHOw9AAAfDAAAAJQAAAAAAAGzqQAAAAA=",
      domain: "",
    }),
  );

  jest
    .spyOn(ApiInternal, "getIsTokenSpec")
    .mockImplementation(() => Promise.resolve(true));
  jest.spyOn(ApiInternal, "getContractSpec").mockImplementation(() =>
    Promise.resolve({
      definitions: {
        mint: {
          properties: {
            args: {
              required: ["to", "amount"],
            },
          },
        },
      },
    }),
  );

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

  await waitFor(() => screen.getByTestId("AuthDetail"));
  expect(screen.getByTestId("AuthDetail")).toBeDefined();
  await waitFor(() => screen.getByTestId("AuthDetail__transfers"));
  await waitFor(() => screen.getByTestId("OperationParameters"));
  const invocations = screen.queryAllByTestId("AuthDetail__invocation");
  expect(invocations.length).toBe(1);
  const invocationDetailKeys = screen.queryAllByTestId("OperationKeyVal__key");
  const invocationDetailValues = screen.queryAllByTestId(
    "OperationKeyVal__value",
  );

  const invocationParameterNames = screen.queryAllByTestId("ParameterName");
  const invocationParameters = screen.queryAllByTestId("Parameter");

  expect(invocationDetailKeys[0]).toHaveTextContent("Contract ID");
  expect(invocationDetailValues[0]).toHaveTextContent("CAHX…QWW6Copied");

  expect(invocationDetailKeys[1]).toHaveTextContent("Function Name");
  expect(invocationDetailValues[1]).toHaveTextContent("mint");

  expect(invocationParameterNames[0]).toHaveTextContent("to");
  expect(invocationParameters[0]).toHaveTextContent(
    "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
  );

  expect(invocationParameterNames[1]).toHaveTextContent("amount");
  expect(invocationParameters[1]).toHaveTextContent("500000");
});

it("renders all subinvocations", async () => {
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

  await waitFor(() => screen.getByTestId("AuthDetail"));
  expect(screen.getByTestId("AuthDetail")).toBeDefined();
  await waitFor(() => screen.getByTestId("AuthDetail__transfers"));
  const invocations = screen.queryAllByTestId("AuthDetail__invocation");
  expect(invocations.length).toBe(3);
});

it("renders create contract args for subinvocations", async () => {
  jest.spyOn(helpersUrls, "decodeString").mockImplementation(() =>
    JSON.stringify({
      transactionXdr:
        "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",
      domain: "",
    }),
  );

  jest
    .spyOn(ApiInternal, "getIsTokenSpec")
    .mockImplementation(() => Promise.resolve(false));

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

  await waitFor(() => screen.getByTestId("AuthDetail"));
  expect(screen.getByTestId("AuthDetail")).toBeDefined();
  await waitFor(() => screen.getByTestId("AuthDetail__transfers"));
  const invocations = screen.queryAllByTestId("AuthDetail__invocation");
  expect(invocations.length).toBe(1);
  const subInvocations = screen.queryAllByTestId(
    "AuthDetail__createWasmInvocation",
  );
  expect(subInvocations.length).toBe(1);
});
