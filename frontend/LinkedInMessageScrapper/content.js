// ✅ Helper function to delay execution
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  console.log("Content script running!");

  // ✅ Step 1: Scroll to load all unread chats
  await autoScrollList();

  // ✅ Step 2: Select all chat list items after scrolling
  let chatList = document.querySelectorAll(
    ".msg-conversation-listitem.msg-conversations-container__convo-item"
  );

  if (!chatList.length) {
    console.error("No unread chats found.");
    return;
  }

  console.log(`📩 Found ${chatList.length} unread chats.`);

  // ✅ Step 3: Process each chat
  const chatData = [];
  for (const chat of chatList) {
    await processSingleChat(chat, chatData);
  }

  console.log("✅ Chat Data Extracted:", chatData);
  chrome.runtime.sendMessage({ type: "storeChats", data: chatData });
})();

// ✅ Function 1: Automated Scrolling to Load Unread Chats
async function autoScrollList() {
    const listElement = document.querySelector(".list-style-none.msg-conversations-container__conversations-list");

    if (!listElement) {
        console.error("❌ Chat list container not found!");
        return;
    }

    console.log("🔄 Scrolling to load all unread chats...");

    function scrollStep() {
        listElement.scrollBy(0, 10); // Scroll down 10px

        // Check if the list is fully scrolled
        if (listElement.scrollTop + listElement.clientHeight < listElement.scrollHeight) {
            requestAnimationFrame(scrollStep); // Continue scrolling
        } else {
            console.log("✅ No more unread chats to load.");
        }
    }

    scrollStep(); // Start scrolling

    // ✅ Wait for UI to process scrolling before proceeding
    await wait(3000);
}

// ✅ Function 2: Process a Single Chat
async function processSingleChat(chat, chatData) {
  try {
    console.log("🔍 Processing chat...");

    // Extract username
    const username = chat.querySelector(
      ".msg-conversation-listitem__participant-names span.truncate"
    )?.innerText.trim();

    // Extract unread message count
    const notificationBadge = chat.querySelector(".msg-conversation-card__unread-count .notification-badge__count");
    let unreadCount = notificationBadge ? parseInt(notificationBadge.innerText.trim()) : 0;
    console.log(`🔹 Unread count detected for ${username}:`, unreadCount);

    if (!username) {
      console.warn("⚠️ Username missing for a chat.");
      return;
    }

    console.log(`📩 Clicking on chat with ${username}.`);

    // ✅ Click the chat to open it
    const clickableUsername = chat.querySelector(".msg-conversation-card__content--selectable");
    clickableUsername.click();

    // ✅ Wait for messages to load
    await wait(3000);

// ✅ Step 3: Scroll up to load ALL unread messages
const listElement = document.querySelector("#message-list-ember3");

if (listElement) {
    await scrollChatListToLoadUnreadMessages(listElement, unreadCount);
} else {
    console.error("❌ Message list container not found!");
    return;
}

// ✅ Step 4: Extract messages after improved scrolling
let messageElements = listElement.querySelectorAll("li.msg-s-message-list__event p.msg-s-event-listitem__body");
let messages = Array.from(messageElements).map((msg) => msg.innerText.trim());

let notificationMessages = unreadCount > 0 ? messages.slice(-unreadCount) : [];

console.log(`✅ Extracted unread messages for ${username}:`, notificationMessages.length);

    // ✅ Step 5: Store chat data
    if (notificationMessages.length > 0) {
      chatData.push({ username, notificationMessages });
    } else {
      console.log(`🔹 No unread messages found for ${username}.`);
    }
  } catch (error) {
    console.error("❌ Error processing chat:", error);
  }
}

async function scrollChatListToLoadUnreadMessages(listElement,unreadCount) {
  

  if (!listElement) {
      console.error("❌ Message list container not found!");
      return;
  }

  let remainingUnread = unreadCount; // Track unread messages left
  let lastMessageCount = 0;
  let retries = 20; // Allow deep scrolling attempts

  console.log(`🔄 Initial unread messages: ${unreadCount}`);

  function scrollUpStep() {
      listElement.scrollBy(0, -10); // Scroll up 10px

      // Continue scrolling if there are unread messages left
      if (remainingUnread > 0) {
          requestAnimationFrame(scrollUpStep);
      }
  }

  while (remainingUnread > 0 && retries > 0) {
      let messageElements = listElement.querySelectorAll("li.msg-s-message-list__event");
      let loadedMessages = messageElements.length;
      remainingUnread = Math.max(0, unreadCount - loadedMessages); // Recalculate remaining unread

      console.log(`🔍 Messages found: ${loadedMessages}, Remaining unread: ${remainingUnread}`);

      if (remainingUnread === 0) {
          console.log(`✅ All ${unreadCount} unread messages loaded.`);
          break;
      }

      // ✅ Start scrolling up to load more messages
      scrollUpStep();
      await wait(2000); // Allow UI to load new messages

      let newMessageCount = listElement.querySelectorAll("li.msg-s-message-list__event").length;

      if (newMessageCount === lastMessageCount) {
          console.log("⚠️ No new messages detected. Triggering small extra scroll...");
          listElement.scrollTop -= 50;  
          await wait(500);
          listElement.scrollTop += 50;  
          await wait(500);
          listElement.dispatchEvent(new Event('scroll', { bubbles: true }));
      }

      lastMessageCount = newMessageCount;
      retries--;
  }

}
