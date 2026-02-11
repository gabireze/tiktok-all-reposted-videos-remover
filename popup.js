// Mapeamento de países para códigos de moeda do PayPal
const COUNTRY_CURRENCY_MAP = {
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  AU: "AUD",
  JP: "JPY",
  BR: "BRL",
  MX: "MXN",
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  PE: "PEN",
  UY: "UYU",
  PY: "PYG",
  BO: "BOB",
  EC: "USD",
  VE: "VES",
  CR: "CRC",
  PA: "PAB",
  GT: "GTQ",
  HN: "HNL",
  SV: "USD",
  NI: "NIO",
  DO: "DOP",
  CU: "CUP",
  HT: "HTG",
  JM: "JMD",
  BS: "BSD",
  BB: "BBD",
  TT: "TTD",
  GY: "GYD",
  SR: "SRD",
  FK: "FKP",
  CH: "CHF",
  NO: "NOK",
  SE: "SEK",
  DK: "DKK",
  FI: "EUR",
  IE: "EUR",
  AT: "EUR",
  BE: "EUR",
  LU: "EUR",
  PT: "EUR",
  GR: "EUR",
  CY: "EUR",
  MT: "EUR",
  SK: "EUR",
  SI: "EUR",
  EE: "EUR",
  LV: "EUR",
  LT: "EUR",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  HR: "EUR",
  RS: "RSD",
  BA: "BAM",
  MK: "MKD",
  AL: "ALL",
  ME: "EUR",
  XK: "EUR",
  MD: "MDL",
  UA: "UAH",
  BY: "BYN",
  RU: "RUB",
  KZ: "KZT",
  UZ: "UZS",
  TJ: "TJS",
  KG: "KGS",
  TM: "TMT",
  AF: "AFN",
  PK: "PKR",
  IN: "INR",
  LK: "LKR",
  BD: "BDT",
  NP: "NPR",
  BT: "BTN",
  MV: "MVR",
  CN: "CNY",
  HK: "HKD",
  MO: "MOP",
  TW: "TWD",
  KR: "KRW",
  KP: "KPW",
  MN: "MNT",
  MM: "MMK",
  TH: "THB",
  LA: "LAK",
  KH: "KHR",
  VN: "VND",
  MY: "MYR",
  SG: "SGD",
  BN: "BND",
  ID: "IDR",
  PH: "PHP",
  TL: "USD",
  PG: "PGK",
  SB: "SBD",
  VU: "VUV",
  FJ: "FJD",
  NC: "XPF",
  PF: "XPF",
  WS: "WST",
  TO: "TOP",
  KI: "AUD",
  TV: "AUD",
  NR: "AUD",
  MH: "USD",
  FM: "USD",
  PW: "USD",
  AS: "USD",
  GU: "USD",
  MP: "USD",
  PR: "USD",
  VI: "USD",
  UM: "USD",
  NZ: "NZD",
  CK: "NZD",
  NU: "NZD",
  PN: "NZD",
  TK: "NZD",
};

