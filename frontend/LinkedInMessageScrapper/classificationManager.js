// classificationManager.js
// Handles classification process using chat data extracted by content.js
let classificationInProgress = false;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processChatData(chatData) {
  const mappedData = {};
  for (const chat of chatData) {
    if (!classificationInProgress) {
      console.log("Classification canceled during processing chat data.");
      break;
    }
    const { username, unreadMessages } = chat;
    if (username && unreadMessages && unreadMessages.length > 0) {
      try {
        const messagesString = unreadMessages.join(",");
        console.log(`📤 Sending messages for classification: ${username}`);
        const response = await fetch("http://127.0.0.1:8000/api/classify/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messagesString }),
        });
        const data = await response.json();
        mappedData[username] = data.predicted_category || "general";
      } catch (error) {
        console.error(`❌ Error processing chat (${username}):`, error);
        mappedData[username] = "general";
      }
    } else {
      mappedData[username] = "general";
    }
  }
  return mappedData;
}

async function startClassification(chatData, senderTab) {
  classificationInProgress = true;
  console.log("🚀 Starting classification process...");
  try {
    const mappedData = await processChatData(chatData);
    console.log("📊 Mapped Data:", mappedData);
    // Remove the unread filter from URL
    const updatedUrl = senderTab.url.split("?filter=unread")[0];
    await new Promise((resolve) => {
      chrome.tabs.update(senderTab.id, { url: updatedUrl }, async () => {
        console.log("🔄 Waiting for LinkedIn to reload to messages tab...");
        await wait(400);
        if (!classificationInProgress) {
          console.log("Classification canceled during messages reload.");
          resolve();
          return;
        }
        chrome.tabs.query(
          { active: true, currentWindow: true },
          async (tabs) => {
            if (!tabs || tabs.length === 0) {
              console.error("❌ No active tab found.");
              resolve();
              return;
            }
            const activeTab = tabs[0];
            console.log("📌 Active tab after re-navigation:", activeTab);
            // Show loading overlay for classification
            await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: (text) => {
                if (!document.getElementById("loading-overlay")) {
                  const loader = document.createElement("div");
                  loader.id = "loading-overlay";
                  loader.innerHTML = `
                  <div class="loading-spinner"></div>
                  <p class="loading-text">${text}</p>
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
              },
              args: ["Applying classifications..."],
            });
            try {
              await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ["content2.js"],
              });
              console.log("✅ content2.js injected successfully.");
              await wait(2000);
              if (!classificationInProgress) {
                console.log(
                  "Classification canceled before sending mapped data."
                );
                resolve();
                return;
              }
              await chrome.tabs.sendMessage(activeTab.id, {
                type: "mapData",
                data: mappedData,
              });
              console.log("📨 Mapped data sent successfully.");
              await wait(5000);
              // Hide loading overlay
              await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => {
                  const loader = document.getElementById("loading-overlay");
                  if (loader) {
                    loader.style.opacity = "0";
                    setTimeout(() => loader.remove(), 500);
                  }
                },
              });
            } catch (error) {
              console.error("❌ Error applying classifications:", error);
            }
            resolve();
          }
        );
      });
    });
  } catch (error) {
    console.error("❌ Error in classification process:", error);
  }
}

function cancelClassification(tab) {
  console.log("⛔ Canceling classification process.");
  classificationInProgress = false;
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: "cancelClassification" });
  }
}

function clearClassifications(tab) {
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: "clearClassifiedMessages" });
  }
}

export { startClassification, cancelClassification, clearClassifications };
