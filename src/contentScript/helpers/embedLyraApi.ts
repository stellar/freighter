export const embedLyraApi = () => {
  const url = chrome.extension.getURL("lyraApi.min.js");
  const script = document.createElement("script");
  script.src = url;
  const parentNode = document.head || document.documentElement;
  parentNode.prepend(script);
  script.onload = () => {
    parentNode.removeChild(script);
  };
};
