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

// ==================== RESET (for testing) ====================
function resetAgentUsage() {
  localStorage.removeItem(RATE_LIMIT.STORAGE_KEY);
  localStorage.removeItem(CHAT_HISTORY.STORAGE_KEY);
  console.log('🔄 Agent usage & history reset');
}

// ==================== CHAT HISTORY ====================
const CHAT_HISTORY = {
  STORAGE_KEY: 'pr_agent_history',
};

function saveChatMessage(role, text) {
  const now = new Date();
  const dateKey = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  let history = {};
  try {
    const stored = localStorage.getItem(CHAT_HISTORY.STORAGE_KEY);
    if (stored) history = JSON.parse(stored);
  } catch (e) { /* ignore */ }

  if (!history[dateKey]) history[dateKey] = [];
  history[dateKey].push({
    role,        // 'user' or 'bot'
    text,
    time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  });

  localStorage.setItem(CHAT_HISTORY.STORAGE_KEY, JSON.stringify(history));
}

function getChatHistory() {
  try {
    const stored = localStorage.getItem(CHAT_HISTORY.STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

// ==================== SEARCH HELPERS ====================

function highlightTerm(text, term) {
  if (!term || !text) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark style="background: #FFE082; color: #000; border-radius: 2px; padding: 0 1px;">$1</mark>');
}

function getSnippet(text, term, maxLen) {
  maxLen = maxLen || 80;
  if (!term) return text.length > maxLen ? text.substring(0, maxLen) + '…' : text;

  // Normalize both for finding the match position
  const normalizedText = normalizeText(text).toLowerCase();
  const normalizedTerm = normalizeText(term).toLowerCase();
  const idx = normalizedText.indexOf(normalizedTerm);
  if (idx === -1) return text.length > maxLen ? text.substring(0, maxLen) + '…' : text;

  const half = Math.floor((maxLen - term.length) / 2);
  let start = Math.max(0, idx - half);
  let end = Math.min(text.length, start + maxLen);
  if (start > 0) start = Math.max(0, end - maxLen);

  let snippet = text.substring(start, end);
  if (start > 0) snippet = '…' + snippet;
  if (end < text.length) snippet = snippet + '…';

  return snippet;
}

function normalizeText(text) {
  return text
    // Strip markdown
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    // Normalize all types of hyphens/dashes to regular hyphen
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    // Normalize all types of spaces to regular space
    .replace(/[\u00A0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000]/g, ' ')
    // Normalize quotes
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
}

function searchHistory(term) {
  const history = getChatHistory();
  const results = [];
  const normalizedTerm = normalizeText(term).toLowerCase();

  const dates = Object.keys(history).reverse();
  dates.forEach(dateKey => {
    const messages = history[dateKey];
    messages.forEach((msg, msgIndex) => {
      const normalizedMsg = normalizeText(msg.text).toLowerCase();
      const inText = normalizedMsg.includes(normalizedTerm);
      const inDate = dateKey.toLowerCase().includes(normalizedTerm);
      if (inText || inDate) {
        results.push({ dateKey, msgIndex, msg, matchInDate: inDate && !inText });
      }
    });
  });

  return results;
}

// ==================== HISTORY VIEW ====================

function renderHistoryView(messagesArea) {
  const history = getChatHistory();
  const dates = Object.keys(history);

  const popup = messagesArea.closest('.pr-agent-popup');
  const inputArea = popup?.querySelector('.pr-agent-input-area');

  // Fade out current content
  messagesArea.style.transition = 'opacity 0.15s ease-out';
  messagesArea.style.opacity = '0';

  setTimeout(() => {
    messagesArea.innerHTML = '';
    if (inputArea) inputArea.style.display = 'none';
    // Hide rate limit banner in history view
    const rateBanner = popup?.querySelector('.rate-limit-banner');
    if (rateBanner) rateBanner.style.display = 'none';

    // -- Select mode state --
    let selectMode = false;
    const selectedMessages = new Set(); // stores "dateKey::msgIndex" strings

    // -- Top bar: back button + select button --
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px;
    `;

    const backBtn = document.createElement('div');
    backBtn.style.cssText = `
      display: inline-flex; align-items: center; gap: 6px;
      color: #666; font-size: 13px; font-weight: 600;
      cursor: pointer; padding: 4px 0;
      transition: color 0.2s;
    `;
    backBtn.innerHTML = `← Back to chat`;
    backBtn.addEventListener('mouseenter', () => backBtn.style.color = '#333');
    backBtn.addEventListener('mouseleave', () => backBtn.style.color = '#666');
    backBtn.addEventListener('click', () => {
      messagesArea.style.transition = 'opacity 0.15s ease-out';
      messagesArea.style.opacity = '0';
      setTimeout(() => {
        if (inputArea) inputArea.style.display = 'flex';
        const rateBanner = popup?.querySelector('.rate-limit-banner');
        if (rateBanner) rateBanner.style.display = 'flex';
        messagesArea.innerHTML = '';
        renderWelcomeMessage(messagesArea);
        messagesArea.style.transition = 'opacity 0.2s ease-in';
        messagesArea.style.opacity = '1';
      }, 150);
    });

    const selectBtn = document.createElement('div');
    selectBtn.style.cssText = `
      font-size: 13px; font-weight: 600; color: #999;
      cursor: pointer; padding: 4px 8px; border-radius: 6px;
      transition: all 0.2s;
    `;
    selectBtn.textContent = 'Select';
    selectBtn.addEventListener('mouseenter', () => {
      selectBtn.style.color = '#333';
      selectBtn.style.background = '#f0f0f0';
    });
    selectBtn.addEventListener('mouseleave', () => {
      selectBtn.style.color = selectMode ? '#E6A000' : '#999';
      selectBtn.style.background = selectMode ? '#FFF8E1' : 'transparent';
    });

    topBar.appendChild(backBtn);
    topBar.appendChild(selectBtn);
    messagesArea.appendChild(topBar);

    // -- Delete bar (hidden until items selected) --
    const deleteBar = document.createElement('div');
    deleteBar.style.cssText = `
      position: sticky; bottom: 0; left: 0; right: 0;
      background: rgba(220, 38, 38, 0.95);
      backdrop-filter: blur(8px);
      padding: 10px 16px;
      border-radius: 10px;
      display: none;
      align-items: center; justify-content: space-between;
      z-index: 10;
      animation: bannerSlideIn 0.2s ease-out;
      margin-top: 8px;
    `;

    const deleteCount = document.createElement('span');
    deleteCount.style.cssText = `color: white; font-size: 13px; font-weight: 500;`;
    deleteCount.textContent = '0 selected';

    const deleteActions = document.createElement('div');
    deleteActions.style.cssText = `display: flex; gap: 8px;`;

    const cancelDeleteBtn = document.createElement('button');
    cancelDeleteBtn.style.cssText = `
      background: rgba(255,255,255,0.2); color: white; border: none;
      padding: 6px 14px; border-radius: 8px; font-size: 12px;
      font-weight: 600; cursor: pointer; transition: background 0.15s;
    `;
    cancelDeleteBtn.textContent = 'Cancel';
    cancelDeleteBtn.addEventListener('mouseenter', () => cancelDeleteBtn.style.background = 'rgba(255,255,255,0.3)');
    cancelDeleteBtn.addEventListener('mouseleave', () => cancelDeleteBtn.style.background = 'rgba(255,255,255,0.2)');

    const confirmDeleteBtn = document.createElement('button');
    confirmDeleteBtn.style.cssText = `
      background: white; color: #DC2626; border: none;
      padding: 6px 14px; border-radius: 8px; font-size: 12px;
      font-weight: 600; cursor: pointer; transition: all 0.15s;
    `;
    confirmDeleteBtn.textContent = 'Delete';
    confirmDeleteBtn.addEventListener('mouseenter', () => {
      confirmDeleteBtn.style.background = '#FEE2E2';
    });
    confirmDeleteBtn.addEventListener('mouseleave', () => {
      confirmDeleteBtn.style.background = 'white';
    });

    deleteActions.appendChild(cancelDeleteBtn);
    deleteActions.appendChild(confirmDeleteBtn);
    deleteBar.appendChild(deleteCount);
    deleteBar.appendChild(deleteActions);

    function updateDeleteBar() {
      const count = selectedMessages.size;
      if (count > 0) {
        if (deleteBar.style.display !== 'flex') {
          deleteBar.style.display = 'flex';
          deleteBar.style.opacity = '0';
          deleteBar.style.transform = 'translateY(8px)';
          requestAnimationFrame(() => {
            deleteBar.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
            deleteBar.style.opacity = '1';
            deleteBar.style.transform = 'translateY(0)';
          });
        }
        deleteCount.textContent = `${count} selected`;
        confirmDeleteBtn.textContent = `Delete (${count})`;
      } else {
        // Fade out
        deleteBar.style.transition = 'opacity 0.15s ease-in, transform 0.15s ease-in';
        deleteBar.style.opacity = '0';
        deleteBar.style.transform = 'translateY(8px)';
        setTimeout(() => {
          deleteBar.style.display = 'none';
        }, 150);
      }
    }

    function exitSelectMode() {
      selectMode = false;
      selectedMessages.clear();
      selectBtn.textContent = 'Select';
      selectBtn.style.color = '#999';
      selectBtn.style.background = 'transparent';
      // Fade out delete bar
      deleteBar.style.transition = 'opacity 0.15s ease-in, transform 0.15s ease-in';
      deleteBar.style.opacity = '0';
      deleteBar.style.transform = 'translateY(8px)';
      setTimeout(() => {
        deleteBar.style.display = 'none';
      }, 150);
      // Remove all circles and highlights
      contentArea.querySelectorAll('.select-circle').forEach(c => c.remove());
      contentArea.querySelectorAll('[data-select-row]').forEach(row => {
        row.style.background = 'transparent';
        row.style.paddingLeft = '2px';
      });
    }

    function enterSelectMode() {
      selectMode = true;
      selectBtn.textContent = 'Done';
      selectBtn.style.color = '#E6A000';
      selectBtn.style.background = '#FFF8E1';
      // Add circles to all message rows
      contentArea.querySelectorAll('[data-select-row]').forEach(row => {
        addSelectCircle(row);
        row.style.paddingLeft = '30px';
      });
    }

    function addSelectCircle(row) {
      if (row.querySelector('.select-circle')) return;
      const key = row.getAttribute('data-select-key');
      const isUser = row.getAttribute('data-select-role') === 'user';

      const circle = document.createElement('div');
      circle.className = 'select-circle';
      circle.style.cssText = `
        position: absolute;
        left: 4px;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid #ccc;
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        flex-shrink: 0;
      `;

      circle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedMessages.has(key)) {
          selectedMessages.delete(key);
          circle.style.background = 'white';
          circle.style.borderColor = '#ccc';
          circle.innerHTML = '';
          row.style.background = 'transparent';
        } else {
          selectedMessages.add(key);
          circle.style.background = '#FFD700';
          circle.style.borderColor = '#FFD700';
          circle.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          row.style.background = 'rgba(255, 215, 0, 0.08)';
        }
        updateDeleteBar();
      });

      row.style.position = 'relative';
      row.appendChild(circle);
    }

    // Wire up select button
    selectBtn.addEventListener('click', () => {
      if (selectMode) {
        exitSelectMode();
      } else {
        enterSelectMode();
      }
    });

    // Wire up cancel delete
    cancelDeleteBtn.addEventListener('click', () => exitSelectMode());

    // Wire up confirm delete
    confirmDeleteBtn.addEventListener('click', () => {
      if (selectedMessages.size === 0) return;

      // Parse selected keys and delete from localStorage
      const history = getChatHistory();
      const toDelete = {};
      selectedMessages.forEach(key => {
        const [dateKey, idxStr] = key.split('::');
        if (!toDelete[dateKey]) toDelete[dateKey] = [];
        toDelete[dateKey].push(parseInt(idxStr));
      });

      // Delete in reverse index order to preserve indices
      Object.entries(toDelete).forEach(([dateKey, indices]) => {
        if (!history[dateKey]) return;
        indices.sort((a, b) => b - a).forEach(idx => {
          history[dateKey].splice(idx, 1);
        });
        if (history[dateKey].length === 0) {
          delete history[dateKey];
        }
      });

      localStorage.setItem(CHAT_HISTORY.STORAGE_KEY, JSON.stringify(history));

      // Re-render
      exitSelectMode();
      contentArea.style.transition = 'opacity 0.12s ease-out';
      contentArea.style.opacity = '0';
      setTimeout(() => {
        contentArea.innerHTML = '';
        const freshHistory = getChatHistory();
        const freshDates = Object.keys(freshHistory);
        renderFullHistory(contentArea, freshHistory, freshDates, selectMode, selectedMessages, addSelectCircle, updateDeleteBar);
        contentArea.style.transition = 'opacity 0.15s ease-in';
        contentArea.style.opacity = '1';
      }, 120);
    });

    // -- Search bar --
    const searchWrap = document.createElement('div');
    searchWrap.style.cssText = `position: relative; margin-bottom: 14px;`;

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search messages…';
    searchInput.style.cssText = `
      width: 100%; padding: 10px 14px 10px 34px;
      border: 1.5px solid #e0e0e0; border-radius: 10px;
      font-size: 13px; outline: none; background: white;
      transition: border-color 0.2s; box-sizing: border-box;
    `;
    searchInput.addEventListener('focus', () => searchInput.style.borderColor = '#FFD700');
    searchInput.addEventListener('blur', () => {
      if (!searchInput.value) searchInput.style.borderColor = '#e0e0e0';
    });

    const searchIcon = document.createElement('div');
    searchIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    searchIcon.style.cssText = `
      position: absolute; left: 12px; top: 50%;
      transform: translateY(-50%); pointer-events: none;
    `;

    searchWrap.appendChild(searchIcon);
    searchWrap.appendChild(searchInput);
    messagesArea.appendChild(searchWrap);

    // -- Content area --
    const contentArea = document.createElement('div');
    contentArea.className = 'history-content-area';
    messagesArea.appendChild(contentArea);

    // -- Delete bar (sticky at bottom) --
    messagesArea.appendChild(deleteBar);

    // Render full history initially
    renderFullHistory(contentArea, history, dates);

    // Wire up search with debounce
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      // Exit select mode when searching
      if (selectMode) exitSelectMode();
      searchTimeout = setTimeout(() => {
        const term = searchInput.value.trim();

        contentArea.style.transition = 'opacity 0.12s ease-out';
        contentArea.style.opacity = '0';

        setTimeout(() => {
          contentArea.innerHTML = '';
          if (!term) {
            renderFullHistory(contentArea, history, dates);
          } else {
            renderSearchResults(contentArea, term, messagesArea);
          }
          contentArea.style.transition = 'opacity 0.15s ease-in';
          contentArea.style.opacity = '1';
        }, 120);
      }, 200);
    });

    // Fade in
    messagesArea.style.transition = 'opacity 0.2s ease-in';
    messagesArea.style.opacity = '1';

    setTimeout(() => searchInput.focus(), 220);
  }, 150);
}

// Renders the full date-grouped history
function renderFullHistory(container, history, dates) {
  if (dates.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = `
      text-align: center; color: #999; font-size: 14px;
      padding: 40px 20px;
    `;
    empty.textContent = 'No past messages yet. Start chatting!';
    container.appendChild(empty);
    return;
  }

  [...dates].reverse().forEach(dateKey => {
    const messages = history[dateKey];

    const dateHeader = document.createElement('div');
    dateHeader.style.cssText = `
      font-size: 12px; font-weight: 600; color: #999;
      text-transform: uppercase; letter-spacing: 0.05em;
      padding: 8px 0 6px; margin-top: 8px;
      border-bottom: 1px solid #e8e8e8; margin-bottom: 10px;
    `;
    dateHeader.textContent = dateKey;
    container.appendChild(dateHeader);

    messages.forEach((msg, idx) => {
      const row = document.createElement('div');
      row.id = `hist-${dateKey.replace(/\s/g, '_')}-${idx}`;
      row.setAttribute('data-select-row', 'true');
      row.setAttribute('data-select-key', `${dateKey}::${idx}`);
      row.setAttribute('data-select-role', msg.role);
      const isUser = msg.role === 'user';
      row.style.cssText = `
        display: flex; flex-direction: column;
        align-items: ${isUser ? 'flex-end' : 'flex-start'};
        margin-bottom: 8px; transition: background 0.4s, padding-left 0.2s;
        padding: 2px 4px; border-radius: 8px;
        position: relative;
      `;

      const bubble = document.createElement('div');
      bubble.style.cssText = isUser
        ? `background: linear-gradient(135deg, #FFD700, #FFA500); color: #000;
           padding: 8px 14px; border-radius: 14px 14px 4px 14px;
           max-width: 80%; font-size: 13px; word-wrap: break-word;`
        : `background: white; color: #333; padding: 8px 14px;
           border-radius: 14px 14px 14px 4px; max-width: 80%;
           font-size: 13px; word-wrap: break-word;
           box-shadow: 0 1px 3px rgba(0,0,0,0.08);`;

      if (isUser) {
        bubble.textContent = msg.text;
      } else {
        const withLinks = convertLinksToHTML(msg.text);
        const formatted = formatBotMessage(withLinks);
        bubble.innerHTML = formatted;
      }

      const time = document.createElement('div');
      time.style.cssText = `font-size: 10px; color: #bbb; margin-top: 2px; padding: 0 4px;`;
      time.textContent = msg.time;

      row.appendChild(bubble);
      row.appendChild(time);
      container.appendChild(row);
    });
  });
}

// Renders iMessage-style search result cards
function renderSearchResults(container, term, messagesArea) {
  const results = searchHistory(term);

  if (results.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = `
      text-align: center; color: #999; font-size: 14px;
      padding: 40px 20px;
    `;
    empty.innerHTML = `No results for "<strong style="color:#666;">${term.replace(/</g, '&lt;')}</strong>"`;
    container.appendChild(empty);
    return;
  }

  // Result count
  const countLabel = document.createElement('div');
  countLabel.style.cssText = `
    font-size: 11px; color: #aaa; margin-bottom: 10px; padding: 0 2px;
  `;
  countLabel.textContent = `${results.length} result${results.length === 1 ? '' : 's'}`;
  container.appendChild(countLabel);

  // Group by date
  const grouped = {};
  results.forEach(r => {
    if (!grouped[r.dateKey]) grouped[r.dateKey] = [];
    grouped[r.dateKey].push(r);
  });

  Object.keys(grouped).forEach(dateKey => {
    const dateLabel = document.createElement('div');
    dateLabel.style.cssText = `
      font-size: 11px; font-weight: 600; color: #aaa;
      text-transform: uppercase; letter-spacing: 0.05em;
      padding: 6px 0 4px; margin-top: 4px;
    `;
    dateLabel.textContent = dateKey;
    container.appendChild(dateLabel);

    grouped[dateKey].forEach(result => {
      const { msg, msgIndex } = result;
      const isUser = msg.role === 'user';

      const card = document.createElement('div');
      card.style.cssText = `
        background: white; border-radius: 10px; padding: 10px 14px;
        margin-bottom: 6px; cursor: pointer;
        border: 1px solid #eee; transition: all 0.15s;
        display: flex; flex-direction: column; gap: 4px;
      `;

      // Top row: role + time
      const topRow = document.createElement('div');
      topRow.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
      `;

      const roleLabel = document.createElement('span');
      roleLabel.style.cssText = `
        font-size: 11px; font-weight: 700;
        color: ${isUser ? '#E6A000' : '#666'};
        text-transform: uppercase; letter-spacing: 0.03em;
      `;
      roleLabel.textContent = isUser ? 'You' : 'Agent';

      const timeLabel = document.createElement('span');
      timeLabel.style.cssText = `font-size: 10px; color: #bbb;`;
      timeLabel.textContent = msg.time;

      topRow.appendChild(roleLabel);
      topRow.appendChild(timeLabel);

      // Snippet with highlight — normalize text so term matching works
      const snippetEl = document.createElement('div');
      snippetEl.style.cssText = `font-size: 13px; color: #444; line-height: 1.4;`;
      const plainText = normalizeText(msg.text);
      const rawSnippet = getSnippet(plainText, term, 90);
      snippetEl.innerHTML = highlightTerm(rawSnippet, term);

      card.appendChild(topRow);
      card.appendChild(snippetEl);

      // Hover effects
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = '#FFD700';
        card.style.background = '#FFFDF5';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = '#eee';
        card.style.background = 'white';
      });

      // Click — jump to message in full history
      card.addEventListener('click', () => {
        // Fade out search results
        container.style.transition = 'opacity 0.12s ease-out';
        container.style.opacity = '0';

        setTimeout(() => {
          container.innerHTML = '';

          // Re-render full history
          const freshHistory = getChatHistory();
          const allDates = Object.keys(freshHistory);
          renderFullHistory(container, freshHistory, allDates);

          container.style.transition = 'opacity 0.15s ease-in';
          container.style.opacity = '1';

          // Scroll to and flash the target message
          const targetId = `hist-${dateKey.replace(/\s/g, '_')}-${msgIndex}`;
          setTimeout(() => {
            const target = container.querySelector(`#${CSS.escape(targetId)}`);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              target.style.background = 'rgba(255, 215, 0, 0.25)';
              setTimeout(() => { target.style.background = 'transparent'; }, 1500);
            }
          }, 80);

          // Clear search input
          const searchInput = messagesArea.querySelector('input[type="text"]');
          if (searchInput) searchInput.value = '';
        }, 120);
      });

      container.appendChild(card);
    });
  });
}

