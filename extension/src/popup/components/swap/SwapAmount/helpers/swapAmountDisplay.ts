import { InputType } from "helpers/transaction";

/**
 * Sizes the displayed amount by its digit count. Each card passes its OWN value
 * so the read-only receive amount isn't sized off the sell amount.
 */
export const getAmountFontSizeClass = (
  value: string,
): "lg" | "med" | "small" | "xsmall" => {
  const digitsLength = (value || "").replace(/[^0-9]/g, "").length;
  if (digitsLength <= 6) {
    return "lg";
  }
  if (digitsLength <= 10) {
    return "med";
  }
  if (digitsLength <= 13) {
    return "small";
  }
  return "xsmall";
};

/**
 * Builds a card's fiat/secondary line: "$0.00" when no token is picked, the USD
 * value (or "--" when the token has no price) in crypto mode, or the converted
 * "<amount> <code>" in fiat mode. Shared by the sell and receive cards.
 */
export const buildFiatLineText = ({
  hasAsset,
  inputType,
  price,
  priceUsd,
  cryptoAmount,
  code,
}: {
  hasAsset: boolean;
  inputType: InputType;
  price: string | number | null | undefined;
  priceUsd: string | null | undefined;
  cryptoAmount: string | null | undefined;
  code: string;
}): string => {
  if (!hasAsset) {
    return "$0.00";
  }
  if (inputType === "crypto") {
    return price ? `$${priceUsd || "0.00"}` : "--";
  }
  return `${cryptoAmount || "0"} ${code}`;
};
