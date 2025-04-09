import { getKeyIdList, HW_PREFIX } from "background/helpers/account";

// this returns the first non hardware wallet (Hw) keyID, if it exists.
// Used for things like checking a password when a Hw is active.
export const getNonHwKeyID = async () => {
  const keyIdList = await getKeyIdList();
  const nonHwKeyIds = keyIdList.filter(
    (k: string) => k.indexOf(HW_PREFIX) === -1,
  );
  return nonHwKeyIds[0] || "";
};
