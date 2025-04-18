import { Store } from "redux";

import { reset } from "background/ducks/session";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { EXPERIMENTAL } from "constants/featureFlag";

export const resetExperimentalData = async ({
  localStore,
  sessionStore,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  if (EXPERIMENTAL !== true) {
    return { error: "Not in experimental mode" };
  }
  await localStore.clear();
  sessionStore.dispatch(reset());
  return {};
};
