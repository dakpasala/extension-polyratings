// ==================== AGENT POPUP ====================
function openAgentPopup(button) {
  button.textContent = "Active Agent";
  button.style.background = "linear-gradient(135deg, #4CAF50, #45a049)";
  button.style.color = "#fff";

  const popup = document.createElement("div");
  popup.className = CSS_CLASSES.AGENT_POPUP;
  popup.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.5); z-index: 10000; display: flex;
    align-items: center; justify-content: center; animation: fadeIn 0.3s ease-out;
  `;

  const chatContainer = document.createElement("div");
  chatContainer.style.cssText = `
    background: white; border-radius: 16px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    width: 400px; max-width: 90vw; height: 500px; max-height: 80vh;
    display: flex; flex-direction: column; overflow: hidden; position: relative;
    animation: slideUp 0.4s ease-out;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    background: linear-gradient(135deg, #FFD700, #FFA500); color: #000;
    padding: 16px 20px; font-weight: 600; font-size: 16px;
    display: flex; align-items: center; justify-content: space-between;
  `;
  header.innerHTML = `
    <span>🤖 PolyRatings Agent</span>
    <button class="close-agent-btn" style="
      background: none; border: none; font-size: 20px; cursor: pointer;
      color: #000; padding: 0; width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
    ">×</button>
  `;

  const messagesArea = document.createElement("div");
  messagesArea.className = "agent-messages";
  messagesArea.style.cssText =
    "flex: 1; padding: 20px; overflow-y: auto; background: #f8f9fa;";

  const welcomeMessage = document.createElement("div");
  welcomeMessage.style.cssText = `
    background: white; padding: 16px; border-radius: 12px;
    margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-left: 4px solid #FFD700;
  `;
  welcomeMessage.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px; color: #333;">👋 Hi! I'm your PolyRatings Agent</div>
    <div style="color: #666; font-size: 14px; line-height: 1.4;">
      I can help you analyze professor ratings, compare courses, and answer questions about your schedule.
      <br><br>
      <strong>🎓 I'll be able to select courses for you super soon!</strong> Stay tuned for this exciting feature!
    </div>
  `;
  messagesArea.appendChild(welcomeMessage);

  const inputArea = document.createElement("div");
  inputArea.style.cssText =
    "padding: 16px 20px; background: white; border-top: 1px solid #e0e0e0; display: flex; gap: 12px;";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ask me anything about professors or courses...";
  input.style.cssText = `
    flex: 1; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 24px;
    font-size: 14px; outline: none; transition: border-color 0.2s;
  `;

  const sendBtn = document.createElement("button");
  sendBtn.textContent = "Send";
  sendBtn.style.cssText = `
    background: linear-gradient(135deg, #FFD700, #FFA500); color: #000;
    border: none; border-radius: 24px; padding: 12px 20px;
    font-weight: 600; cursor: pointer; transition: transform 0.2s;
  `;

  header
    .querySelector(".close-agent-btn")
    .addEventListener("click", closeAgentPopup);
  sendBtn.addEventListener("click", () => {
    const message = input.value.trim();
    if (message) {
      addUserMessage(messagesArea, message);
      input.value = "";
      const typingId = addTypingMessage(messagesArea);
      chrome.runtime.sendMessage(
        { type: "chatbotQuery", query: message },
        (response) => {
          const typingElement = document.getElementById(typingId);
          if (typingElement) typingElement.remove();

          if (response?.status === "success") {
            addBotMessage(messagesArea, response.professor.analysis);
          } else if (response?.status === "ai_analysis") {
            addBotMessage(messagesArea, response.professor.analysis);
          } else if (response?.status === "general_response") {
            addBotMessage(messagesArea, response.message);
          } else {
            addBotMessage(
              messagesArea,
              "❌ Sorry, I couldn't process your request. Please try again."
            );
          }
        }
      );
    }
  });
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });

  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);
  chatContainer.appendChild(header);
  chatContainer.appendChild(messagesArea);
  chatContainer.appendChild(inputArea);
  popup.appendChild(chatContainer);
  document.body.appendChild(popup);
  setTimeout(() => input.focus(), 100);

  if (!document.querySelector("#agent-popup-styles")) {
    const style = document.createElement("style");
    style.id = "agent-popup-styles";
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .agent-popup input:focus { border-color: #FFD700 !important; }
      .agent-popup button:hover { transform: translateY(-1px); }
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }
}

