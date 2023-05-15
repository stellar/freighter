import {
  initContentScriptMessageListener,
  initExtensionMessageListener,
  initInstalledListener,
  initAlarmListener,
} from "background";

import { buildStore } from "background/store";

async function main() {
  const store = await buildStore();
  initContentScriptMessageListener();
  initExtensionMessageListener(store);
  initInstalledListener();
  initAlarmListener(store);
}

main();
