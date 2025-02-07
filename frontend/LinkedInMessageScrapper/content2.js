// Helper function to delay execution
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to inject external CSS file
async function injectExternalStyles() {
  try {
    const cssUrl = chrome.runtime.getURL('styles.css');
    if (!document.querySelector(`link[href="${cssUrl}"]`)) {
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.type = 'text/css';
      linkElement.href = cssUrl;
      document.head.appendChild(linkElement);
      console.log('External styles injected successfully');
    }
  } catch (error) {
    console.error('Error injecting external styles:', error);
  }
}

// Function to apply category styling and indicator
function applyCategoryStyle(element, category) {
  try {
    // Add category class
    element.classList.add(category.toLowerCase());
    
    // Add category indicator badge
    let badge = element.querySelector('.category-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'category-badge';
      badge.style.cssText = `
        position: absolute;
        right: 10px;
        top: 10px;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        background-color: rgba(255, 255, 255, 0.9);
        color: black;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      element.style.position = 'relative';
      element.appendChild(badge);
    }
    badge.textContent = category;
  } catch (error) {
    console.error('Error applying category style:', error);
  }
}

// Helper function to wait for chat list to load
async function waitForChatList(maxRetries = 10, interval = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    const chatList = document.querySelectorAll(
      ".msg-conversation-listitem.msg-conversations-container__convo-item"
    );
    if (chatList.length > 0) return chatList;
    await wait(interval);
  }
  console.log('Chat list not found after maximum retries');
  return [];
}

// Main function to process chats
async function processChats(mappedData) {
  try {
    await injectExternalStyles();
    
    const chatList = await waitForChatList();
    if (!chatList.length) {
      console.error('No chat elements found');
      return;
    }

    const reqChats = chatList;
    
    reqChats.forEach(chat => {
      const username = chat.querySelector(
        ".msg-conversation-listitem__participant-names span.truncate"
      )?.innerText.trim();

      if (mappedData[username]) {
        // Remove any existing category classes
        const categories = ['referral', 'opportunity', 'meeting_request', 'thanks', 
                          'general', 'other', 'error', 'networking', 'feedback', 
                          'acknowledgment', 'marketing', 'event', 'collaboration', 'greeting'];
        chat.classList.remove(...categories);
        
        // Add new category
        const category = mappedData[username] || "general";
        console.log(`Applying category ${category} to ${username}`);
        applyCategoryStyle(chat, category);
      }
    });
  } catch (error) {
    console.error('Error processing chats:', error);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "mapData") {
    const mappedData = message.data;
    console.log("Mapped Data received from background script:", mappedData);

    // Process the data with a small delay to ensure DOM is ready
    wait(2000).then(() => processChats(mappedData));
  }
});

// Initialize styles when script loads
injectExternalStyles();