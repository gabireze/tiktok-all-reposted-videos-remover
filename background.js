let activeJobTabId = null;
const ACTIVE_JOB_KEY = "trrActiveJob";
const ACTIVE_JOB_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function getTikTokContext() {
  try {
    var data = window.__$UNIVERSAL_DATA$__ || null;
    var contextSource = "legacy-global";
    if (!data || !data.__DEFAULT_SCOPE__) {
      var hydration = document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__");
      if (hydration && hydration.textContent) {
        data = JSON.parse(hydration.textContent);
        contextSource = "rehydration-script";
      }
    }
    if (!data || !data.__DEFAULT_SCOPE__) return null;
    var ctx = data.__DEFAULT_SCOPE__["webapp.app-context"];
    if (!ctx || !ctx.user) return null;
    return {
      secUid: ctx.user.secUid || null,
      csrfToken: ctx.csrfToken || null,
      userAgent: ctx.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : ""),
      odinId: ctx.odinId || "",
      deviceId: ctx.wid || ctx.encryptedWebid || "",
      region: ctx.region || "",
      language: ctx.language || "",
      contextSource: contextSource,
    };
  } catch (e) {
    return null;
  }
}

function setupPageRemoveListener() {
  if (window.__trrPageRemoveReady) return;
  window.__trrPageRemoveReady = true;
  window.addEventListener("trr-cancel-remove", function () {
    if (window.__trrRemoveController) window.__trrRemoveController.abort();
  });
  window.addEventListener("trr-remove-repost", function (event) {
    var itemId = event.detail && event.detail.itemId;
    if (!itemId) {
      window.dispatchEvent(new CustomEvent("trr-remove-repost-result", { detail: { itemId: "", success: false, error: "no itemId", errorCode: "INVALID_ITEM" } }));
      return;
    }
    var csrfToken = "";
    try {
      var data = window.__$UNIVERSAL_DATA$__ || null;
      if (!data || !data.__DEFAULT_SCOPE__) {
        var hydration = document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__");
        if (hydration && hydration.textContent) data = JSON.parse(hydration.textContent);
      }
      var ctx = data && data.__DEFAULT_SCOPE__ && data.__DEFAULT_SCOPE__["webapp.app-context"];
      csrfToken = ctx && ctx.csrfToken || "";
    } catch (e) {}

    var params = new URLSearchParams({ aid: "1988", item_id: String(itemId) });
    var controller = new AbortController();
    window.__trrRemoveController = controller;
    var headers = { accept: "*/*", "content-type": "application/x-www-form-urlencoded" };
    if (csrfToken) headers["tt-csrf-token"] = csrfToken;
    fetch("https://www.tiktok.com/tiktok/v1/upvote/delete?" + params.toString(), {
      method: "POST",
      headers: headers,
      credentials: "same-origin",
      signal: controller.signal,
      body: "",
    })
      .then(function (res) { return res.text().then(function (raw) { return { res: res, raw: raw }; }); })
      .then(function (result) {
        var res = result.res;
        var raw = result.raw;
        if (!res.ok) {
          window.dispatchEvent(new CustomEvent("trr-remove-repost-result", { detail: {
            itemId: itemId,
            success: false,
            error: "HTTP " + res.status,
            errorCode: res.status === 429 ? "RATE_LIMITED" : (res.status === 401 || res.status === 403 ? "SESSION_REJECTED" : "HTTP_ERROR"),
            httpStatus: res.status,
          } }));
          return;
        }
        if (!raw || !raw.trim()) {
          window.dispatchEvent(new CustomEvent("trr-remove-repost-result", { detail: { itemId: itemId, success: true, httpStatus: res.status } }));
          return;
        }
        var json;
        try { json = JSON.parse(raw); } catch (e) {
          window.dispatchEvent(new CustomEvent("trr-remove-repost-result", { detail: { itemId: itemId, success: false, error: "Invalid JSON", errorCode: "INVALID_JSON", httpStatus: res.status } }));
          return;
        }
        if (json.status_code !== 0) {
          window.dispatchEvent(new CustomEvent("trr-remove-repost-result", { detail: { itemId: itemId, success: false, error: JSON.stringify(json), errorCode: "TIKTOK_REJECTED", httpStatus: res.status } }));
          return;
        }
        window.dispatchEvent(new CustomEvent("trr-remove-repost-result", { detail: { itemId: itemId, success: true, httpStatus: res.status } }));
      })
      .catch(function (error) {
        var cancelled = error && error.name === "AbortError";
        window.dispatchEvent(new CustomEvent("trr-remove-repost-result", { detail: {
          itemId: itemId,
          success: false,
          error: String(error && error.message),
          errorCode: cancelled ? "CANCELLED" : "NETWORK_ERROR",
        } }));
      })
      .finally(function () {
        if (window.__trrRemoveController === controller) window.__trrRemoveController = null;
      });
  });
}

