const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");

function createHarness(fetchImpl) {
  const listeners = new Map();
  const sessionStore = {};
  const hydration = { __DEFAULT_SCOPE__: { "webapp.app-context": {
    language: "pt-BR", region: "BR", csrfToken: "csrf-test", userAgent: "test-agent", wid: "device-test", user: { secUid: "sec-test" },
  } } };
  const document = {
    getElementById(id) { return id === "__UNIVERSAL_DATA_FOR_REHYDRATION__" ? { textContent: JSON.stringify(hydration) } : null; },
  };
  const window = {
    addEventListener(name, handler) { listeners.set(name, handler); },
    dispatchEvent(event) { const handler = listeners.get(event.type); if (handler) handler(event); return true; },
  };
  const chrome = {
    runtime: {
      id: "test-extension",
      getURL(path) { return "chrome-extension://test-extension/" + path; },
      onMessage: { addListener(listener) { chrome.messageListener = listener; } },
    },
    scripting: { executeScript() {} },
    storage: { session: {
      get(key, callback) { callback({ [key]: sessionStore[key] }); },
      set(values, callback) { Object.assign(sessionStore, values); if (callback) callback(); },
      remove(key, callback) { delete sessionStore[key]; if (callback) callback(); },
    } },
    tabs: {
      create() {}, get() {}, update() {}, sendMessage() { return Promise.resolve(); },
      onUpdated: { addListener() {}, removeListener() {} }, onRemoved: { addListener() {} },
    },
  };
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const context = vm.createContext({ window, document, navigator: { userAgent: "test-agent" }, URL, URLSearchParams, CustomEvent, fetch: fetchImpl, chrome, console, setTimeout, clearTimeout, AbortController });
  vm.runInContext(source, context, { filename: "background.js" });
  return { context, window, sessionStore };
}

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

async function testModernContext() {
  const harness = createHarness(async () => { throw new Error("not called"); });
  const result = vm.runInContext("getTikTokContext()", harness.context);
  assert.equal(result.secUid, "sec-test");
  assert.equal(result.csrfToken, "csrf-test");
  assert.equal(result.contextSource, "rehydration-script");
}

async function testSuccessfulRemovalRequest() {
  let captured;
  const harness = createHarness(async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 200, text: async () => JSON.stringify({ status_code: 0 }) };
  });
  vm.runInContext("setupPageRemoveListener()", harness.context);
  let result;
  harness.window.addEventListener("trr-remove-repost-result", (event) => { result = event.detail; });
  harness.window.dispatchEvent(new harness.context.CustomEvent("trr-remove-repost", { detail: { itemId: "123" } }));
  await flushPromises();
  assert.equal(result.success, true);
  const url = new URL(captured.url);
  assert.equal(url.pathname, "/tiktok/v1/upvote/delete");
  assert.equal(url.searchParams.get("item_id"), "123");
  assert.equal(captured.options.credentials, "same-origin");
  assert.equal(captured.options.headers["tt-csrf-token"], "csrf-test");
}

async function testRateLimitAndCancellation() {
  const limited = createHarness(async () => ({ ok: false, status: 429, text: async () => "" }));
  vm.runInContext("setupPageRemoveListener()", limited.context);
  let result;
  limited.window.addEventListener("trr-remove-repost-result", (event) => { result = event.detail; });
  limited.window.dispatchEvent(new limited.context.CustomEvent("trr-remove-repost", { detail: { itemId: "456" } }));
  await flushPromises();
  assert.equal(result.errorCode, "RATE_LIMITED");

  const cancellable = createHarness((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => { const error = new Error("aborted"); error.name = "AbortError"; reject(error); });
  }));
  vm.runInContext("setupPageRemoveListener()", cancellable.context);
  cancellable.window.addEventListener("trr-remove-repost-result", (event) => { result = event.detail; });
  cancellable.window.dispatchEvent(new cancellable.context.CustomEvent("trr-remove-repost", { detail: { itemId: "789" } }));
  cancellable.window.dispatchEvent(new cancellable.context.CustomEvent("trr-cancel-remove"));
  await flushPromises();
  assert.equal(result.errorCode, "CANCELLED");
}

async function testActiveJobStorageAndExpiry() {
  const harness = createHarness(async () => { throw new Error("not called"); });
  await new Promise((resolve) => harness.context.setStoredActiveJob({ tabId: 42, startedAt: 1 }, resolve));
  const stored = await new Promise((resolve) => harness.context.getStoredActiveJob(resolve));
  assert.equal(stored.tabId, 42);
  const hour = 60 * 60 * 1000;
  assert.equal(harness.context.isActiveJobStale({ tabId: 42, startedAt: hour }, 12 * hour), false);
  assert.equal(harness.context.isActiveJobStale({ tabId: 42, startedAt: hour }, 14 * hour), true);
}

async function testMessageSenderValidation() {
  const harness = createHarness(async () => { throw new Error("not called"); });
  const chrome = harness.context.chrome;
  let injections = 0;
  let tabsCreated = 0;
  chrome.scripting.executeScript = () => { injections++; };
  chrome.tabs.create = () => { tabsCreated++; };
  const content = { id: chrome.runtime.id, tab: { id: 42 }, frameId: 0, url: "https://www.tiktok.com/@example" };
  const popup = { id: chrome.runtime.id, url: chrome.runtime.getURL("popup.html") };
  const send = (action, sender) => chrome.messageListener({ action }, sender, () => {});

  assert.equal(send("getRepostContext", { ...content, id: "other-extension" }), false);
  assert.equal(send("getRepostContext", { ...content, url: "https://www.tiktok.com.evil.example/" }), false);
  assert.equal(send("getRepostContext", { ...content, url: "http://www.tiktok.com/" }), false);
  assert.equal(send("getRepostContext", { ...content, frameId: 1 }), false);
  assert.equal(send("startRemovingReposts", content), false);
  assert.equal(send("startRemovingReposts", { ...popup, url: chrome.runtime.getURL("other.html") }), false);
  assert.equal(injections, 0);
  assert.equal(tabsCreated, 0);

  assert.equal(send("getRepostContext", content), true);
  assert.equal(injections, 1);
  assert.equal(send("startRemovingReposts", popup), true);
  assert.equal(tabsCreated, 1);
}

(async () => {
  await testMessageSenderValidation();
  await testModernContext();
  await testSuccessfulRemovalRequest();
  await testRateLimitAndCancellation();
  await testActiveJobStorageAndExpiry();
  console.log("background tests: ok");
})().catch((error) => { console.error(error); process.exitCode = 1; });
