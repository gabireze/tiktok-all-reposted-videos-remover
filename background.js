function getUserInfoInPage() {
  try {
    var result = { secUid: null, uniqueId: null };

    function checkUser(u) {
      if (!u) return;
      if (!result.secUid && u.secUid) result.secUid = String(u.secUid);
      if (!result.uniqueId) {
        var un = u.uniqueId || u.unique_id || u.uniqueID || u.handle;
        if (un && typeof un === "string" && un.trim()) {
          result.uniqueId = un.trim().replace(/^@/, "");
        }
      }
    }

    // 1. Objeto __$UNIVERSAL_DATA$__
    var w = window.__$UNIVERSAL_DATA$__;
    if (w && w.__DEFAULT_SCOPE__) {
      var scope = w.__DEFAULT_SCOPE__;
      if (scope["webapp.app-context"] && scope["webapp.app-context"].user) checkUser(scope["webapp.app-context"].user);
      if (scope["webapp.user-detail"] && scope["webapp.user-detail"].userInfo && scope["webapp.user-detail"].userInfo.user) checkUser(scope["webapp.user-detail"].userInfo.user);
      if (scope["webapp.user-detail"] && scope["webapp.user-detail"].user) checkUser(scope["webapp.user-detail"].user);
    }

    // 2. Objeto __UNIVERSAL_DATA_FOR_REHYDRATION__
    var wRehydrate = window.__UNIVERSAL_DATA_FOR_REHYDRATION__;
    if (wRehydrate && wRehydrate.__DEFAULT_SCOPE__) {
      var scope2 = wRehydrate.__DEFAULT_SCOPE__;
      if (scope2["webapp.app-context"] && scope2["webapp.app-context"].user) checkUser(scope2["webapp.app-context"].user);
      if (scope2["webapp.user-detail"] && scope2["webapp.user-detail"].userInfo && scope2["webapp.user-detail"].userInfo.user) checkUser(scope2["webapp.user-detail"].userInfo.user);
      if (scope2["webapp.user-detail"] && scope2["webapp.user-detail"].user) checkUser(scope2["webapp.user-detail"].user);
    }

    // 3. Tag <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"> o <script id="__$UNIVERSAL_DATA$__">
    var scriptEl = document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__") || document.getElementById("__$UNIVERSAL_DATA$__");
    if (scriptEl && scriptEl.textContent) {
      try {
        var parsed = JSON.parse(scriptEl.textContent);
        if (parsed && parsed.__DEFAULT_SCOPE__) {
          var scope3 = parsed.__DEFAULT_SCOPE__;
          if (scope3["webapp.app-context"] && scope3["webapp.app-context"].user) checkUser(scope3["webapp.app-context"].user);
          if (scope3["webapp.user-detail"] && scope3["webapp.user-detail"].userInfo && scope3["webapp.user-detail"].userInfo.user) checkUser(scope3["webapp.user-detail"].userInfo.user);
        }
      } catch (e) {}
    }

    // 4. SIGI_STATE
    if (window.SIGI_STATE) {
      var sigi = window.SIGI_STATE;
      if (sigi.AppContext && sigi.AppContext.user) checkUser(sigi.AppContext.user);
      if (sigi.UserModule && sigi.UserModule.users) {
        var keys = Object.keys(sigi.UserModule.users);
        for (var i = 0; i < keys.length; i++) {
          checkUser(sigi.UserModule.users[keys[i]]);
        }
      }
    }

    // 5. Script SIGI_STATE en DOM
    var sigiScript = document.getElementById("SIGI_STATE") || document.getElementById("sigi-persisted-data");
    if (sigiScript && sigiScript.textContent) {
      try {
        var parsedSigi = JSON.parse(sigiScript.textContent);
        if (parsedSigi.AppContext && parsedSigi.AppContext.user) checkUser(parsedSigi.AppContext.user);
      } catch (e) {}
    }

    // 6. DOM: Enlaces al perfil en el header o avatar
    if (!result.uniqueId) {
      var profileLinks = Array.from(document.querySelectorAll('a[href*="/@"]'));
      for (var p = 0; p < profileLinks.length; p++) {
        var href = profileLinks[p].getAttribute("href") || "";
        var m = href.match(/\/@([a-zA-Z0-9_\.\-]+)/);
        if (m && m[1] && m[1].toLowerCase() !== "tiktok" && !href.includes("/video/")) {
          if (
            profileLinks[p].closest("header") ||
            profileLinks[p].querySelector("img") ||
            profileLinks[p].getAttribute("data-e2e")?.includes("profile")
          ) {
            result.uniqueId = m[1];
            break;
          }
        }
      }
    }

    // 7. Si la URL actual ya es un perfil /@usuario
    if (!result.uniqueId && window.location.pathname.startsWith("/@")) {
      var mPath = window.location.pathname.match(/^\/@([a-zA-Z0-9_\.\-]+)/);
      if (mPath && mPath[1]) {
        result.uniqueId = mPath[1];
      }
    }

    // 8. Regex fallback en HTML completo
    var html = document.documentElement.innerHTML || "";
    if (!result.secUid) {
      var matchSec = html.match(/"secUid"\s*:\s*"([a-zA-Z0-9_\-]{30,})"/);
      if (matchSec && matchSec[1]) result.secUid = matchSec[1];
    }
    if (!result.uniqueId) {
      var matchUniq = html.match(/"uniqueId"\s*:\s*"([a-zA-Z0-9_\.\-]{2,30})"/);
      if (matchUniq && matchUniq[1]) result.uniqueId = matchUniq[1];
    }

    return result;
  } catch (e) {
    return { secUid: null, uniqueId: null };
  }
}

