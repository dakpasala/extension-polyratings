// ==================== AGENT POPUP ====================

// Rate limiting
const RATE_LIMIT = {
  MAX_MESSAGES: 10,
  STORAGE_KEY: 'pr_agent_usage',
};

function checkRateLimit() {
  const today = new Date().toDateString();
  const stored = localStorage.getItem(RATE_LIMIT.STORAGE_KEY);
  
  let usage = { date: today, count: 0 };
  
  if (stored) {
    usage = JSON.parse(stored);
    // Reset if it's a new day
    if (usage.date !== today) {
      usage = { date: today, count: 0 };
    }
  }
  
  return {
    remaining: RATE_LIMIT.MAX_MESSAGES - usage.count,
    canSend: usage.count < RATE_LIMIT.MAX_MESSAGES,
    usage: usage
  };
}

function incrementUsage() {
  const today = new Date().toDateString();
  const stored = localStorage.getItem(RATE_LIMIT.STORAGE_KEY);
  
  let usage = { date: today, count: 0 };
  
  if (stored) {
    usage = JSON.parse(stored);
    if (usage.date !== today) {
      usage = { date: today, count: 0 };
    }
  }
  
  usage.count++;
  localStorage.setItem(RATE_LIMIT.STORAGE_KEY, JSON.stringify(usage));
}

function showRateLimitBanner(container, remaining) {
  // container here is messagesArea, but we need the popup root
  const popup = container.closest('.pr-agent-popup');
  if (!popup) return;

  // Remove any existing banner
  const existingBanner = popup.querySelector('.rate-limit-banner');
  if (existingBanner) existingBanner.remove();
  
  // Don't show if more than 3 messages remaining
  if (remaining > 3) return;

  const banner = document.createElement('div');
  banner.className = 'rate-limit-banner';

  // Base styles — sits between messages and input, dark bar like Claude.ai
  banner.style.cssText = `
    background: rgba(45, 35, 55, 0.95);
    backdrop-filter: blur(8px);
    padding: 10px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    animation: bannerSlideIn 0.3s ease-out;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  `;

  if (remaining === 0) {
    banner.innerHTML = `
      <span style="
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.01em;
        line-height: 1.4;
      ">Usage limit reached — your limit will reset at 12:00 AM.</span>
    `;
  } else {
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${remaining === 1 ? '#F59E0B' : '#A78BFA'};
          flex-shrink: 0;
        "></div>
        <span style="
          color: rgba(255, 255, 255, 0.85);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.01em;
        ">${remaining} message${remaining === 1 ? '' : 's'} remaining today</span>
      </div>
    `;
  }

  // Inject animation keyframes if not already present
  if (!document.querySelector('#rate-limit-banner-styles')) {
    const style = document.createElement('style');
    style.id = 'rate-limit-banner-styles';
    style.textContent = `
      @keyframes bannerSlideIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // Insert between messages area and input area (above input)
  const inputArea = popup.querySelector('.pr-agent-input-area');
  if (inputArea) {
    popup.insertBefore(banner, inputArea);
  }

  // If limit is fully hit, disable the input and send button
  if (remaining === 0) {
    const input = inputArea.querySelector('input');
    const sendBtn = inputArea.querySelector('button');
    if (input) {
      input.disabled = true;
      input.placeholder = 'Daily limit reached';
      input.style.opacity = '0.5';
      input.style.cursor = 'not-allowed';
    }
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.5';
      sendBtn.style.cursor = 'not-allowed';
    }
  }
}

