import { KEY_ID_LIST } from "constants/localStorageTypes";

export const getKeyIdList = () =>
  JSON.parse(localStorage.getItem(KEY_ID_LIST) || "[]");
