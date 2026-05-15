import React from "react";
import { render, screen } from "@testing-library/react";

import { RequestState } from "constants/request";
import { Wrapper } from "popup/__testHelpers__";
import { AssetVisibility } from "popup/components/manageAssets/AssetVisibility";
import * as UseGetAssetData from "popup/components/manageAssets/AssetVisibility/hooks/useGetAssetData";

describe("AssetVisibility RequestState.ERROR", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the fetch-fail notification without throwing on RequestState.ERROR", () => {
    jest.spyOn(UseGetAssetData, "useGetAssetData").mockReturnValue({
      state: {
        state: RequestState.ERROR,
        data: null,
        error: new Error("boom"),
      },
      fetchData: jest.fn().mockResolvedValue(undefined),
      changeAssetVisibility: jest.fn().mockResolvedValue(undefined),
    } as any);

    render(
      <Wrapper state={{}} routes={["/"]}>
        <AssetVisibility />
      </Wrapper>,
    );

    expect(
      screen.getByTestId("asset-visibility-fetch-fail"),
    ).toBeInTheDocument();
  });
});
