(async () => {
  console.log("Content script running!");

  // Select all chat list items
  const chatList = document.querySelectorAll(
    ".msg-conversation-listitem.msg-conversations-container__convo-item"
  );

  if (!chatList || chatList.length === 0) {
    console.error("No chats found on the page.");
    return;
  }

  console.log(`Found ${chatList.length} chats. Retrieving top 10...`);

  // Limit to the top 10 chats
  const topChats = Array.from(chatList).slice(0, 10);

  // Store results
  const chatData = [];

  // Iterate over each chat
  for (const chat of topChats) {
    try {
      // Extract the username
      console.log(chat)
      console.log(typeof chat);

      if (chat instanceof Element) {
        console.log('v1 is a DOM element');
        chat.click(); // Safe to call
      } else {
        console.log('v1 is not a DOM element');
      }
      
      const username = chat.querySelector(
        ".msg-conversation-listitem__participant-names span.truncate"
      )?.innerText.trim();

      // Extract the last message
      const lastMessage = chat.querySelector(
        ".msg-conversation-card__message-snippet"
      )?.innerText.trim();

      // Extract the notification count
      const notificationCount = chat.querySelector(
        ".msg-conversation-card__unread-count .notification-badge__count"
      )?.innerText.trim();

      if (username && lastMessage) {
        console.log(
          `Extracted: Username: ${username}, Last Message: ${lastMessage}, Notification Count: ${notificationCount || "0"}`
        );

        // Click the chat to open the conversation
        const clickableUsername = chat.querySelector(".msg-conversation-card__content--selectable")
        clickableUsername.click();
        console.log(`Clicked on chat with ${username}.`);

        // Wait for the messages to load
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Extract all messages from the chat
        const messageList = document.querySelectorAll(
          '#message-list-ember3 ul.msg-s-message-list-content li.msg-s-message-list__event p.msg-s-event-listitem__body'
        );

        const messages = Array.from(messageList).map((message) =>
          message.innerText.trim()
        );
        const notificationMessages = messages.slice(-notificationCount);

        console.log(`Extracted messages for ${username}:`, messages);

        // Add data to chatData array
        chatData.push({
          username,
          lastMessage,
          notificationCount: notificationCount || "0",
          notificationMessages,
        });
      } else {
        console.warn("Some data is missing for a chat.");
      }
    } catch (error) { 
      console.error("Error processing chat:", error);
    }
  }

  // Log or store the extracted chat data
  console.log("Chat Data Extracted:", chatData);

  // Optionally send the data to the background script for further processing
  chrome.runtime.sendMessage({ type: "storeChats", data: chatData });

})();