function renderWelcomeMessage(messagesArea) {
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
    </div>
  `;
  messagesArea.appendChild(welcomeMessage);

  // History button
  const history = getChatHistory();
  const totalMessages = Object.values(history).reduce((sum, msgs) => sum + msgs.length, 0);

  const historyBtn = document.createElement('div');
  historyBtn.style.cssText = `
    background: white; padding: 12px 16px; border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    display: flex; align-items: center; justify-content: space-between;
    cursor: pointer; transition: all 0.2s;
    border: 1px solid #eee; margin-bottom: 16px;
  `;
  historyBtn.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 16px;">📜</span>
      <div>
        <div style="font-size: 13px; font-weight: 600; color: #333;">View past messages</div>
        <div style="font-size: 11px; color: #999; margin-top: 1px;">
          ${totalMessages > 0 ? `${totalMessages} message${totalMessages === 1 ? '' : 's'} saved` : 'No messages yet'}
        </div>
      </div>
    </div>
    <span style="color: #ccc; font-size: 14px;">›</span>
  `;
  historyBtn.addEventListener('mouseenter', () => {
    historyBtn.style.borderColor = '#FFD700';
    historyBtn.style.background = '#FFFDF5';
  });
  historyBtn.addEventListener('mouseleave', () => {
    historyBtn.style.borderColor = '#eee';
    historyBtn.style.background = 'white';
  });
  historyBtn.addEventListener('click', () => renderHistoryView(messagesArea));
  messagesArea.appendChild(historyBtn);
}

