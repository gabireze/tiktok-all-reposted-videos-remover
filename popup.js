document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const message = chrome.i18n.getMessage(key);
    if (message) element.innerHTML = message;
  });

  const startButton = document.getElementById("startButton");
  if (startButton) {
    startButton.addEventListener("click", function () {
      chrome.runtime.sendMessage({ action: "removeRepostedVideos" });
    });
  }
});
