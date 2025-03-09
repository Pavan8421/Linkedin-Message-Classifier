// content.js - Extraction script for LinkedIn unread chats

// Global cancellation flag for content.js
let classificationCanceled = false;

function showLoadingSpinner() {
  if (document.getElementById("loading-overlay")) return; // Avoid duplicate loaders
  const loader = document.createElement("div");
  loader.id = "loading-overlay";
  loader.innerHTML = `
    <div class="loading-spinner"></div>
    <p class="loading-text">Processing chats...</p>
  `;
  document.body.appendChild(loader);
}

function injectLoaderStyles() {
  if (document.getElementById("loader-styles")) return;
  const style = document.createElement("style");
  style.id = "loader-styles";
  style.innerHTML = `
    /* Loader Styles */
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
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 1px;
      text-align: center;
      color: rgb(20, 153, 255);
      text-shadow: 0px 0px 10px rgba(20, 114, 255, 0.8),
                   0px 0px 20px rgba(20, 200, 255, 0.5);
      opacity: 0.9;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// Initialize loader styles and display spinner immediately
injectLoaderStyles();
showLoadingSpinner();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  console.log("📌 content.js running on Chrome...");
  if (classificationCanceled) return;

  // Step 1: Scroll to load all unread chats
  await autoScrollList();
  if (classificationCanceled) return;

  // Step 2: Select unread chats
  const chatList = document.querySelectorAll(
    ".msg-conversation-listitem.msg-conversations-container__convo-item"
  );
  if (classificationCanceled) return;

  if (!chatList || chatList.length === 0) {
    console.warn("⚠️ No unread chats found.");
    chrome.runtime.sendMessage({ type: "storeChats", data: [] });
    return;
  }
  console.log(`📩 Found ${chatList.length} unread chats.`);

  // Step 3: Extract unread chat data
  const chatData = [];
  for (let i = 0; i < chatList.length; i++) {
    if (classificationCanceled) break;
    await processSingleChat(chatList[i], chatData);
  }
  if (classificationCanceled) return;

  console.log("✅ Chat Data Extracted:", chatData);
  chrome.runtime.sendMessage({ type: "storeChats", data: chatData });
})();

async function autoScrollList() {
  const listElement = document.querySelector(
    ".msg-conversations-container__conversations-list"
  );
  if (!listElement) {
    console.error("❌ Chat list container not found!");
    return;
  }
  console.log("🔄 Scrolling to load all unread chats...");
  function scrollStep() {
    listElement.scrollBy(0, 10);
    if (
      listElement.scrollTop + listElement.clientHeight <
      listElement.scrollHeight
    ) {
      requestAnimationFrame(scrollStep);
    } else {
      console.log("✅ No more unread chats to load.");
    }
  }
  scrollStep();
  await wait(3000);
}

async function processSingleChat(chat, chatData) {
  try {
    console.log("🔍 Processing chat...");
    const usernameElement = chat.querySelector(
      ".msg-conversation-listitem__participant-names span.truncate"
    );
    const username = usernameElement ? usernameElement.innerText.trim() : null;
    const notificationBadge = chat.querySelector(
      ".msg-conversation-card__unread-count .notification-badge__count"
    );
    const unreadCount = notificationBadge
      ? parseInt(notificationBadge.innerText.trim())
      : 0;

    if (!username) {
      console.warn("⚠️ Username missing for a chat.");
      return;
    }

    console.log(`📩 Clicking on chat with ${username}...`);
    const clickable = chat.querySelector(
      ".msg-conversation-card__content--selectable"
    );
    if (clickable) {
      clickable.click();
    } else {
      console.error("❌ Clickable element not found!");
      return;
    }
    await wait(3000);
    if (classificationCanceled) return;

    const listElement = document.querySelector("#message-list-ember3");
    if (listElement) {
      await scrollChatListToLoadUnreadMessages(listElement, unreadCount);
    } else {
      console.error("❌ Message list container not found!");
      return;
    }

    const messageElements = listElement.querySelectorAll(
      "li.msg-s-message-list__event p.msg-s-event-listitem__body"
    );
    const messages = Array.from(messageElements).map((msg) =>
      msg.innerText.trim()
    );
    const unreadMessages = unreadCount > 0 ? messages.slice(-unreadCount) : [];

    console.log(
      `✅ Extracted ${unreadMessages.length} unread messages for ${username}`
    );
    if (unreadMessages.length > 0) {
      chatData.push({ username, unreadMessages });
    }
  } catch (error) {
    console.error("❌ Error processing chat:", error);
  }
}

async function scrollChatListToLoadUnreadMessages(listElement, unreadCount) {
  if (!listElement) {
    console.error("❌ Message list container not found!");
    return;
  }
  let remainingUnread = unreadCount;
  let lastMessageCount = 0;
  let retries = 20;

  console.log(`🔄 Initial unread messages: ${unreadCount}`);

  async function scrollUpStep() {
    listElement.scrollBy(0, -10);
    if (remainingUnread > 0) {
      await wait(10);
      if (!classificationCanceled) await scrollUpStep();
    }
  }

  while (remainingUnread > 0 && retries > 0) {
    const messageElements = listElement.querySelectorAll(
      "li.msg-s-message-list__event"
    );
    const loadedMessages = messageElements.length;
    remainingUnread = Math.max(0, unreadCount - loadedMessages);

    console.log(
      `🔍 Messages found: ${loadedMessages}, Remaining unread: ${remainingUnread}`
    );
    if (remainingUnread === 0) {
      console.log(`✅ All ${unreadCount} unread messages loaded.`);
      break;
    }
    await scrollUpStep();
    await wait(2000);
    const newMessageCount = listElement.querySelectorAll(
      "li.msg-s-message-list__event"
    ).length;
    if (newMessageCount === lastMessageCount) {
      console.log("⚠️ No new messages detected. Adjusting scroll...");
      listElement.scrollTop -= 50;
      await wait(500);
      listElement.scrollTop += 50;
      await wait(500);
      listElement.dispatchEvent(new Event("scroll", { bubbles: true }));
    }
    lastMessageCount = newMessageCount;
    retries--;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "cancelClassification") {
    console.log("⛔ Received cancelClassification in content.js.");
    classificationCanceled = true;
    const loader = document.getElementById("loading-overlay");
    if (loader) loader.remove();
    sendResponse({ status: "canceled in content.js" });
  }
});
