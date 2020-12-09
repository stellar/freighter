import buffer from "buffer";
import { get } from "lodash";

import { MEMO_TYPES } from "popup/constants/memoTypes";

export const decodeMemo = (memo: {}) => {
  const memoType = get(memo, "_switch.name", "");

  if (memoType === MEMO_TYPES.MEMO_ID) {
    return get(memo, "_value.low", "");
  }
  const decodeMethod = memoType === MEMO_TYPES.MEMO_HASH ? "hex" : "utf-8";
  return buffer.Buffer.from(get(memo, "_value.data", "")).toString(
    decodeMethod,
  );
};
