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

document.addEventListener("DOMContentLoaded", function () {
  // Processa elementos com data-i18n para innerHTML
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const message = chrome.i18n.getMessage(key);
    if (message) element.innerHTML = message;
  });

  // Processa elementos com data-i18n-title para atributo title
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const key = element.getAttribute("data-i18n-title");
    const message = chrome.i18n.getMessage(key);
    if (message) element.title = message;
  });

  const startButton = document.getElementById("startButton");
  if (startButton) {
    startButton.addEventListener("click", function () {
      chrome.runtime.sendMessage({ action: "removeRepostedVideos" });
    });
  }

  // Adicionar event listener para o botão de doação
  const donateButton = document.getElementById("donateButton");
  if (donateButton) {
    donateButton.addEventListener("click", function () {
      openDonation();
    });
  }
});