// Função para detectar o país do usuário usando apenas recursos do navegador
function detectUserCountry() {
  try {
    // Método 1: Usar timezone do navegador (mais preciso)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneCountryMap = {
      // Americas
      "America/Sao_Paulo": "BR",
      "America/Argentina/Buenos_Aires": "AR",
      "America/Santiago": "CL",
      "America/Bogota": "CO",
      "America/Lima": "PE",
      "America/Montevideo": "UY",
      "America/Asuncion": "PY",
      "America/La_Paz": "BO",
      "America/Guayaquil": "EC",
      "America/Caracas": "VE",
      "America/Costa_Rica": "CR",
      "America/Panama": "PA",
      "America/Guatemala": "GT",
      "America/Tegucigalpa": "HN",
      "America/El_Salvador": "SV",
      "America/Managua": "NI",
      "America/Santo_Domingo": "DO",
      "America/Havana": "CU",
      "America/Port-au-Prince": "HT",
      "America/Jamaica": "JM",
      "America/New_York": "US",
      "America/Chicago": "US",
      "America/Denver": "US",
      "America/Los_Angeles": "US",
      "America/Anchorage": "US",
      "America/Toronto": "CA",
      "America/Vancouver": "CA",
      "America/Mexico_City": "MX",

      // Europe
      "Europe/London": "GB",
      "Europe/Dublin": "IE",
      "Europe/Paris": "FR",
      "Europe/Berlin": "DE",
      "Europe/Madrid": "ES",
      "Europe/Rome": "IT",
      "Europe/Amsterdam": "NL",
      "Europe/Brussels": "BE",
      "Europe/Zurich": "CH",
      "Europe/Vienna": "AT",
      "Europe/Stockholm": "SE",
      "Europe/Oslo": "NO",
      "Europe/Copenhagen": "DK",
      "Europe/Helsinki": "FI",
      "Europe/Warsaw": "PL",
      "Europe/Prague": "CZ",
      "Europe/Budapest": "HU",
      "Europe/Bucharest": "RO",
      "Europe/Sofia": "BG",
      "Europe/Athens": "GR",
      "Europe/Lisbon": "PT",
      "Europe/Moscow": "RU",
      "Europe/Kiev": "UA",

      // Asia
      "Asia/Tokyo": "JP",
      "Asia/Seoul": "KR",
      "Asia/Shanghai": "CN",
      "Asia/Hong_Kong": "HK",
      "Asia/Taipei": "TW",
      "Asia/Singapore": "SG",
      "Asia/Bangkok": "TH",
      "Asia/Jakarta": "ID",
      "Asia/Manila": "PH",
      "Asia/Kuala_Lumpur": "MY",
      "Asia/Ho_Chi_Minh": "VN",
      "Asia/Kolkata": "IN",
      "Asia/Karachi": "PK",
      "Asia/Dhaka": "BD",
      "Asia/Colombo": "LK",
      "Asia/Dubai": "AE",
      "Asia/Riyadh": "SA",
      "Asia/Tehran": "IR",
      "Asia/Baghdad": "IQ",
      "Asia/Jerusalem": "IL",

      // Oceania
      "Australia/Sydney": "AU",
      "Australia/Melbourne": "AU",
      "Australia/Perth": "AU",
      "Pacific/Auckland": "NZ",
      "Pacific/Fiji": "FJ",

      // Africa
      "Africa/Cairo": "EG",
      "Africa/Lagos": "NG",
      "Africa/Johannesburg": "ZA",
      "Africa/Casablanca": "MA",
      "Africa/Algiers": "DZ",
      "Africa/Tunis": "TN",
      "Africa/Nairobi": "KE",
    };

    if (timezoneCountryMap[timezone]) {
      return timezoneCountryMap[timezone];
    }
  } catch (error) {
    console.log("Erro ao detectar país via timezone:", error);
  }

  try {
    // Método 2: Usar o locale do navegador
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const localeCountryMap = {
      "pt-BR": "BR",
      "en-US": "US",
      "en-GB": "GB",
      "en-CA": "CA",
      "en-AU": "AU",
      "fr-FR": "FR",
      "fr-CA": "CA",
      "de-DE": "DE",
      "de-AT": "AT",
      "de-CH": "CH",
      "es-ES": "ES",
      "es-MX": "MX",
      "es-AR": "AR",
      "es-CL": "CL",
      "es-CO": "CO",
      "es-PE": "PE",
      "it-IT": "IT",
      "it-CH": "CH",
      "ja-JP": "JP",
      "ko-KR": "KR",
      "zh-CN": "CN",
      "zh-TW": "TW",
      "zh-HK": "HK",
      "ru-RU": "RU",
      "pl-PL": "PL",
      "nl-NL": "NL",
      "sv-SE": "SE",
      "no-NO": "NO",
      "da-DK": "DK",
      "fi-FI": "FI",
      "th-TH": "TH",
      "vi-VN": "VN",
      "id-ID": "ID",
      "ms-MY": "MY",
      "hi-IN": "IN",
      "ar-SA": "SA",
      "ar-EG": "EG",
      "he-IL": "IL",
      "tr-TR": "TR",
      "uk-UA": "UA",
      "cs-CZ": "CZ",
      "hu-HU": "HU",
      "ro-RO": "RO",
      "bg-BG": "BG",
      "el-GR": "GR",
      "hr-HR": "HR",
      "sk-SK": "SK",
      "sl-SI": "SI",
      "et-EE": "EE",
      "lv-LV": "LV",
      "lt-LT": "LT",
    };

    if (localeCountryMap[locale]) {
      return localeCountryMap[locale];
    }
  } catch (error) {
    console.log("Erro ao detectar país via locale:", error);
  }

  try {
    // Método 3: Usar navigator.language como fallback
    const language = navigator.language || navigator.userLanguage;
    if (language.includes("-")) {
      const countryCode = language.split("-")[1].toUpperCase();
      // Verificar se o código de país existe no nosso mapeamento
      if (COUNTRY_CURRENCY_MAP[countryCode]) {
        return countryCode;
      }
    }

    // Mapeamento básico por idioma
    const languageCountryMap = {
      pt: "BR",
      en: "US",
      fr: "FR",
      de: "DE",
      es: "ES",
      it: "IT",
      ja: "JP",
      ko: "KR",
      zh: "CN",
      ru: "RU",
      ar: "SA",
      hi: "IN",
      th: "TH",
      vi: "VN",
      id: "ID",
      ms: "MY",
      tr: "TR",
      pl: "PL",
      nl: "NL",
      sv: "SE",
      no: "NO",
      da: "DK",
      fi: "FI",
    };

    const languageCode = language.split("-")[0].toLowerCase();
    if (languageCountryMap[languageCode]) {
      return languageCountryMap[languageCode];
    }
  } catch (error) {
    console.log("Erro ao detectar país via language:", error);
  }

  // Fallback final: US como padrão
  return "US";
}

