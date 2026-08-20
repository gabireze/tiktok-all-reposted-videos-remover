// Mapeamento de países para códigos de moeda do PayPal
const COUNTRY_CURRENCY_MAP = {
  US: "USD", CA: "CAD", GB: "GBP", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  AU: "AUD", JP: "JPY", BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  UY: "UYU", PY: "PYG", BOB: "BOB", EC: "USD", VE: "VES", CR: "CRC", PA: "PAB", GT: "GTQ",
  HN: "HNL", SV: "USD", NI: "NIO", DO: "DOP", CU: "CUP", CH: "CHF", NO: "NOK", SE: "SEK",
  DK: "DKK", FI: "EUR", IE: "EUR", AT: "EUR", BE: "EUR", PT: "EUR", PL: "PLN", CZ: "CZK"
};

function detectUserCountry() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneCountryMap = {
      "America/Sao_Paulo": "BR", "America/Argentina/Buenos_Aires": "AR", "America/Santiago": "CL",
      "America/Bogota": "CO", "America/Lima": "PE", "America/Montevideo": "UY", "America/Asuncion": "PY",
      "America/La_Paz": "BO", "America/Guayaquil": "EC", "America/Caracas": "VE", "America/Costa_Rica": "CR",
      "America/Panama": "PA", "America/Guatemala": "GT", "America/Mexico_City": "MX", "Europe/Madrid": "ES",
      "America/New_York": "US", "America/Chicago": "US", "America/Los_Angeles": "US"
    };
    if (timezoneCountryMap[timezone]) return timezoneCountryMap[timezone];
  } catch (e) {}
  return "US";
}

function openDonation() {
  const countryCode = detectUserCountry();
  const currencyCode = COUNTRY_CURRENCY_MAP[countryCode] || "USD";
  const donationUrl = `https://www.paypal.com/donate/?cmd=_donations&business=S34UMJ23659VY&currency_code=${currencyCode}`;
  chrome.tabs.create({ url: donationUrl });
}

async function checkTiktokLogin() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: "tiktok.com" });
    const hasMultiSids = cookies.some((c) => c.name === "multi_sids" || c.name === "sessionid" || c.name === "sessionid_ss");
    const hasLivingUserId = cookies.some((c) => c.name === "living_user_id" || c.name === "uid_tt");
    return !!(hasMultiSids || hasLivingUserId || cookies.length > 5);
  } catch (e) {
    return false;
  }
}

const I18N_KEYS_PANEL = [
  "panelTitle", "statusPreparing", "statusPaused", "statusResuming", "btnPause", "btnResume",
  "btnDownloadReport", "statusWaiting", "statusListing", "statusPageRemoving", "statusDone",
  "statusNone", "statusErrorNoAccount", "statusErrorRedirectedForyou", "statusErrorRemove", "panelClose",
  "panelMinimize", "panelExpand", "statsPages", "statsRemoved", "statsListed", "statsSkipped", "statsFailed",
  "statsEta", "statusCooldown", "statusLimitReached", "statusStoppedFailures", "statusBetweenPages",
  "dryRunBadge", "statusDryRunListing", "statusDryRunDone", "notificationFinished", "notificationLimit"
];

let currentTargetType = "reposts";

function applyI18n() {
  const i18n = typeof chrome !== "undefined" && chrome.i18n ? chrome.i18n : null;
  const getMsg = (key) => (i18n ? i18n.getMessage(key) : "") || "";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const message = getMsg(key);
    if (message) element.innerHTML = message;
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const key = element.getAttribute("data-i18n-title");
    const message = getMsg(key);
    if (message) element.title = message;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    const message = getMsg(key);
    if (message) element.placeholder = message;
  });
  document.querySelectorAll("option[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const message = getMsg(key);
    if (message) element.textContent = message;
  });

  updateStartButtonLabel();
}

function updateStartButtonLabel() {
  const startButton = document.getElementById("startButton");
  if (!startButton) return;
  const i18n = typeof chrome !== "undefined" && chrome.i18n ? chrome.i18n : null;
  const getMsg = (key) => (i18n ? i18n.getMessage(key) : "") || "";

  let key = "btnStartReposts";
  if (currentTargetType === "likes") key = "btnStartLikes";
  else if (currentTargetType === "favorites") key = "btnStartFavorites";

  startButton.textContent = getMsg(key) || getMsg("startButton") || "Start Cleaning";
}

