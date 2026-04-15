import React from "react";
import { Provider } from "react-redux";
import * as StellarSdk from "stellar-sdk";
import { renderHook, act } from "@testing-library/react";
import { useValidateTransactionMemo } from "../useValidateTransactionMemo";
import { makeDummyStore } from "popup/__testHelpers__";
import * as ApiInternal from "@shared/api/internal";

describe("useValidateTransactionMemo", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it("should validate transaction memo if memo required accounts are found", async () => {
    const txBuilderSpy = jest.spyOn(StellarSdk.TransactionBuilder, "fromXDR");
    jest.spyOn(ApiInternal, "getMemoRequiredAccounts").mockResolvedValue({
      memoRequiredAccounts: [
        {
          address: "G123",
          tags: ["memo-required"],
        },
      ],
    } as unknown as Awaited<
      ReturnType<typeof ApiInternal.getMemoRequiredAccounts>
    >);

    const preloadedState = {
      auth: {
        publicKey: "G123",
      },
      settings: {
        networkDetails: {
          networkUrl: "https://horizon.stellar.org",
          networkPassphrase: "Public Global Stellar Network ; September 2015",
        },
        isMemoValidationEnabled: true,
      },
    };

    const store = makeDummyStore(preloadedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    await act(async () => {
      renderHook(
        () =>
          useValidateTransactionMemo(
            "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAPQkAAAAVHAAAAAQAAAAEAAAAAAAAAAAAAAABpWAR+AAAAAAAAAAEAAAAAAAAAAAAAAABVZkfzT8IUCc68cala6hWfNx8vR5j+La0nQf3V+7AGYwAAAAAAmJaAAAAAAAAAAAHLJIPkAAAAQClszTottW2tid+Uuel26KKSL827i5WzrZVVsdvM6sPmbXZ28AWnLX92OAXbr7k7mgJsEYRMUlJbr+wFTHGzaAc=",
          ),
        {
          wrapper: Wrapper(store),
        },
      );
    });

    expect(txBuilderSpy).toHaveBeenCalledWith(
      "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAPQkAAAAVHAAAAAQAAAAEAAAAAAAAAAAAAAABpWAR+AAAAAAAAAAEAAAAAAAAAAAAAAABVZkfzT8IUCc68cala6hWfNx8vR5j+La0nQf3V+7AGYwAAAAAAmJaAAAAAAAAAAAHLJIPkAAAAQClszTottW2tid+Uuel26KKSL827i5WzrZVVsdvM6sPmbXZ28AWnLX92OAXbr7k7mgJsEYRMUlJbr+wFTHGzaAc=",
      "Public Global Stellar Network ; September 2015",
    );
  });
  it("should not validate transaction memo if memo required accounts are not found", async () => {
    const txBuilderSpy = jest.spyOn(StellarSdk.TransactionBuilder, "fromXDR");
    jest
      .spyOn(ApiInternal, "getMemoRequiredAccounts")
      .mockResolvedValue({ memoRequiredAccounts: [] } as unknown as Awaited<
        ReturnType<typeof ApiInternal.getMemoRequiredAccounts>
      >);

    const preloadedState = {
      auth: {
        publicKey: "G123",
      },
      settings: {
        networkDetails: {
          networkUrl: "https://horizon.stellar.org",
          networkPassphrase: "Public Global Stellar Network ; September 2015",
        },
        isMemoValidationEnabled: true,
      },
    };

    const store = makeDummyStore(preloadedState);
    const Wrapper =
      (store: ReturnType<typeof makeDummyStore>) =>
      ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

    await act(async () => {
      renderHook(
        () =>
          useValidateTransactionMemo(
            "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAPQkAAAAVHAAAAAQAAAAEAAAAAAAAAAAAAAABpWAR+AAAAAAAAAAEAAAAAAAAAAAAAAABVZkfzT8IUCc68cala6hWfNx8vR5j+La0nQf3V+7AGYwAAAAAAmJaAAAAAAAAAAAHLJIPkAAAAQClszTottW2tid+Uuel26KKSL827i5WzrZVVsdvM6sPmbXZ28AWnLX92OAXbr7k7mgJsEYRMUlJbr+wFTHGzaAc=",
          ),
        {
          wrapper: Wrapper(store),
        },
      );
    });

    expect(txBuilderSpy).not.toHaveBeenCalledWith(
      "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAPQkAAAAVHAAAAAQAAAAEAAAAAAAAAAAAAAABpWAR+AAAAAAAAAAEAAAAAAAAAAAAAAABVZkfzT8IUCc68cala6hWfNx8vR5j+La0nQf3V+7AGYwAAAAAAmJaAAAAAAAAAAAHLJIPkAAAAQClszTottW2tid+Uuel26KKSL827i5WzrZVVsdvM6sPmbXZ28AWnLX92OAXbr7k7mgJsEYRMUlJbr+wFTHGzaAc=",
      "Public Global Stellar Network ; September 2015",
    );
  });
});
