function getSecUidInPage() {
  try {
    var w = window.__$UNIVERSAL_DATA$__;
    if (!w || !w.__DEFAULT_SCOPE__) return null;
    var ctx = w.__DEFAULT_SCOPE__["webapp.app-context"];
    if (!ctx || !ctx.user) return null;
    return ctx.user.secUid || null;
  } catch (e) {
    return null;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSecUid") {
    var tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse({ secUid: null });
      return true;
    }
    chrome.scripting.executeScript(
      { target: { tabId }, world: "MAIN", func: getSecUidInPage },
      function (results) {
        var secUid = (results && results[0] && results[0].result) || null;
        sendResponse({ secUid: secUid });
      }
    );
    return true;
  }

  if (request.action === "startRemovingReposts") {
    const config = request.payload?.config || {};
    chrome.tabs.create({ url: "https://www.tiktok.com/profile", active: true }, (tab) => {
      const tabId = tab.id;
      const listener = (id, info) => {
        if (id === tabId && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          setTimeout(() => {
            chrome.tabs.get(tabId, (tabInfo) => {
              const url = (tabInfo && tabInfo.url) || "";
              const isForyou = /\/foryou(\?|$)/i.test(url);
              const isLogin = /\/login(\?|$|\/)/i.test(url);
              const notLoggedInRedirect = isForyou || isLogin;
              const payload = { ...config, notLoggedInRedirect };
              function sendConfig(attempt) {
                chrome.tabs.sendMessage(tabId, { action: "startRemovingReposts", config: payload })
                  .catch((e) => {
                    if (attempt < 3) setTimeout(() => sendConfig(attempt + 1), 800);
                  });
              }
              sendConfig(0);
            });
          }, 4000);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    sendResponse({ ok: true });
  }
  return true;
});