function getStoredActiveJob(callback) {
  if (!chrome.storage || !chrome.storage.session) {
    callback(activeJobTabId == null ? null : { tabId: activeJobTabId });
    return;
  }
  chrome.storage.session.get(ACTIVE_JOB_KEY, (data) => callback(data && data[ACTIVE_JOB_KEY] || null));
}

function setStoredActiveJob(job, callback) {
  activeJobTabId = job && job.tabId != null ? job.tabId : null;
  if (!chrome.storage || !chrome.storage.session) {
    if (callback) callback();
    return;
  }
  if (job) chrome.storage.session.set({ [ACTIVE_JOB_KEY]: job }, callback);
  else chrome.storage.session.remove(ACTIVE_JOB_KEY, callback);
}

function clearStoredActiveJob(tabId, callback) {
  getStoredActiveJob((job) => {
    if (!job || tabId == null || job.tabId === tabId) setStoredActiveJob(null, callback);
    else if (callback) callback();
  });
}

function isActiveJobStale(job, now = Date.now()) {
  return !job || !job.startedAt || now - job.startedAt > ACTIVE_JOB_MAX_AGE_MS;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.tab && sender.origin !== "https://www.tiktok.com") {
    return false;
  }

  if (request.action === "runFinished") {
    clearStoredActiveJob(sender.tab && sender.tab.id, () => sendResponse({ ok: true }));
    return true;
  }

  if (request.action === "getRepostContext") {
    const tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse({ secUid: null, csrfToken: null, userAgent: "", odinId: "" });
      return true;
    }
    chrome.scripting.executeScript(
      { target: { tabId }, world: "MAIN", func: getTikTokContext },
      function (results) {
        const ctx = (results && results[0] && results[0].result) || null;
        sendResponse({
          secUid: ctx ? ctx.secUid : null,
          csrfToken: ctx ? ctx.csrfToken : null,
          userAgent: ctx ? ctx.userAgent : "",
          odinId: ctx ? ctx.odinId : "",
          deviceId: ctx ? ctx.deviceId : "",
          region: ctx ? ctx.region : "",
          language: ctx ? ctx.language : "",
          contextSource: ctx ? ctx.contextSource : "",
        });
      }
    );
    return true;
  }

  if (request.action === "injectPageRemoveListener") {
    const tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse({ ok: false, error: "no tab" });
      return true;
    }
    chrome.scripting.executeScript(
      { target: { tabId }, world: "MAIN", func: setupPageRemoveListener },
      function () {
        sendResponse(chrome.runtime.lastError ? { ok: false, error: String(chrome.runtime.lastError) } : { ok: true });
      }
    );
    return true;
  }

  if (request.action === "startRemovingReposts") {
    const config = request.config || request.payload?.config || {};
    const startNewJob = () => {
      chrome.tabs.create({ url: "https://www.tiktok.com/profile", active: true }, (tab) => {
        const tabId = tab && tab.id;
        if (tabId == null) {
          sendResponse({ ok: false, error: "tab_create_failed" });
          return;
        }
        setStoredActiveJob({ tabId, startedAt: Date.now(), dryRun: !!config.dryRun }, () => {
          const listener = (id, info) => {
            if (id === tabId && info.status === "complete") {
              chrome.tabs.onUpdated.removeListener(listener);
              setTimeout(() => {
                chrome.tabs.get(tabId, (tabInfo) => {
                  const url = (tabInfo && tabInfo.url) || "";
                  const notLoggedInRedirect = /\/foryou(\?|$)/i.test(url) || /\/login(\?|$|\/)/i.test(url);
                  const payload = { ...config, notLoggedInRedirect };
                  function sendConfig(attempt) {
                    chrome.tabs.sendMessage(tabId, { action: "startRemovingReposts", config: payload })
                      .catch(() => {
                        if (attempt < 3) setTimeout(() => sendConfig(attempt + 1), 800);
                        else clearStoredActiveJob(tabId);
                      });
                  }
                  sendConfig(0);
                });
              }, 4000);
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
          sendResponse({ ok: true, tabId });
        });
      });
    };

    getStoredActiveJob((job) => {
      if (!job || job.tabId == null) {
        startNewJob();
        return;
      }
      if (isActiveJobStale(job)) {
        clearStoredActiveJob(job.tabId, startNewJob);
        return;
      }
      chrome.tabs.get(job.tabId, (existingTab) => {
        if (chrome.runtime.lastError || !existingTab) {
          clearStoredActiveJob(job.tabId, startNewJob);
          return;
        }
        activeJobTabId = job.tabId;
        chrome.tabs.update(job.tabId, { active: true });
        sendResponse({ ok: false, error: "already_running", tabId: job.tabId });
      });
    });
    return true;
  }
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearStoredActiveJob(tabId);
});
