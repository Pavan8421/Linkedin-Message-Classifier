// background.js (Coordinator)
// This file coordinates extraction and classification processes.
// It uses ES modules to import functions from extractionManager.js and classificationManager.js.
console.log("Background script running.");
import {
  startExtraction,
  cancelExtraction,
  showNoUnreadPopup,
} from "./extractionManager.js";

import {
  startClassification,
  cancelClassification,
  clearClassifications,
} from "./classificationManager.js";

// Flags to track if extraction or classification is currently running
let extractionRunning = false;
let classificationRunning = false;

// Called when user clicks the extension icon in the toolbar
chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon clicked.");
  if (tab.url && tab.url.includes("linkedin.com/messaging")) {
    extractionRunning = true;
    startExtraction(tab);
  } else {
    console.log("❌ This extension only works on LinkedIn messaging.");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    // (1) After content.js finishes extraction, it sends "storeChats"
    case "storeChats": {
      console.log("Chat data received:", message.data);

      // Confirm we're on a LinkedIn messaging tab
      if (sender.tab && sender.tab.url.includes("linkedin.com/messaging")) {
        // Extraction has finished
        extractionRunning = false;

        // If no chats, remove "?filter=unread" and show "no unread" popup
        if (!message.data || message.data.length === 0) {
          const updatedUrl = sender.tab.url.split("?filter=unread")[0];
          chrome.tabs.update(sender.tab.id, { url: updatedUrl }, () => {
            console.log("No unread messages found.");
            setTimeout(() => {
              showNoUnreadPopup(sender.tab.id);
            }, 3000);
          });
        }
        // Otherwise, start classification
        else {
          classificationRunning = true;
          startClassification(message.data, sender.tab);
        }
      } else {
        console.log("Extension works only on LinkedIn messaging tab.");
      }
      break;
    }

    // (2) "Start Classification" button from popup
    case "startClassification": {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.url.includes("linkedin.com/messaging")) {
          extractionRunning = true;
          startExtraction(activeTab);
        } else {
          console.log("❌ This extension only works on LinkedIn messaging.");
        }
      });
      break;
    }

    // (3) "Cancel" button from popup
    case "cancelClassification": {
      console.log("Cancel message received.");

      // If neither extraction nor classification is running, ignore
      if (!extractionRunning && !classificationRunning) {
        console.log("Cancel action ignored because nothing is running.");
        sendResponse({ status: "nothing to cancel" });
        return true;
      }

      // Otherwise, proceed to cancel
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.url.includes("linkedin.com/messaging")) {
          cancelExtraction(activeTab);
          cancelClassification(activeTab);
          extractionRunning = false;
          classificationRunning = false;
        } else {
          console.log("Cancel can only be used in LinkedIn messaging tab.");
        }
      });
      sendResponse({ status: "canceled" });
      return true;
    }

    // (4) "Clear Messages" button from popup
    case "clearClassifiedMessages": {
      console.log("Clear classified messages requested.");
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.url.includes("linkedin.com/messaging")) {
          clearClassifications(activeTab);
        } else {
          console.log("Clear can only be used in LinkedIn messaging tab.");
        }
      });
      sendResponse({ status: "cleared" });
      return true;
    }

    default:
      break;
  }
});