function getPanelI18n() {
  const i18n = typeof chrome !== "undefined" && chrome.i18n ? chrome.i18n : null;
  const o = {};
  I18N_KEYS_PANEL.forEach((key) => {
    o[key] = (i18n && i18n.getMessage(key)) || key;
  });
  return o;
}

function getConfig() {
  const activePill = document.querySelector(".popup-target-pill.is-active");
  const targetType = (activePill && activePill.getAttribute("data-target")) || currentTargetType || "reposts";

  const dryRun = document.getElementById("dryRun")?.checked || false;
  const useKeywords = document.getElementById("useKeywords")?.checked || false;
  const keywordsInput = document.getElementById("keywordsInput");
  const keywordsFilter = useKeywords ? (keywordsInput.value || "").trim() : "";

  const useCreators = document.getElementById("useCreators")?.checked || false;
  const creatorsInput = document.getElementById("creatorsInput");
  const creatorsFilter = useCreators ? (creatorsInput.value || "").trim() : "";
  const creatorMode = document.querySelector('input[name="creatorMode"]:checked')?.value || "only";

  const maxRemovals = Math.max(0, parseInt(document.getElementById("maxRemovals")?.value, 10) || 0);

  const intervalMode = document.getElementById("intervalMode").value;
  let intervalMin = Math.max(1, Math.min(10, parseInt(document.getElementById("intervalMin").value, 10) || 1));
  let intervalMax = Math.max(1, Math.min(10, parseInt(document.getElementById("intervalMax").value, 10) || 5));
  if (intervalMin > intervalMax) intervalMax = intervalMin;
  const intervalSetStr = (document.getElementById("intervalSet").value || "2, 4, 6")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 0);
  const requestIntervalSet = intervalSetStr.length ? intervalSetStr : [2, 4, 6];
  const reportFormat = document.getElementById("reportFormat").value;
  const pagePause = Math.max(0, Math.min(120, parseInt(document.getElementById("pagePause").value, 10) || 8));

  return {
    targetType: targetType,
    dryRun,
    keywordsFilter,
    creatorsFilter,
    creatorMode,
    maxRemovals,
    requestIntervalMode: intervalMode,
    requestIntervalRange: { min: intervalMin, max: intervalMax },
    requestIntervalSet,
    exportFileType: reportFormat,
    pagePauseSeconds: pagePause,
    i18n: getPanelI18n(),
  };
}

function getStorage() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
  return null;
}

const INTERVAL_MIN = 1;
const INTERVAL_MAX = 10;

function updateDualRangeDisplay() {
  const minEl = document.getElementById("intervalMin");
  const maxEl = document.getElementById("intervalMax");
  const fillEl = document.getElementById("intervalRangeFill");
  const displayEl = document.getElementById("intervalRangeDisplay");
  if (!minEl || !maxEl) return;
  let min = Math.max(INTERVAL_MIN, Math.min(INTERVAL_MAX, parseInt(minEl.value, 10) || 1));
  let max = Math.max(INTERVAL_MIN, Math.min(INTERVAL_MAX, parseInt(maxEl.value, 10) || 5));
  if (min > max) max = min;
  if (max < min) min = max;
  minEl.value = min;
  maxEl.value = max;
  const range = INTERVAL_MAX - INTERVAL_MIN;
  const pctMin = ((min - INTERVAL_MIN) / range) * 100;
  const pctWidth = ((max - min) / range) * 100;
  if (fillEl) {
    fillEl.style.left = pctMin + "%";
    fillEl.style.width = pctWidth + "%";
  }
  if (displayEl) displayEl.textContent = min + "s – " + max + "s";
}