function showRateLimitBanner(container, remaining) {
  const popup = container.closest('.pr-agent-popup');
  if (!popup) return;

  const existingBanner = popup.querySelector('.rate-limit-banner');
  if (existingBanner) existingBanner.remove();
  
  if (remaining > 3) return;

  const banner = document.createElement('div');
  banner.className = 'rate-limit-banner';

  banner.style.cssText = `
    background: rgba(45, 35, 55, 0.95);
    backdrop-filter: blur(8px);
    padding: 10px 20px;
    margin: 0 14px;
    border-radius: 12px 12px 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    animation: bannerSlideIn 0.3s ease-out;
  `;

  if (remaining === 0) {
    banner.style.background = 'rgba(180, 30, 30, 0.92)';
    banner.innerHTML = `
      <span style="
        color: rgba(255, 255, 255, 0.95);
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

  const inputArea = popup.querySelector('.pr-agent-input-area');
  if (inputArea) {
    popup.insertBefore(banner, inputArea);
    // Remove border so banner + input look attached
    inputArea.style.borderTop = 'none';
  }

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

  renderWelcomeMessage(messagesArea);

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
    
    // Get user ID from localStorage (written by highpoint-bridge.js)
    const userId = localStorage.getItem('pr_user_id') || null;
    
    addUserMessage(messagesArea, message);
    input.value = "";
    const typingId = addTypingMessage(messagesArea);
    chrome.runtime.sendMessage(
      { type: "chatbotQuery", query: message, userId: userId },
      (response) => {
        const typingElement = document.getElementById(typingId);
        if (typingElement) typingElement.remove();

        if (response?.status === "rate_limited") {
          showRateLimitBanner(messagesArea, 0);
          addBotMessage(messagesArea, "You've reached your daily message limit. Your limit will reset at 12:00 AM.");
        } else if (response?.status === "success") {
          addBotMessage(messagesArea, response.professor.analysis);
          const remaining = response.remaining != null ? response.remaining : 10;
          showRateLimitBanner(messagesArea, remaining);
        } else if (response?.status === "ai_analysis") {
          addBotMessage(messagesArea, response.professor.analysis);
          const remaining = response.remaining != null ? response.remaining : 10;
          showRateLimitBanner(messagesArea, remaining);
        } else if (response?.status === "general_response") {
          addBotMessage(messagesArea, response.message);
          const remaining = response.remaining != null ? response.remaining : 10;
          showRateLimitBanner(messagesArea, remaining);
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

  // Check rate limit on open — query the DB via background script
  const userId = localStorage.getItem('pr_user_id') || null;
  chrome.runtime.sendMessage(
    { type: "checkRateLimit", userId: userId },
    (response) => {
      if (response?.remaining != null && response.remaining <= 3) {
        showRateLimitBanner(messagesArea, response.remaining);
      }
    }
  );

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
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    display: flex; flex-direction: column; align-items: flex-end;
    margin-bottom: 12px; animation: slideInRight 0.3s ease-out;
  `;

  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `
    background: linear-gradient(135deg, #FFD700, #FFA500); color: #000;
    padding: 12px 16px; border-radius: 18px 18px 4px 18px;
    margin-left: 40px; font-size: 14px;
    word-wrap: break-word;
  `;
  messageDiv.textContent = message;

  const time = document.createElement("div");
  time.style.cssText = `font-size: 10px; color: #bbb; margin-top: 3px; padding: 0 4px;`;
  time.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  wrapper.appendChild(messageDiv);
  wrapper.appendChild(time);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
  saveChatMessage('user', message);
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
  
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map(para => {
    if (para.includes('\n- ') || para.includes('\n• ')) {
      const items = para.split(/\n[-•]\s+/).filter(i => i.trim());
      const listItems = items.map(item => `<li>${item.trim()}</li>`).join('');
      return `<ul style="margin: 8px 0; padding-left: 24px;">${listItems}</ul>`;
    }
    return `<p style="margin: 8px 0;">${para.trim()}</p>`;
  }).join('');
}

function addBotMessage(container, message) {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    display: flex; flex-direction: column; align-items: flex-start;
    margin-bottom: 12px; animation: slideInLeft 0.3s ease-out;
  `;

  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `
    background: white; color: #333; padding: 12px 16px;
    border-radius: 18px 18px 18px 4px;
    margin-right: 40px; font-size: 14px; word-wrap: break-word;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    line-height: 1.6;
  `;
  
  const withLinks = convertLinksToHTML(message);
  const formatted = formatBotMessage(withLinks);
  messageDiv.innerHTML = formatted;

  const time = document.createElement("div");
  time.style.cssText = `font-size: 10px; color: #bbb; margin-top: 3px; padding: 0 4px;`;
  time.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  wrapper.appendChild(messageDiv);
  wrapper.appendChild(time);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
  saveChatMessage('bot', message);
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
    const buttonContainer = deleteButton.parentElement;
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
      buttonContainer.insertBefore(askAgentButton, deleteButton);
      console.log("✅ Agent button injected next to Delete Selected");
      return;
    }
  }

  console.log("⚠️ Delete Selected button not found, trying fallback...");

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