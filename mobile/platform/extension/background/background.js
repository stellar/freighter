console.log("bg", chrome);

chrome.runtime.onMessage.addListener((req, sender) => {
  console.log(req, sender);
  console.log(chrome.storage);
  return "TEST_RESPONSE";
});
