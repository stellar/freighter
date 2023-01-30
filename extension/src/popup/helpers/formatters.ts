// remove non digits and decimal
export const cleanAmount = (s: string) => s.replace(/[^0-9.]/g, "");

// This assumes the specific formatting being done is Intl.NumberFormat of deciaml type,
// other formats may not work out of the box
export const preserveCursor = (
  val: string, // raw value from input,
  previousVal: string, // previous state for val
  cleanedVal: string, // string after format/sanitize
) => {
  const decimal = new Intl.NumberFormat("en-US", { style: "decimal" });
  const formatted = cleanedVal.includes(",")
    ? cleanedVal
    : decimal.format(Number(cleanedVal)).toString();
  const previousCommas = (previousVal.match(/,/g) || []).length;
  const newCommas = (formatted.match(/,/g) || []).length;
  const commaDiff = Math.abs(newCommas - previousCommas);
  const cleanedDiff = val.includes(",") // compare formatted vals if previous val had formatting
    ? val.length - formatted.length
    : val.length - cleanedVal.length;

  return {
    commaDiff,
    cleanedDiff,
  };
};

/*
Logic for tracking where the cursor should be after updates/clean/sanitize.

Determine wether we need to sanitize digits and/or decimals.
For digits only, compare the previous value with the newly formatted value and move the cursor according to the difference in number of commas, and difference in number of characters in the raw value vs the cleaned/sanitized(even though we filter out anything but numbers, invalid chars still move the cursor).
If digits & decimals, do previous step on chars before the dot and also account for characters after the dot that are cleaned out but have moved the cursor.
*/
export const formatAmount = (
  val: string,
  staleVal: string,
  cursorPosition: number = 1,
) => {
  const decimal = new Intl.NumberFormat("en-US", { style: "decimal" });
  const maxDigits = 12;
  const cleaned = cleanAmount(val);
  // add commas to pre decimal digits
  if (cleaned.indexOf(".") !== -1) {
    const parts = cleaned.split(".");
    parts[0] = decimal.format(Number(parts[0].slice(0, maxDigits))).toString();
    parts[1] = parts[1].slice(0, 7);

    // To preserve cursor -
    // need to account for commas and filtered chars before dot
    // and need to account for filtered chars after dot
    const uncleanedCurrentAmount = val.split(".");
    const previousVal = staleVal.split(".");

    const { commaDiff, cleanedDiff } = preserveCursor(
      uncleanedCurrentAmount[0],
      previousVal[0],
      parts[0].slice(0, maxDigits),
    );

    // after dot, need to account for filtered chars moving the cursor
    const afterDotCleanedDiff =
      uncleanedCurrentAmount[1].length - parts[1].length;
    return {
      amount: `${parts[0]}.${parts[1]}`,
      newCursor: cursorPosition + commaDiff - cleanedDiff - afterDotCleanedDiff,
    };
  }

  // no decimals, need to account for newly added commas and for chars lost to cleanAmount which moved the cursor
  const { commaDiff, cleanedDiff } = preserveCursor(
    val,
    staleVal,
    cleaned.slice(0, maxDigits),
  );

  return {
    amount: decimal.format(Number(cleaned.slice(0, maxDigits))).toString(),
    newCursor: cursorPosition + commaDiff - cleanedDiff,
  };
};