function openAgentPopup(button) {
  // Update button label properly
  const buttonLabel = button.querySelector('.cx-MuiButton-label');
  if (buttonLabel) {
    buttonLabel.textContent = 'active agent';
  }
  button.style.background = "linear-gradient(135deg, #4CAF50, #45a049)";

  const chatContainer = document.createElement("div");
  chatContainer.className = "pr-agent-popup";
  chatContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    width: 400px;
    max-width: 90vw;
    height: 500px;
    max-height: 80vh;
    min-width: 300px;
    min-height: 400px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 10000;
    opacity: 0;
    resize: both;
  `;
  
  // Trigger fade in after element is in DOM
  setTimeout(() => {
    chatContainer.style.transition = 'opacity 0.2s ease-out';
    chatContainer.style.opacity = '1';
  }, 10);

  const header = document.createElement("div");
  header.className = "pr-agent-header";
  header.style.cssText = `
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000;
    padding: 16px 20px;
    font-weight: 600;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: grab;
    user-select: none;
  `;
  header.innerHTML = `
    <span>🤖 PolyRatings Agent</span>
    <button class="close-agent-btn" style="
      background: none; border: none; font-size: 20px; cursor: pointer;
      color: #000; padding: 0; width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
    ">×</button>
  `;

  // Make draggable
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  header.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("close-agent-btn")) return;
    
    isDragging = true;
    header.style.cursor = "grabbing";
    
    const rect = chatContainer.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = rect.left;
    initialTop = rect.top;

    const onMouseMove = (moveEvent) => {
      if (!isDragging) return;
      
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      // Clamp to viewport
      const margin = 10;
      const width = chatContainer.offsetWidth;
      const height = chatContainer.offsetHeight;
      newLeft = Math.max(margin, Math.min(newLeft, window.innerWidth - width - margin));
      newTop = Math.max(margin, Math.min(newTop, window.innerHeight - height - margin));

      chatContainer.style.left = `${newLeft}px`;
      chatContainer.style.top = `${newTop}px`;
      chatContainer.style.transform = "none";
    };

    const onMouseUp = () => {
      isDragging = false;
      header.style.cursor = "grab";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

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
  inputArea.className = "pr-agent-input-area";
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
    if (!message) return;
    
    // Check rate limit
    const rateLimit = checkRateLimit();
    if (!rateLimit.canSend) {
      showRateLimitBanner(messagesArea, 0);
      return;
    }
    
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
          // Increment usage on successful response
          incrementUsage();
          
          // Always update banner to show current remaining count
          const updated = checkRateLimit();
          showRateLimitBanner(messagesArea, updated.remaining);
        } else if (response?.status === "ai_analysis") {
          addBotMessage(messagesArea, response.professor.analysis);
          incrementUsage();
          
          const updated = checkRateLimit();
          showRateLimitBanner(messagesArea, updated.remaining);
        } else if (response?.status === "general_response") {
          addBotMessage(messagesArea, response.message);
          incrementUsage();
          
          const updated = checkRateLimit();
          showRateLimitBanner(messagesArea, updated.remaining);
        } else {
          addBotMessage(
            messagesArea,
            "❌ Sorry, I couldn't process your request. Please try again."
          );
        }
      }
    );
  });
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });

  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);
  chatContainer.appendChild(header);
  chatContainer.appendChild(messagesArea);
  chatContainer.appendChild(inputArea);
  document.body.appendChild(chatContainer);

  // Check rate limit on open — show banner immediately if needed
  const initialLimit = checkRateLimit();
  if (initialLimit.remaining <= 3) {
    showRateLimitBanner(messagesArea, initialLimit.remaining);
  }

  setTimeout(() => input.focus(), 100);

  if (!document.querySelector("#agent-popup-styles")) {
    const style = document.createElement("style");
    style.id = "agent-popup-styles";
    style.textContent = `
      .pr-agent-popup input:focus { border-color: #FFD700 !important; }
      .pr-agent-popup button:hover { transform: translateY(-1px); }
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
  const popup = document.querySelector('.pr-agent-popup');
  if (popup) {
    popup.style.transition = 'opacity 0.2s ease-out';
    popup.style.opacity = '0';
    setTimeout(() => popup.remove(), 200);
  }
  const button = document.querySelector(`.${CSS_CLASSES.ASK_AGENT_BTN}`);
  if (button) {
    const buttonLabel = button.querySelector('.cx-MuiButton-label');
    if (buttonLabel) {
      buttonLabel.textContent = 'ask agent';
    }
    button.style.background = "linear-gradient(135deg, #FFD700, #FFA500)";
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

function formatBotMessage(text) {
  if (!text || typeof text !== "string") return text;
  
  // Convert **bold** to <strong>
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Convert line breaks to paragraphs
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map(para => {
    // Check if it's a list
    if (para.includes('\n- ') || para.includes('\n• ')) {
      const items = para.split(/\n[-•]\s+/).filter(i => i.trim());
      const listItems = items.map(item => `<li>${item.trim()}</li>`).join('');
      return `<ul style="margin: 8px 0; padding-left: 24px;">${listItems}</ul>`;
    }
    return `<p style="margin: 8px 0;">${para.trim()}</p>`;
  }).join('');
}

function addBotMessage(container, message) {
  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `
    background: white; color: #333; padding: 12px 16px;
    border-radius: 18px 18px 18px 4px; margin-bottom: 12px;
    margin-right: 40px; font-size: 14px; word-wrap: break-word;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    animation: slideInLeft 0.3s ease-out; line-height: 1.6;
  `;
  
  // First convert links, then format markdown
  const withLinks = convertLinksToHTML(message);
  const formatted = formatBotMessage(withLinks);
  
  messageDiv.innerHTML = formatted;
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
    if (
      text === "Delete Selected" ||
      text.includes("Delete") ||
      text.toLowerCase().includes("delete selected")
    ) {
      deleteButton = button;
      console.log(`✅ Found matching button: "${text}"`);
    }
  });

  if (deleteButton) {
    // Found Delete Selected button - inject to its left
    const buttonContainer = deleteButton.parentElement;
    if (buttonContainer) {
      const askAgentButton = document.createElement("button");
      // Use Cal Poly classes + our custom class
      askAgentButton.className = 'cx-MuiButtonBase-root cx-MuiButton-root cx-MuiButton-contained mr-1 ' + CSS_CLASSES.ASK_AGENT_BTN;
      askAgentButton.tabIndex = 0;
      askAgentButton.type = 'button';
      askAgentButton.style.cssText = `
        background: linear-gradient(135deg, #FFD700, #FFA500);
      `;
      
      // Create button label span (Cal Poly structure)
      const buttonLabel = document.createElement('span');
      buttonLabel.className = 'cx-MuiButton-label';
      buttonLabel.textContent = 'ask agent';
      askAgentButton.appendChild(buttonLabel);
      
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
      askAgentButton.className = 'cx-MuiButtonBase-root cx-MuiButton-root cx-MuiButton-contained mr-1 ' + CSS_CLASSES.ASK_AGENT_BTN;
      askAgentButton.tabIndex = 0;
      askAgentButton.type = 'button';
      askAgentButton.style.cssText = `
        background: linear-gradient(135deg, #FFD700, #FFA500);
      `;
      
      const buttonLabel = document.createElement('span');
      buttonLabel.className = 'cx-MuiButton-label';
      buttonLabel.textContent = 'ask agent';
      askAgentButton.appendChild(buttonLabel);
      
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