// content2.js - Classification script for applying labels to chats
console.log("📌 content2.js loaded");

let classificationCanceled = false;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function showLoadingSpinner() {
  if (document.getElementById("loading-overlay")) return;
  const loader = document.createElement("div");
  loader.id = "loading-overlay";
  loader.innerHTML = `
    <div class="loading-spinner"></div>
    <p class="loading-text">Applying classifications...</p>
  `;
  document.body.appendChild(loader);
}

function hideLoadingSpinner() {
  const loader = document.getElementById("loading-overlay");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 500);
  }
}

async function injectExternalStyles() {
  return new Promise((resolve, reject) => {
    try {
      const cssUrl = chrome.runtime.getURL("styles.css");
      if (!document.querySelector(`link[href="${cssUrl}"]`)) {
        const linkElement = document.createElement("link");
        linkElement.rel = "stylesheet";
        linkElement.type = "text/css";
        linkElement.href = cssUrl;
        linkElement.onload = () => {
          console.log("✅ External styles injected successfully");
          resolve();
        };
        linkElement.onerror = (error) => {
          console.error("❌ Error injecting external styles:", error);
          reject(error);
        };
        document.head.appendChild(linkElement);
      } else {
        console.log("ℹ️ Styles already exist, proceeding...");
        resolve();
      }
    } catch (error) {
      console.error("❌ Error injecting external styles:", error);
      reject(error);
    }
  });
}

function applyCategoryStyle(element, category) {
  try {
    const categories = [
      "referral",
      "opportunity",
      "meeting_request",
      "thanks",
      "general",
      "other",
      "error",
      "networking",
      "feedback",
      "acknowledgment",
      "marketing",
      "event",
      "collaboration",
      "greeting",
    ];
    element.classList.remove(...categories);
    element.classList.add(category.toLowerCase());
    let badge = element.querySelector(".category-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "category-badge";
      badge.style.cssText = `
        position: absolute;
        right: 20px;
        top: 5px;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        background-color: rgba(255, 255, 255, 0.9);
        color: black;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      element.style.position = "relative";
      element.appendChild(badge);
    }
    badge.textContent = category;
  } catch (error) {
    console.error("❌ Error applying category style:", error);
  }
}

async function processChats(mappedData) {
  console.log("🎨 Applying classifications...");
  const chatList = document.querySelectorAll(
    ".msg-conversation-listitem.msg-conversations-container__convo-item"
  );
  if (!chatList.length) {
    console.error("❌ No chat elements found");
    hideLoadingSpinner();
    return;
  }
  for (const chat of chatList) {
    if (classificationCanceled) {
      hideLoadingSpinner();
      console.log("Classification canceled during processing chats.");
      return;
    }
    const username = chat
      .querySelector(
        ".msg-conversation-listitem__participant-names span.truncate"
      )
      ?.innerText.trim();
    if (username && mappedData[username]) {
      const category = mappedData[username] || "general";
      console.log(`✅ Applying category "${category}" to "${username}"`);
      applyCategoryStyle(chat, category);
    }
    await wait(10);
  }
  hideLoadingSpinner();
  showClassificationSuccessPopup();
}

function showClassificationSuccessPopup() {
  const popup = document.createElement("div");
  popup.id = "classification-success";
  popup.innerHTML = "✅ Classification Successful!";
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #28a745;
    color: white;
    padding: 15px 25px;
    font-size: 18px;
    font-weight: bold;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    opacity: 1;
    z-index: 9999;
    animation: fadeOut 3s ease-in-out forwards;
  `;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 3000);
}

function clearClassificationLabels() {
  const chatList = document.querySelectorAll(
    ".msg-conversation-listitem.msg-conversations-container__convo-item"
  );
  const classificationClasses = [
    "referral",
    "opportunity",
    "meeting_request",
    "thanks",
    "general",
    "other",
    "error",
    "networking",
    "feedback",
    "acknowledgment",
    "marketing",
    "event",
    "collaboration",
    "greeting",
  ];
  chatList.forEach((chat) => {
    chat.classList.remove(...classificationClasses);
    const badge = chat.querySelector(".category-badge");
    if (badge) {
      badge.remove();
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "mapData") {
    if (classificationCanceled) {
      console.log("Classification process was canceled, ignoring mapData.");
      return;
    }
    console.log("📩 Mapped Data received:", message.data);
    showLoadingSpinner();
    processChats(message.data);
  } else if (message.type === "cancelClassification") {
    console.log("⛔ Received cancelClassification in content2.js.");
    classificationCanceled = true;
    hideLoadingSpinner();
    sendResponse({ status: "canceled in content2" });
  } else if (message.type === "clearClassifiedMessages") {
    console.log("🗑️ Received clear classified messages in content2.js.");
    clearClassificationLabels();
    sendResponse({ status: "cleared" });
  }
});

injectExternalStyles().then(() =>
  console.log("🎨 Styles initialized successfully")
);
