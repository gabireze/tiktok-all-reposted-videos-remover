chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.action === "removeRepostedVideos") {
    try {
      const tab = await chrome.tabs.create({
        url: "https://www.tiktok.com/",
        active: true,
      });

      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["script.js"],
          });
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    } catch (error) {
      console.log({
        message: "Error opening TikTok or starting script.",
        error,
      });
    }
  }
});
