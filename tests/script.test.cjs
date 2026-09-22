const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const original = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
const source = original.replace(
  /\}\)\(\);\s*$/,
  "globalThis.__test = { parseKeywords, matchesKeywords, getRepostItems, openRepostsTab, updatePanel, collectAllRepostItems, buildReport, sanitizeCsvCell }; })();"
);

function loadWithFetch(fetchImpl, documentImpl = { querySelector() { return null; } }) {
  const context = vm.createContext({
    chrome: { runtime: { sendMessage() {}, onMessage: { addListener() {} }, getManifest() { return { version: "test" }; } } },
    fetch: fetchImpl,
    URLSearchParams,
    CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    window: { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} },
    console,
    setTimeout,
    clearTimeout,
    Promise,
    document: documentImpl,
  });
  vm.runInContext(source, context, { filename: "script.js" });
  return context.__test;
}

async function testRepostTabSelection() {
  let selected = false;
  let clicks = 0;
  const repostTab = {
    getAttribute(name) { return name === "aria-selected" ? String(selected) : null; },
    click() { clicks += 1; selected = true; },
  };
  const api = loadWithFetch(async () => { throw new Error("not called"); }, {
    querySelector(selector) { return selector === '[data-e2e="repost-tab"]' ? repostTab : null; },
  });
  const result = await api.openRepostsTab(1000);
  assert.deepEqual({ found: result.found, selected: result.selected }, { found: true, selected: true });
  assert.equal(clicks, 1);
}

async function testFinishedPanelHidesRunControls() {
  const api = loadWithFetch(async () => { throw new Error("not called"); });
  const elements = {
    "#trr-status": { textContent: "" },
    "#trr-stats": { textContent: "" },
    "#trr-pause-btn": { textContent: "", disabled: false, hidden: false, classList: { toggle() {} } },
    "#trr-confirm-btn": { textContent: "", disabled: false, hidden: true },
    "#trr-stop-btn": { textContent: "", disabled: false, hidden: false },
    "#trr-download-btn": { textContent: "", disabled: true },
  };
  const panel = { querySelector(selector) { return elements[selector] || null; } };
  api.updatePanel(panel, { status: "Done", pages: 1, failed: 0, totalListed: 8, matched: 8, paused: false, finished: true, cancelled: false, reportReady: true }, {});
  assert.equal(elements["#trr-pause-btn"].hidden, true);
  assert.equal(elements["#trr-stop-btn"].hidden, true);
  assert.equal(elements["#trr-download-btn"].disabled, false);
}

async function testListingAndAllPageCollection() {
  const events = [];
  const api = loadWithFetch(async (url) => {
    const cursor = new URL(url).searchParams.get("cursor");
    events.push(`fetch:${cursor}`);
    const first = cursor === "0";
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status_code: 0,
        hasMore: first,
        cursor: first ? "30" : "60",
        itemList: first
          ? [{ id: "1", desc: "one", author: { uniqueId: "a" } }, { id: "2", desc: "two", author: { uniqueId: "b" } }]
          : [{ id: "2", desc: "duplicate", author: { uniqueId: "b" } }, { id: "3", desc: "three", author: { uniqueId: "c" } }],
      }),
    };
  });
  const result = await api.collectAllRepostItems("sec-test", {
    pagePauseMs: 0,
    diagnostics: [],
    async onPage({ page }) { events.push(`process:${page}`); },
  });
  assert.deepEqual(Array.from(result.items, (item) => item.id), ["1", "2", "3"]);
  assert.equal(result.pages, 2);
  assert.deepEqual(events, ["fetch:0", "process:1", "fetch:30", "process:2"]);
}

async function testListingErrorsStayErrors() {
  const api = loadWithFetch(async () => ({ ok: false, status: 429, text: async () => "" }));
  await assert.rejects(api.getRepostItems("0", "sec-test"), (error) => error.code === "RATE_LIMITED" && error.httpStatus === 429);
}

async function testCsvFormulaProtectionAndSingleStatus() {
  const api = loadWithFetch(async () => { throw new Error("not called"); });
  const item = { id: "1", authorName: "@a", desc: "=SUM(A1:A2)", url: "https://example.test/1" };
  const csv = api.buildReport({
    reportScannedItems: [item], reportItems: [item], reportFailedItems: [], reportVerifiedItems: [item], reportStillPresentItems: [], diagnostics: {}, totalListed: 1,
  }, { dryRun: false }, "csv");
  assert.match(csv, /"'=SUM\(A1:A2\)"/);
  assert.equal((csv.match(/verified_removed/g) || []).length, 1);
}

(async () => {
  await testRepostTabSelection();
  await testFinishedPanelHidesRunControls();
  await testListingAndAllPageCollection();
  await testListingErrorsStayErrors();
  await testCsvFormulaProtectionAndSingleStatus();
  console.log("script tests: ok");
})().catch((error) => { console.error(error); process.exitCode = 1; });
