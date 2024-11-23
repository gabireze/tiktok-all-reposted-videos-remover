const initiateRepostsVideosRemoval = async () => {
  const clickRepostTab = async () => {
    try {
      const repostTab = document.querySelector('[class*="PRepost"]');
      if (!repostTab) {
        stopScript("The 'Reposts' tab not found on the page");
        return;
      }
      repostTab.click();
      console.log("Successfully opened the 'Reposts' tab.");
      await sleep(5000);
    } catch (error) {
      stopScript("Error finding or clicking the 'Reposts' tab", error);
    }
  };

  const clickRepostVideo = async () => {
    try {
      const firstVideo = document.querySelector(
        '[class*="DivPlayerContainer"]'
      );
      if (!firstVideo) {
        stopScript(
          "No reposted videos found. Your reposted videos list is empty"
        );
        return;
      }
      firstVideo.click();
      console.log("Successfully opened the first reposted video.");
      await sleep(5000);
    } catch (error) {
      stopScript(
        `Error finding or clicking the first reposted video: ${error.message}`,
        error
      );
    }
  };

  const clickNextRepostAndRemove = async () => {
    try {
      const interval = setInterval(async () => {
        const nextVideoButton = document.querySelector(
          '[data-e2e="arrow-right"]'
        );
        const repostButton = document.querySelector(
          '[data-e2e="video-share-repost"]'
        );

        if (!repostButton) {
          clearInterval(interval);
          stopScript("Could not find the reposted button");
          return;
        }

        repostButton.click();
        console.log(
          "Successfully removed the reposted from the current video."
        );

        if (!nextVideoButton || nextVideoButton.disabled) {
          clearInterval(interval);
          closeVideo();
          return;
        }

        nextVideoButton.click();
        console.log("Clicked the next reposted video.");
      }, 2000);
    } catch (error) {
      clearInterval(interval);
      stopScript("Error occurred in the reposted video removal process", error);
    }
  };

  const closeVideo = async () => {
    try {
      const closeVideoButton = document.querySelector(
        '[data-e2e="browse-close"]'
      );
      if (closeVideoButton) {
        closeVideoButton.click();
        console.log("Successfully closed the video.");
        stopScript("Script completed: All actions executed successfully");
      } else {
        stopScript("Could not find the close video button");
      }
    } catch (error) {
      stopScript("Error occurred while trying to close the video", error);
    }
  };

  const stopScript = (message, error = "") => {
    let logMessage = `${message}. Reloading page...`;
    if (error) {
      console.log({ message: logMessage, error });
    } else {
      console.log(logMessage);
    }
    setTimeout(() => window.location.reload(), 1000);
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    console.log("Script started: Initiating actions...");
    await clickRepostTab();
    await clickRepostVideo();
    await clickNextRepostAndRemove();
  } catch (error) {
    stopScript("Error in script", error);
  }
};

initiateRepostsVideosRemoval();
