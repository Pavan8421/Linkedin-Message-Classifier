// extractionManager.js
// Handles extraction of unread chats from LinkedIn messaging.
let extractionInProgress = false;
let extractionTabUpdateListener = null;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function showLoadingOverlay(tabId, text = "Processing...") {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (loadingText) => {
        if (!document.getElementById("loading-overlay")) {
          const loader = document.createElement("div");
          loader.id = "loading-overlay";
          loader.innerHTML = `
            <div class="loading-spinner"></div>
            <p id="loading-text" class="loading-text">${loadingText}</p>
          `;
          const style = document.createElement("style");
          style.id = "loader-styles";
          style.innerHTML = `
            #loading-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0, 0, 0, 0.85);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-size: 18px;
              font-family: Arial, sans-serif;
              z-index: 9999;
            }
            .loading-spinner {
              width: 60px;
              height: 60px;
              border: 6px solid rgba(255, 255, 255, 0.3);
              border-top: 6px solid #ffffff;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-bottom: 15px;
            }
            .loading-text {
              font-size: 20px;
              font-weight: bold;
              text-align: center;
              color: rgb(20, 153, 255);
              text-shadow: 0px 0px 10px rgba(20, 114, 255, 0.8), 0px 0px 20px rgba(20, 200, 255, 0.5);
              opacity: 0.9;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `;
          document.body.appendChild(loader);
          document.head.appendChild(style);
        }
        document.getElementById("loading-text").innerText = loadingText;
      },
      args: [text],
    });
    console.log(`🔄 Loading overlay displayed: ${text}`);
  } catch (error) {
    console.error("❌ Error showing loading overlay:", error);
  }
}

async function hideLoadingOverlay(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const loader = document.getElementById("loading-overlay");
        if (loader) {
          loader.style.opacity = "0";
          setTimeout(() => loader.remove(), 500);
        }
      },
    });
    console.log("✅ Loading overlay removed.");
  } catch (error) {
    console.error("❌ Error hiding loading overlay:", error);
  }
}

function showNoUnreadPopup(tabId) {
  try {
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const popup = document.createElement("div");
        popup.innerHTML = "⚠️ No unread messages found!";
        popup.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #ffcc00;
          color: black;
          padding: 15px 25px;
          font-size: 18px;
          font-weight: bold;
          border-radius: 8px;
          z-index: 9999;
          animation: fadeOut 3s ease-in-out forwards;
        `;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 3000);
      },
    });
  } catch (error) {
    console.error("❌ Error showing no unread popup:", error);
  }
}

async function startExtraction(tab) {
  if (extractionInProgress) {
    console.log("⚠️ Extraction already in progress.");
    return;
  }
  extractionInProgress = true;
  console.log("🚀 Starting extraction process...");

  // Append unread filter to URL if missing
  const updatedUrl = tab.url.includes("?filter=unread")
    ? tab.url
    : tab.url + "?filter=unread";
  chrome.tabs.update(tab.id, { url: updatedUrl }, () => {
    console.log("🔄 Updated URL:", updatedUrl);
    // Set up tab update listener to wait for the page to load completely
    extractionTabUpdateListener = async (tabId, changeInfo, updatedTab) => {
      if (!extractionInProgress) {
        chrome.tabs.onUpdated.removeListener(extractionTabUpdateListener);
        extractionTabUpdateListener = null;
        return;
      }
      if (
        tabId === tab.id &&
        changeInfo.status === "complete" &&
        updatedTab.url === updatedUrl
      ) {
        console.log(
          "✅ Tab finished loading. Showing loading overlay for extraction..."
        );
        await showLoadingOverlay(tabId, "Extracting unread chats...");
        await wait(2000);
        if (!extractionInProgress) {
          console.log("Extraction canceled during waiting.");
          chrome.tabs.onUpdated.removeListener(extractionTabUpdateListener);
          extractionTabUpdateListener = null;
          return;
        }
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
          });
          console.log("✅ content.js injected successfully.");
        } catch (error) {
          console.error("❌ Error injecting content.js:", error);
        }
        chrome.tabs.onUpdated.removeListener(extractionTabUpdateListener);
        extractionTabUpdateListener = null;
        // Reset extraction state to allow future extractions
        extractionInProgress = false;
      }
    };
    chrome.tabs.onUpdated.addListener(extractionTabUpdateListener);
  });
}

// Removed duplicate function definition
function cancelExtraction(tab) {
  console.log("⛔ Canceling extraction process.");
  extractionInProgress = false;
  if (extractionTabUpdateListener) {
    chrome.tabs.onUpdated.removeListener(extractionTabUpdateListener);
    extractionTabUpdateListener = null;
  }
  if (tab && tab.id) {
    // Show a loading spinner with "Cancelling..." message while canceling.
    showLoadingOverlay(tab.id, "Cancelling...");
    const updatedUrl = tab.url.split("?filter=unread")[0];
    chrome.tabs.update(tab.id, { url: updatedUrl }, () => {
      // Hide the loading spinner after a brief delay.
      setTimeout(() => {
        hideLoadingOverlay(tab.id);
      }, 1000);
      // Propagate cancel command to content.js.
      chrome.tabs.sendMessage(tab.id, { type: "cancelClassification" });
    });
  }
}

export {
  startExtraction,
  cancelExtraction,
  showLoadingOverlay,
  hideLoadingOverlay,
  showNoUnreadPopup,
};
