console.log("Background script running!");

// Helper function to delay execution
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  console.log("Extension clicked on tab:", tab);

  if (tab.url && tab.url.includes("linkedin.com/messaging")) {
    const updatedUrl = tab.url.includes("?filter=unread")
      ? tab.url
      : tab.url + "?filter=unread";

    chrome.tabs.update(tab.id, { url: updatedUrl }, () => {
      console.log("Updated URL:", updatedUrl);

      const listener = async (tabId, changeInfo, updatedTab) => {
        if (tabId === tab.id && changeInfo.status === "complete" && updatedTab.url === updatedUrl) {
          console.log("Tab finished loading. Waiting before injecting content script...");
          await wait(10000);

          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content.js"],
            });
            console.log("Content script injected successfully");
          } catch (error) {
            console.error("Error injecting content script:", error);
          }

          chrome.tabs.onUpdated.removeListener(listener);
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  } else {
    console.log("This extension only works on LinkedIn messaging.");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "storeChats") {
    const chatData = message.data;
    console.log("Chat Data received from content.js:", chatData);

    // Process the chatData and handle the page update
    handleChatData(chatData, sender.tab);
  }
});

async function handleChatData(chatData, senderTab) {
  try {
    // Process chat data
    const mappedData = await processChatData(chatData);
    console.log("Mapped Data:", mappedData);

    // Update URL and inject second content script
    const updatedUrl = senderTab.url.split("?filter=unread")[0];
    
    // Update tab URL and wait for completion
    await new Promise((resolve) => {
      chrome.tabs.update(senderTab.id, { url: updatedUrl }, async () => {
        // Wait for page load
        await wait(10000);

        try {
          // Get the active tab 
          const tabs = await chrome.tabs.query({active: true, currentWindow: true});
          const activeTab = tabs[0];
          console.log("Active tab:", activeTab);

          // Inject content2.js
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ["content2.js"]
          });
          console.log("Content2.js injected successfully");

          // Wait for content script to initialize
          await wait(2000);

          // Send mapped data to content2.js
          await chrome.tabs.sendMessage(activeTab.id, {
            type: "mapData",
            data: mappedData
          });
          console.log("Mapped data sent successfully");
        } catch (error) {
          console.error("Error in script injection or message sending:", error);
        }

        resolve();
      });
    });
  } catch (error) {
    console.error("Error in handleChatData:", error);
  }
}

async function processChatData(chatData) {
  const mappedData = {};

  for (const chat of chatData) {
    const { username, notificationMessages } = chat;
    console.log(username);
    console.log(notificationMessages);
    if (username && notificationMessages && notificationMessages.length > 0) {
      try {
        const messagesString = notificationMessages.join(",");
        const response = await fetch("http://127.0.0.1:8000/api/classify/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: messagesString }),
        });

        if (response.ok) {
          const data = await response.json();
          mappedData[username] = data.predicted_category;
        } else {
          console.error("API Error:", response.statusText);
          mappedData[username] = "general";
        }
      } catch (error) {
        console.error("Error processing chat:", username, error);
        mappedData[username] = "general";
      }
    } else {
      console.log("not called api");
      mappedData[username] = "general";
    }
  }

  return mappedData;
}