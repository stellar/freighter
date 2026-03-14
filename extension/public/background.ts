import {
  initContentScriptMessageListener,
  initExtensionMessageListener,
  initInstalledListener,
  initAlarmListener,
  initSidebarBehavior,
} from "background";

function main() {
  initContentScriptMessageListener();
  initExtensionMessageListener();
  initInstalledListener();
  initAlarmListener();
  initSidebarBehavior();
}

main();