function closeAgentPopup() {
  const popup = document.querySelector(`.${CSS_CLASSES.AGENT_POPUP}`);
  if (popup) popup.remove();
  const button = document.querySelector(`.${CSS_CLASSES.ASK_AGENT_BTN}`);
  if (button) {
    button.textContent = "Ask Agent";
    button.style.background = "linear-gradient(135deg, #FFD700, #FFA500)";
    button.style.color = "#000";
  }
}

function addUserMessage(container, message) {
  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `
    background: linear-gradient(135deg, #FFD700, #FFA500); color: #000;
    padding: 12px 16px; border-radius: 18px 18px 4px 18px;
    margin-bottom: 12px; margin-left: 40px; font-size: 14px;
    word-wrap: break-word; animation: slideInRight 0.3s ease-out;
  `;
  messageDiv.textContent = message;
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

function convertLinksToHTML(text) {
  if (!text || typeof text !== "string") return text;
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return escapedText.replace(urlRegex, (url) => {
    let displayText = url;
    if (url.includes("polyratings.dev/professor/"))
      displayText = "View full profile →";
    else if (url.includes("polyratings.dev/new-professor"))
      displayText = "Add to PolyRatings →";
    else if (url.length > 50) displayText = url.substring(0, 47) + "...";
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="
      color: #1976d2; text-decoration: none; font-weight: 600;
      background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
      padding: 4px 8px; border-radius: 6px; border: 1px solid #1976d2;
      display: inline-block; margin: 2px 0; transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(25, 118, 210, 0.2);
    " onmouseover="this.style.background='linear-gradient(135deg, #1976d2, #7b1fa2)'; this.style.color='white'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 6px rgba(25, 118, 210, 0.4)';" onmouseout="this.style.background='linear-gradient(135deg, #e3f2fd, #f3e5f5)'; this.style.color='#1976d2'; this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(25, 118, 210, 0.2)';">
      ${displayText}
    </a>`;
  });
}

function addBotMessage(container, message) {
  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `
    background: white; color: #333; padding: 12px 16px;
    border-radius: 18px 18px 18px 4px; margin-bottom: 12px;
    margin-right: 40px; font-size: 14px; word-wrap: break-word;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    animation: slideInLeft 0.3s ease-out; line-height: 1.5;
  `;
  messageDiv.innerHTML = convertLinksToHTML(message);
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

function addTypingMessage(container) {
  const typingId = "typing-" + Date.now();
  const messageDiv = document.createElement("div");
  messageDiv.id = typingId;
  messageDiv.style.cssText = `
    background: white; color: #666; padding: 12px 16px;
    border-radius: 18px 18px 18px 4px; margin-bottom: 12px;
    margin-right: 40px; font-size: 14px; font-style: italic;
    display: flex; align-items: center; gap: 8px;
  `;
  messageDiv.innerHTML = `
    <span>🤖 Agent is typing</span>
    <div class="typing-dots" style="display: flex; gap: 2px;">
      <div style="width: 4px; height: 4px; background: #666; border-radius: 50%; animation: typing 1.4s infinite ease-in-out;"></div>
      <div style="width: 4px; height: 4px; background: #666; border-radius: 50%; animation: typing 1.4s infinite ease-in-out 0.2s;"></div>
      <div style="width: 4px; height: 4px; background: #666; border-radius: 50%; animation: typing 1.4s infinite ease-in-out 0.4s;"></div>
    </div>
  `;
  if (!document.querySelector("#typing-animation-styles")) {
    const style = document.createElement("style");
    style.id = "typing-animation-styles";
    style.textContent = `
      @keyframes typing {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-10px); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
  return typingId;
}

function injectAskAgentButton() {
  // Always allow agent button, just check if it should be enabled
  if (!shouldEnableAgent(document)) {
    console.log("🚫 Agent button not enabled on this page");
    return;
  }
  if (document.querySelector(`.${CSS_CLASSES.ASK_AGENT_BTN}`)) {
    console.log("✅ Agent button already exists");
    return;
  }

  console.log("🔍 Attempting to inject Ask Agent button...");

  // First, try to find "Delete Selected" button on course selection page
  let deleteButton = null;
  let allButtons = document.querySelectorAll("button");
  console.log(`📋 Found ${allButtons.length} buttons on page`);
  
  allButtons.forEach((button) => {
    const text = button.textContent.trim();
    console.log(`   Button text: "${text}"`);
    if (text === "Delete Selected" || text.includes("Delete") || text.toLowerCase().includes("delete selected")) {
      deleteButton = button;
      console.log(`✅ Found matching button: "${text}"`);
    }
  });

  if (deleteButton) {
    // Found Delete Selected button - inject to its left
    const buttonContainer = deleteButton.parentElement;
    if (buttonContainer) {
      const askAgentButton = document.createElement("button");
      askAgentButton.className = CSS_CLASSES.ASK_AGENT_BTN;
      askAgentButton.textContent = "Ask Agent";
      askAgentButton.style.cssText = `
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #000; border: none; border-radius: 4px;
        padding: 8px 16px; font-size: 14px; font-weight: 600;
        cursor: pointer; margin-right: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.2s ease; display: inline-flex;
        align-items: center; gap: 6px;
      `;
      askAgentButton.addEventListener("mouseenter", () => {
        askAgentButton.style.transform = "translateY(-1px)";
        askAgentButton.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
      });
      askAgentButton.addEventListener("mouseleave", () => {
        askAgentButton.style.transform = "translateY(0)";
        askAgentButton.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
      });
      askAgentButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (document.querySelector(`.${CSS_CLASSES.AGENT_POPUP}`)) {
          closeAgentPopup();
        } else {
          openAgentPopup(askAgentButton);
        }
      });
      buttonContainer.insertBefore(askAgentButton, deleteButton);
      console.log("✅ Agent button injected next to Delete Selected");
      return;
    }
  }

  console.log("⚠️ Delete Selected button not found, trying fallback...");

  // Fallback: Look for dialog buttons (Cancel, OK, Submit)
  const buttonSelectors = [
    'button[type="button"]',
    ".MuiButton-root",
    "button",
    '[role="button"]',
  ];
  let foundButtons = [];
  buttonSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((button) => {
      const text = button.textContent.trim().toLowerCase();
      if (
        text.includes("cancel") ||
        text.includes("ok") ||
        text.includes("submit")
      ) {
        foundButtons.push(button);
      }
    });
  });

  if (foundButtons.length > 0) {
    const buttonContainer =
      foundButtons[0].closest("div") || foundButtons[0].parentElement;
    if (buttonContainer) {
      const askAgentButton = document.createElement("button");
      askAgentButton.className = CSS_CLASSES.ASK_AGENT_BTN;
      askAgentButton.textContent = "Ask Agent";
      askAgentButton.style.cssText = `
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #000; border: none; border-radius: 8px;
        padding: 10px 20px; font-size: 14px; font-weight: 600;
        cursor: pointer; margin-right: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.2s ease; display: inline-flex;
        align-items: center; gap: 6px;
      `;
      askAgentButton.addEventListener("mouseenter", () => {
        askAgentButton.style.transform = "translateY(-1px)";
        askAgentButton.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
      });
      askAgentButton.addEventListener("mouseleave", () => {
        askAgentButton.style.transform = "translateY(0)";
        askAgentButton.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
      });
      askAgentButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (document.querySelector(`.${CSS_CLASSES.AGENT_POPUP}`)) {
          closeAgentPopup();
        } else {
          openAgentPopup(askAgentButton);
        }
      });
      buttonContainer.insertBefore(askAgentButton, foundButtons[0]);
    }
  }
}

function setupButtonObserver() {
  if (!shouldEnableAgent(document)) return;
  injectAskAgentButton();
  const buttonCheckInterval = setInterval(() => {
    if (document.querySelector(`.${CSS_CLASSES.ASK_AGENT_BTN}`)) {
      clearInterval(buttonCheckInterval);
    } else {
      injectAskAgentButton();
    }
  }, 500);
  setTimeout(() => clearInterval(buttonCheckInterval), OBSERVER_TIMEOUT);
}