function loadSavedConfig() {
  const storage = getStorage();
  if (!storage) return;

  storage.get("trrConfig", (data) => {
    const c = data && data.trrConfig;
    if (!c) {
      updateDualRangeDisplay();
      return;
    }
    try {
      if (c.targetType) {
        currentTargetType = c.targetType;
        document.querySelectorAll(".popup-target-pill").forEach((pill) => {
          pill.classList.toggle("is-active", pill.getAttribute("data-target") === currentTargetType);
        });
        updateStartButtonLabel();
      }

      if (c.dryRun != null) document.getElementById("dryRun").checked = !!c.dryRun;
      if (c.useKeywords != null) document.getElementById("useKeywords").checked = !!c.useKeywords;
      const kw = document.getElementById("keywordsInput");
      if (kw) {
        if (c.keywordsFilter) kw.value = c.keywordsFilter;
        kw.disabled = !document.getElementById("useKeywords").checked;
      }

      if (c.useCreators != null) document.getElementById("useCreators").checked = !!c.useCreators;
      const cr = document.getElementById("creatorsInput");
      const crGroup = document.getElementById("creatorModeGroup");
      if (cr) {
        if (c.creatorsFilter) cr.value = c.creatorsFilter;
        cr.disabled = !document.getElementById("useCreators").checked;
      }
      if (crGroup) {
        crGroup.style.display = document.getElementById("useCreators").checked ? "flex" : "none";
      }
      if (c.creatorMode) {
        const rad = document.querySelector(`input[name="creatorMode"][value="${c.creatorMode}"]`);
        if (rad) rad.checked = true;
      }

      if (c.maxRemovals != null) {
        const mr = document.getElementById("maxRemovals");
        if (mr) mr.value = c.maxRemovals;
      }

      if (c.requestIntervalMode) document.getElementById("intervalMode").value = c.requestIntervalMode;
      const isRange = document.getElementById("intervalMode").value === "range";
      const rangeGrp = document.getElementById("intervalRangeGroup");
      const setGrp = document.getElementById("intervalSetGroup");
      if (rangeGrp) rangeGrp.style.display = isRange ? "flex" : "none";
      if (setGrp) setGrp.style.display = isRange ? "none" : "flex";

      if (c.requestIntervalRange) {
        const minEl = document.getElementById("intervalMin");
        const maxEl = document.getElementById("intervalMax");
        let minVal = Math.max(1, Math.min(10, c.requestIntervalRange.min ?? 1));
        let maxVal = Math.max(1, Math.min(10, c.requestIntervalRange.max ?? 5));
        
        // Si tenía guardado el valor anterior por defecto (3s o 4s), migrar automáticamente a 5s
        if (maxVal === 3 || maxVal === 4) {
          maxVal = 5;
        }

        if (minEl) minEl.value = minVal;
        if (maxEl) maxEl.value = Math.max(minVal, maxVal);
        updateDualRangeDisplay();
      } else {
        updateDualRangeDisplay();
      }

      if (c.requestIntervalSet && c.requestIntervalSet.length) {
        const setEl = document.getElementById("intervalSet");
        if (setEl) setEl.value = c.requestIntervalSet.join(", ");
      }
      if (c.exportFileType) document.getElementById("reportFormat").value = c.exportFileType;
      if (c.pagePauseSeconds != null) {
        const pp = document.getElementById("pagePause");
        if (pp) pp.value = Math.max(0, c.pagePauseSeconds);
      }
    } catch (err) {
      console.warn("TikTok Cleaner: loadSavedConfig", err);
    }
  });
}

