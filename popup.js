document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("startButton").addEventListener("click", function () {
    chrome.runtime.sendMessage({ action: "removeRepostedVideos" });
  });
});
