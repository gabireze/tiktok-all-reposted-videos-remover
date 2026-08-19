function getSecUidInPage() {
  try {
    // Método 1: Objeto global padrão __$UNIVERSAL_DATA$__
    var w = window.__$UNIVERSAL_DATA$__;
    if (w && w.__DEFAULT_SCOPE__) {
      var ctx = w.__DEFAULT_SCOPE__["webapp.app-context"];
      if (ctx && ctx.user && ctx.user.secUid) return ctx.user.secUid;
    }

    // Método 2: Objeto global alternativo __UNIVERSAL_DATA_FOR_REHYDRATION__
    var wRehydrate = window.__UNIVERSAL_DATA_FOR_REHYDRATION__;
    if (wRehydrate && wRehydrate.__DEFAULT_SCOPE__) {
      var ctx2 = wRehydrate.__DEFAULT_SCOPE__["webapp.app-context"];
      if (ctx2 && ctx2.user && ctx2.user.secUid) return ctx2.user.secUid;
    }

    // Método 3: Tag de script __UNIVERSAL_DATA_FOR_REHYDRATION__ no DOM
    var scriptEl = document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__") || document.getElementById("__$UNIVERSAL_DATA$__");
    if (scriptEl && scriptEl.textContent) {
      try {
        var parsed = JSON.parse(scriptEl.textContent);
        if (parsed && parsed.__DEFAULT_SCOPE__) {
          var ctx3 = parsed.__DEFAULT_SCOPE__["webapp.app-context"];
          if (ctx3 && ctx3.user && ctx3.user.secUid) return ctx3.user.secUid;
        }
      } catch (e) {}
    }

    // Método 4: Objeto SIGI_STATE (legado / fallback)
    if (window.SIGI_STATE) {
      var sigi = window.SIGI_STATE;
      if (sigi.AppContext && sigi.AppContext.user && sigi.AppContext.user.secUid) {
        return sigi.AppContext.user.secUid;
      }
      if (sigi.UserModule && sigi.UserModule.users) {
        var keys = Object.keys(sigi.UserModule.users);
        if (keys.length > 0 && sigi.UserModule.users[keys[0]].secUid) {
          return sigi.UserModule.users[keys[0]].secUid;
        }
      }
    }

    // Método 5: Script SIGI_STATE no DOM
    var sigiScript = document.getElementById("SIGI_STATE") || document.getElementById("sigi-persisted-data");
    if (sigiScript && sigiScript.textContent) {
      try {
        var parsedSigi = JSON.parse(sigiScript.textContent);
        if (parsedSigi.AppContext && parsedSigi.AppContext.user && parsedSigi.AppContext.user.secUid) {
          return parsedSigi.AppContext.user.secUid;
        }
      } catch (e) {}
    }

    // Método 6: Regex de segurança no HTML do documento
    var html = document.documentElement.innerHTML || "";
    var match = html.match(/"secUid"\s*:\s*"([a-zA-Z0-9_\-]{30,})"/);
    if (match && match[1]) {
      return match[1];
    }

    return null;
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
                    if (attempt < 4) setTimeout(() => sendConfig(attempt + 1), 800);
                  });
              }
              sendConfig(0);
            });
          }, 3500);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === "notifyFinished") {
    const { title, message } = request.payload || {};
    try {
      if (chrome.notifications) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: title || "TikTok All Reposted Videos Remover",
          message: message || "Operation completed successfully!",
          priority: 2,
        });
      }
    } catch (e) {
      console.warn("Notification error:", e);
    }
    sendResponse({ ok: true });
    return true;
  }

  return true;
});