// Função para abrir doação do PayPal
function openDonation() {
  const countryCode = detectUserCountry();
  const currencyCode = COUNTRY_CURRENCY_MAP[countryCode] || "USD";

  const donationUrl = `https://www.paypal.com/donate/?cmd=_donations&business=S34UMJ23659VY&currency_code=${currencyCode}`;

  chrome.tabs.create({ url: donationUrl });
}

async function checkTiktokLogin() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: "tiktok.com" });
    const hasMultiSids = cookies.some((c) => c.name === "multi_sids");
    const hasLivingUserId = cookies.some((c) => c.name === "living_user_id");
    return !!(hasMultiSids || hasLivingUserId);
  } catch (e) {
    return false;
  }
}

const I18N_KEYS_PANEL = [
  "panelTitle", "statusPreparing", "statusPaused", "statusResuming", "btnPause", "btnResume",
  "btnDownloadReport", "statusWaiting", "statusListing", "statusPageRemoving", "statusDone",
  "statusNone", "statusErrorNoAccount", "statusErrorRedirectedForyou", "statusErrorRemove", "panelClose", "statsPages",
  "statsRemoved", "statsListed", "statsFailed", "statusStoppedFailures", "statusBetweenPages"
];

function applyI18n() {
  const i18n = typeof chrome !== "undefined" && chrome.i18n ? chrome.i18n : null;
  const getMsg = (key) => (i18n ? i18n.getMessage(key) : "") || "";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const message = getMsg(key);
    element.innerHTML = message || element.innerHTML || "";
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const key = element.getAttribute("data-i18n-title");
    const message = getMsg(key);
    if (message) element.title = message;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    const message = getMsg(key);
    element.placeholder = message || element.placeholder || "";
  });
  document.querySelectorAll("option[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const message = getMsg(key);
    element.textContent = message || element.textContent || "";
  });
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
  const useKeywords = document.getElementById("useKeywords").checked;
  const keywordsInput = document.getElementById("keywordsInput");
  const keywordsFilter = useKeywords ? (keywordsInput.value || "").trim() : "";
  const intervalMode = document.getElementById("intervalMode").value;
  let intervalMin = Math.max(1, Math.min(10, parseInt(document.getElementById("intervalMin").value, 10) || 1));
  let intervalMax = Math.max(1, Math.min(10, parseInt(document.getElementById("intervalMax").value, 10) || 3));
  if (intervalMin > intervalMax) intervalMax = intervalMin;
  const intervalSetStr = (document.getElementById("intervalSet").value || "1,3,5")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 0);
  const requestIntervalSet = intervalSetStr.length ? intervalSetStr : [1, 3, 5];
  const reportFormat = document.getElementById("reportFormat").value;
  const pagePause = Math.max(0, Math.min(120, parseInt(document.getElementById("pagePause").value, 10) || 5));
  return {
    keywordsFilter,
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

function loadSavedConfig() {
  const storage = getStorage();
  if (!storage) return;

  storage.get("trrConfig", (data) => {
    const c = data && data.trrConfig;
    if (!c) return;
    try {
      if (c.useKeywords != null) document.getElementById("useKeywords").checked = !!c.useKeywords;
      const kw = document.getElementById("keywordsInput");
      if (kw) {
        if (c.keywordsFilter) kw.value = c.keywordsFilter;
        kw.disabled = !document.getElementById("useKeywords").checked;
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
        const minVal = Math.max(1, Math.min(10, c.requestIntervalRange.min ?? 1));
        const maxVal = Math.max(1, Math.min(10, c.requestIntervalRange.max ?? 3));
        if (minEl) minEl.value = minVal;
        if (maxEl) maxEl.value = Math.max(minVal, maxVal);
        const fillEl = document.getElementById("intervalRangeFill");
        const displayEl = document.getElementById("intervalRangeDisplay");
        if (minEl && maxEl) {
          const min = parseInt(minEl.value, 10) || 1;
          const max = parseInt(maxEl.value, 10) || 3;
          const range = 10 - 1;
          const pctMin = ((min - 1) / range) * 100;
          const pctWidth = ((max - min) / range) * 100;
          if (fillEl) {
            fillEl.style.left = pctMin + "%";
            fillEl.style.width = pctWidth + "%";
          }
          if (displayEl) displayEl.textContent = min + "s – " + max + "s";
        }
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
      console.warn("TikTok Reposts Remover: loadSavedConfig", err);
    }
  });
}

function saveConfig(config) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.set({
      trrConfig: {
        useKeywords: !!config.keywordsFilter,
        keywordsFilter: config.keywordsFilter,
        requestIntervalMode: config.requestIntervalMode,
        requestIntervalRange: config.requestIntervalRange,
        requestIntervalSet: config.requestIntervalSet,
        exportFileType: config.exportFileType,
        pagePauseSeconds: config.pagePauseSeconds,
      },
    });
  } catch (err) {
    console.warn("TikTok Reposts Remover: saveConfig", err);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  applyI18n();
  loadSavedConfig();

  const startButton = document.getElementById("startButton");
  const useKeywords = document.getElementById("useKeywords");
  const keywordsInput = document.getElementById("keywordsInput");
  const intervalMode = document.getElementById("intervalMode");
  const intervalRangeGroup = document.getElementById("intervalRangeGroup");
  const intervalSetGroup = document.getElementById("intervalSetGroup");

  // Toggle configuração (slide)
  const configSection = document.querySelector(".popup-config");
  const configToggle = document.getElementById("configToggle");
  const configBody = document.getElementById("configBody");
  if (configSection && configToggle && configBody) {
    configToggle.addEventListener("click", function () {
      const isClosed = configSection.classList.toggle("is-closed");
      configToggle.setAttribute("aria-expanded", isClosed ? "false" : "true");
    });
  }

  // Menu dropdown (clique)
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

  useKeywords.addEventListener("change", function () {
    keywordsInput.disabled = !this.checked;
  });
  const INTERVAL_MIN = 1;
  const INTERVAL_MAX = 10;

  function updateDualRangeDisplay() {
    const minEl = document.getElementById("intervalMin");
    const maxEl = document.getElementById("intervalMax");
    const fillEl = document.getElementById("intervalRangeFill");
    const displayEl = document.getElementById("intervalRangeDisplay");
    if (!minEl || !maxEl) return;
    let min = Math.max(INTERVAL_MIN, Math.min(INTERVAL_MAX, parseInt(minEl.value, 10) || INTERVAL_MIN));
    let max = Math.max(INTERVAL_MIN, Math.min(INTERVAL_MAX, parseInt(maxEl.value, 10) || INTERVAL_MAX));
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

  intervalMode.addEventListener("change", function () {
    const isRange = this.value === "range";
    intervalRangeGroup.style.display = isRange ? "flex" : "none";
    intervalSetGroup.style.display = isRange ? "none" : "flex";
  });

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
    chrome.runtime.sendMessage({
      action: "startRemovingReposts",
      payload: { config },
    });
    window.close();
  });

  const donateButton = document.getElementById("donateButton");
  if (donateButton) {
    donateButton.addEventListener("click", function () {
      openDonation();
    });
  }
});
