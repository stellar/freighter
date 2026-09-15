import React from "react";
import { render, screen } from "@testing-library/react";
import { captureException } from "@sentry/browser";

import { ErrorBoundary } from "popup/components/ErrorBoundary";

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));
const mockedCapture = captureException as jest.Mock;

const Boom = (): React.ReactElement => {
  throw new TypeError("kaboom");
};

describe("ErrorBoundary", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    mockedCapture.mockReset();
    // React logs the caught error itself; silence it so the run stays readable.
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => consoleError.mockRestore());

  it("reports the Error object, not the component stack string", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(mockedCapture).toHaveBeenCalledTimes(1);
    const [reported, context] = mockedCapture.mock.calls[0];

    // The whole point: a string here loses the type, the message and the
    // stack trace — everything that makes a crash diagnosable in Sentry.
    expect(typeof reported).not.toBe("string");
    expect(reported).toBeInstanceOf(Error);
    expect((reported as Error).message).toBe("kaboom");
    // The component stack is still carried, just as context rather than as
    // the payload.
    expect(context?.extra?.componentStack).toBeDefined();
  });

  it("renders the fallback instead of the crashed subtree", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText("An unexpected error has occurred")).toBeDefined();
  });
});
