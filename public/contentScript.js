const url = chrome.extension.getURL("lyraApi.min.js");
const s = document.createElement("script");
s.src = url;
(document.head || document.documentElement).appendChild(s);
s.onload = function() {
  s.parentNode.removeChild(s);
};
