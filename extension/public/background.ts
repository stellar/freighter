import {
  initContentScriptMessageListener,
  initExtensionMessageListener,
  initInstalledListener,
  initInitAlarmListener,
} from "background";

import { buildStore } from "background/store";

async function main() {
  const store = await buildStore();
  initContentScriptMessageListener();
  initExtensionMessageListener(store);
  initInstalledListener();
  initInitAlarmListener(store);
}

main();
