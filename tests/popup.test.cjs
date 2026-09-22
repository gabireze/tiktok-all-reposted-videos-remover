const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "popup.js"), "utf8");
const start = source.indexOf("const I18N_KEYS_PANEL");
const end = source.indexOf("\nfunction getConfig", start);
assert.notEqual(start, -1);
assert.notEqual(end, -1);

const calls = [];
const context = vm.createContext({ chrome: { i18n: { getMessage(key, substitutions) {
  calls.push({ key, substitutions });
  if (key === "statusScanDone") return `Analysis complete: ${substitutions[0]} of ${substitutions[1]} reposts match.`;
  return key;
} } } });
vm.runInContext(source.slice(start, end), context, { filename: "popup-i18n.js" });
const messages = vm.runInContext("getPanelI18n()", context);
assert.equal(messages.statusScanDone, "Analysis complete: $1$ of $2$ reposts match.");
assert.deepEqual(Array.from(calls.find((call) => call.key === "statusScanDone").substitutions), ["$1$", "$2$", "$3$"]);
console.log("popup tests: ok");