function saveConfig(config) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.set({
      trrConfig: {
        targetType: config.targetType,
        dryRun: config.dryRun,
        useKeywords: !!config.keywordsFilter,
        keywordsFilter: config.keywordsFilter,
        useCreators: !!config.creatorsFilter,
        creatorsFilter: config.creatorsFilter,
        creatorMode: config.creatorMode,
        maxRemovals: config.maxRemovals,
        requestIntervalMode: config.requestIntervalMode,
        requestIntervalRange: config.requestIntervalRange,
        requestIntervalSet: config.requestIntervalSet,
        exportFileType: config.exportFileType,
        pagePauseSeconds: config.pagePauseSeconds,
      },
    });
  } catch (err) {
    console.warn("TikTok Cleaner: saveConfig", err);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  applyI18n();
  loadSavedConfig();

  const startButton = document.getElementById("startButton");
  const useKeywords = document.getElementById("useKeywords");
  const keywordsInput = document.getElementById("keywordsInput");
  const useCreators = document.getElementById("useCreators");
  const creatorsInput = document.getElementById("creatorsInput");
  const creatorModeGroup = document.getElementById("creatorModeGroup");
  const intervalMode = document.getElementById("intervalMode");
  const intervalRangeGroup = document.getElementById("intervalRangeGroup");
  const intervalSetGroup = document.getElementById("intervalSetGroup");

  // Target Selector Pills
  document.querySelectorAll(".popup-target-pill").forEach((pill) => {
    pill.addEventListener("click", function () {
      document.querySelectorAll(".popup-target-pill").forEach((p) => p.classList.remove("is-active"));
      this.classList.add("is-active");
      currentTargetType = this.getAttribute("data-target") || "reposts";
      updateStartButtonLabel();
      saveConfig(getConfig());
    });
  });

  // Toggle configuración
  const configSection = document.querySelector(".popup-config");
  const configToggle = document.getElementById("configToggle");
  if (configSection && configToggle) {
    configToggle.addEventListener("click", function () {
      const isClosed = configSection.classList.toggle("is-closed");
      configToggle.setAttribute("aria-expanded", isClosed ? "false" : "true");
    });
  }

  // Menu dropdown
  const menuBtn = document.getElementById("menuBtn");
  const menuDropdown = document.getElementById("menuDropdown");
  if (menuBtn && menuDropdown) {
    menuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = menuDropdown.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      menuDropdown.setAttribute("aria-hidden", isOpen ? "false" : "true");
    });
    document.addEventListener("click", function () {
      if (menuDropdown.classList.contains("is-open")) {
        menuDropdown.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
        menuDropdown.setAttribute("aria-hidden", "true");
      }
    });
  }

  // Checkboxes switches
  if (useKeywords && keywordsInput) {
    useKeywords.addEventListener("change", function () {
      keywordsInput.disabled = !this.checked;
      if (this.checked) keywordsInput.focus();
    });
  }

  if (useCreators && creatorsInput && creatorModeGroup) {
    useCreators.addEventListener("change", function () {
      creatorsInput.disabled = !this.checked;
      creatorModeGroup.style.display = this.checked ? "flex" : "none";
      if (this.checked) creatorsInput.focus();
    });
  }

  const intervalMinEl = document.getElementById("intervalMin");
  const intervalMaxEl = document.getElementById("intervalMax");
  if (intervalMinEl && intervalMaxEl) {
    intervalMinEl.addEventListener("input", function () {
      const min = parseInt(this.value, 10);
      const maxEl = document.getElementById("intervalMax");
      if (maxEl && parseInt(maxEl.value, 10) < min) maxEl.value = min;
      updateDualRangeDisplay();
    });
    intervalMaxEl.addEventListener("input", function () {
      const max = parseInt(this.value, 10);
      const minEl = document.getElementById("intervalMin");
      if (minEl && parseInt(minEl.value, 10) > max) minEl.value = max;
      updateDualRangeDisplay();
    });
    updateDualRangeDisplay();
  }

  if (intervalMode) {
    intervalMode.addEventListener("change", function () {
      const isRange = this.value === "range";
      intervalRangeGroup.style.display = isRange ? "flex" : "none";
      intervalSetGroup.style.display = isRange ? "none" : "flex";
    });
  }

  const loginButton = document.getElementById("loginButton");
  checkTiktokLogin().then((isLoggedIn) => {
    if (isLoggedIn) {
      startButton.disabled = false;
      startButton.style.display = "block";
      if (loginButton) { loginButton.style.display = "none"; loginButton.hidden = true; }
    } else {
      startButton.disabled = true;
      startButton.style.display = "none";
      if (loginButton) {
        loginButton.hidden = false;
        loginButton.style.display = "block";
        const i18n = typeof chrome !== "undefined" && chrome.i18n ? chrome.i18n : null;
        loginButton.title = (i18n && i18n.getMessage("notLoggedIn")) || "Sign in to TikTok first.";
      }
    }
  });

  if (loginButton) {
    loginButton.addEventListener("click", () => {
      chrome.tabs.create({ url: "https://www.tiktok.com/login", active: true });
      window.close();
    });
  }

  startButton.addEventListener("click", function () {
    if (startButton.disabled) return;
    const config = getConfig();
    saveConfig(config);
    startButton.textContent = "⏳ Conectando...";
    startButton.style.opacity = "0.85";
    chrome.runtime.sendMessage({
      action: "startRemovingReposts",
      payload: { config },
    });
    setTimeout(() => {
      window.close();
    }, 350);
  });

  const donateButton = document.getElementById("donateButton");
  if (donateButton) {
    donateButton.addEventListener("click", function () {
      openDonation();
    });
  }
});