function getSecUidInPage() {
  var info = getUserInfoInPage();
  return info.secUid || null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getUserInfo") {
    var tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse({ userInfo: { secUid: null, uniqueId: null } });
      return true;
    }
    chrome.scripting.executeScript(
      { target: { tabId }, world: "MAIN", func: getUserInfoInPage },
      function (results) {
        var info = (results && results[0] && results[0].result) || { secUid: null, uniqueId: null };
        if (info.uniqueId) {
          chrome.storage.local.set({ tiktok_username: info.uniqueId });
        }
        sendResponse({ userInfo: info });
      }
    );
    return true;
  }

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

  if (request.action === "removeItemInMainWorld") {
    var tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse({ ok: false, error: "No tab ID" });
      return true;
    }

    var payload = request.payload || {};
    var targetType = payload.targetType || "reposts";
    var itemId = payload.itemId;

    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        world: "MAIN",
        args: [targetType, itemId],
        func: async function (targetTypeArg, itemIdArg) {
          try {
            function getCookie(name) {
              var matches = document.cookie.match(
                new RegExp(
                  "(?:^|; )" +
                    name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") +
                    "=([^;]*)"
                )
              );
              return matches ? decodeURIComponent(matches[1]) : "";
            }

            var csrfToken =
              getCookie("csrf_session_id") ||
              getCookie("tt_csrf_token") ||
              getCookie("passport_csrf_token") ||
              getCookie("s_v_web_id") ||
              "";

            var endpoint = "";
            var postBody = "";
            var headers = {
              "content-type": "application/x-www-form-urlencoded",
              "accept": "*/*",
              "x-secsdk-csrf-token": csrfToken,
            };

            var clientParams = new URLSearchParams({
              aid: "1988",
              app_name: "tiktok_web",
              device_platform: "web_pc",
              channel: "tiktok_web",
              screen_width: String(window.screen.width || 1920),
              screen_height: String(window.screen.height || 1080),
              browser_language: navigator.language || "es-ES",
              browser_platform: navigator.platform || "Win32",
              browser_name: "Mozilla",
              browser_version: navigator.userAgent || "",
            });

            var msToken = getCookie("msToken");
            if (msToken) clientParams.append("msToken", msToken);

            if (targetTypeArg === "likes") {
              endpoint = "https://www.tiktok.com/api/commit/item/digg/?" + clientParams.toString();
              var bParams = new URLSearchParams({
                aweme_id: itemIdArg,
                type: "0",
                channel_id: "0",
              });
              if (csrfToken) bParams.append("tt_csrf_token", csrfToken);
              postBody = bParams.toString();
            } else if (targetTypeArg === "favorites") {
              endpoint = "https://www.tiktok.com/api/item/collect/?" + clientParams.toString();
              var bParams2 = new URLSearchParams({
                item_id: itemIdArg,
                action: "0",
              });
              if (csrfToken) bParams2.append("tt_csrf_token", csrfToken);
              postBody = bParams2.toString();
            } else {
              // Compartidos (Reposts / Upvotes) - Batería exhaustiva de protocolos TikTok
              var endpointsToTry = [
                {
                  url: "https://www.tiktok.com/tiktok/v1/upvote/delete/?" + clientParams.toString(),
                  headers: { "content-type": "application/x-www-form-urlencoded", "accept": "*/*", "x-secsdk-csrf-token": csrfToken },
                  body: (function() {
                    var p = new URLSearchParams({ item_id: itemIdArg, aweme_id: itemIdArg, upvote_reason_type: "0" });
                    if (csrfToken) p.append("tt_csrf_token", csrfToken);
                    return p.toString();
                  })(),
                },
                {
                  url: "https://www.tiktok.com/tiktok/v1/upvote/delete/?" + clientParams.toString(),
                  headers: { "content-type": "application/json", "accept": "application/json, text/plain, */*", "x-secsdk-csrf-token": csrfToken },
                  body: JSON.stringify({ item_id: itemIdArg, aweme_id: itemIdArg, upvote_reason_type: 0 }),
                },
                {
                  url: "https://www.tiktok.com/api/commit/item/upvote/?" + clientParams.toString(),
                  headers: { "content-type": "application/x-www-form-urlencoded", "accept": "*/*", "x-secsdk-csrf-token": csrfToken },
                  body: (function() {
                    var p = new URLSearchParams({ item_id: itemIdArg, aweme_id: itemIdArg, action_type: "2", upvote_reason_type: "0" });
                    if (csrfToken) p.append("tt_csrf_token", csrfToken);
                    return p.toString();
                  })(),
                },
                {
                  url: "https://www.tiktok.com/api/repost/delete/?" + clientParams.toString(),
                  headers: { "content-type": "application/x-www-form-urlencoded", "accept": "*/*", "x-secsdk-csrf-token": csrfToken },
                  body: (function() {
                    var p = new URLSearchParams({ item_id: itemIdArg, aweme_id: itemIdArg });
                    if (csrfToken) p.append("tt_csrf_token", csrfToken);
                    return p.toString();
                  })(),
                },
                {
                  url: "https://www.tiktok.com/api/item/upvote/delete/?" + clientParams.toString(),
                  headers: { "content-type": "application/x-www-form-urlencoded", "accept": "*/*", "x-secsdk-csrf-token": csrfToken },
                  body: (function() {
                    var p = new URLSearchParams({ item_id: itemIdArg, aweme_id: itemIdArg, action_type: "2" });
                    if (csrfToken) p.append("tt_csrf_token", csrfToken);
                    return p.toString();
                  })(),
                }
              ];

              var lastRes = null;
              var lastJson = null;
              var lastText = "";

              for (var i = 0; i < endpointsToTry.length; i++) {
                var strat = endpointsToTry[i];
                try {
                  var resAttempt = await window.fetch(strat.url, {
                    method: "POST",
                    headers: strat.headers,
                    credentials: "include",
                    body: strat.body,
                  });

                  var textAttempt = await resAttempt.text();
                  var jsonAttempt = null;
                  try { jsonAttempt = JSON.parse(textAttempt); } catch (e) {}

                  console.log("[TikTok Cleaner] Intento " + (i + 1) + " Repost " + itemIdArg + ":", resAttempt.status, textAttempt.slice(0, 120));

                  var isOk = jsonAttempt && (
                    jsonAttempt.status_code === 0 ||
                    jsonAttempt.status_code === 200 ||
                    jsonAttempt.statusCode === 0 ||
                    jsonAttempt.statusCode === 200 ||
                    jsonAttempt.status_msg === "ok" ||
                    jsonAttempt.message === "success"
                  );

                  if (isOk) {
                    return {
                      ok: true,
                      status: resAttempt.status,
                      json: jsonAttempt,
                      text: textAttempt.slice(0, 150),
                    };
                  }

                  lastRes = resAttempt;
                  lastJson = jsonAttempt;
                  lastText = textAttempt;
                } catch (e) {
                  console.warn("[TikTok Cleaner] Error en intento " + (i + 1) + ":", e);
                }
              }

              return {
                ok: lastRes ? lastRes.ok : false,
                status: lastRes ? lastRes.status : 0,
                json: lastJson,
                text: (lastText || "").slice(0, 150),
              };
            }

            var res = await window.fetch(endpoint, {
              method: "POST",
              headers: headers,
              credentials: "include",
              body: postBody,
            });

            var text = await res.text();
            var json = null;
            try { json = JSON.parse(text); } catch (e) {}

            return {
              ok: res.ok,
              status: res.status,
              json: json,
              text: text ? text.slice(0, 150) : "",
            };
          } catch (e) {
            return {
              ok: false,
              status: 0,
              error: e.message || String(e),
            };
          }
        },
      },
      function (results) {
        var res = results && results[0] && results[0].result;
        sendResponse(res || { ok: false, error: "No response from MAIN world execution" });
      }
    );
    return true;
  }

  if (request.action === "startRemovingReposts") {
    const config = request.payload?.config || {};

    function sendConfigToTab(tabId, attempt) {
      attempt = attempt || 0;
      const payload = { ...config, notLoggedInRedirect: false };
      chrome.tabs.sendMessage(tabId, { action: "startRemovingReposts", config: payload })
        .catch((e) => {
          if (attempt < 5) {
            setTimeout(() => sendConfigToTab(tabId, attempt + 1), 700);
          }
        });
    }

    function navigateToProfileAndStart(tabId, username) {
      const targetUrl = `https://www.tiktok.com/@${username}`;
      chrome.tabs.get(tabId, (tab) => {
        if (!tab) return;
        const currentUrl = tab.url || "";
        const isAlreadyOnUserProfile = new RegExp(`tiktok\\.com/@${username}(\\?|/|$)`, "i").test(currentUrl);

        if (isAlreadyOnUserProfile) {
          setTimeout(() => sendConfigToTab(tabId, 0), 500);
        } else {
          let updatedDone = false;
          const navListener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === "complete" && !updatedDone) {
              updatedDone = true;
              chrome.tabs.onUpdated.removeListener(navListener);
              setTimeout(() => sendConfigToTab(tabId, 0), 1800);
            }
          };
          chrome.tabs.onUpdated.addListener(navListener);
          chrome.tabs.update(tabId, { url: targetUrl, active: true });
        }
      });
    }

    function inspectAndStartTab(tabId) {
      chrome.scripting.executeScript(
        { target: { tabId }, world: "MAIN", func: getUserInfoInPage },
        (results) => {
          const userInfo = (results && results[0] && results[0].result) || {};
          const detectedUser = userInfo.uniqueId;

          if (detectedUser) {
            chrome.storage.local.set({ tiktok_username: detectedUser });
            navigateToProfileAndStart(tabId, detectedUser);
          } else {
            chrome.storage.local.get(["tiktok_username"], (stored) => {
              const savedUser = stored?.tiktok_username;
              if (savedUser) {
                navigateToProfileAndStart(tabId, savedUser);
              } else {
                sendConfigToTab(tabId, 0);
              }
            });
          }
        }
      );
    }

    chrome.storage.local.get(["tiktok_username"], (stored) => {
      const cachedUsername = stored?.tiktok_username;

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs && tabs[0];
        const isAlreadyOnTiktok = activeTab && activeTab.url && activeTab.url.includes("tiktok.com");

        if (isAlreadyOnTiktok) {
          inspectAndStartTab(activeTab.id);
        } else {
          // Si no está en TikTok, abrir directamente @usuario si está guardado, o la home de tiktok
          const startUrl = cachedUsername
            ? `https://www.tiktok.com/@${cachedUsername}`
            : `https://www.tiktok.com/`;

          chrome.tabs.create({ url: startUrl, active: true }, (newTab) => {
            const tabId = newTab.id;
            let tabDone = false;
            const listener = (id, info) => {
              if (id === tabId && info.status === "complete" && !tabDone) {
                tabDone = true;
                chrome.tabs.onUpdated.removeListener(listener);
                setTimeout(() => {
                  inspectAndStartTab(tabId);
                }, 2000);
              }
            };
            chrome.tabs.onUpdated.addListener(listener);
          });
        }
      });
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
          title: title || "TikTok Cleaner",
          message: message || "Operación completada con éxito.",
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
