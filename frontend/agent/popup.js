// ==================== MAIN POPUP ====================

function openAgentPopup(button) {
  const btnLabel = button.querySelector('.cx-MuiButton-label');
  if (btnLabel) btnLabel.textContent = 'agent';
  button.style.background = BRAND.green;

  const popup = document.createElement('div');
  popup.className = 'pr-agent-popup';

  // ── Header ──
  const header = document.createElement('div');
  header.style.cssText = `padding:12px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;cursor:default;user-select:none;background:#fff;border-radius:14px 14px 0 0;`;
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:28px;height:28px;border-radius:50%;background:${BRAND.green};display:flex;align-items:center;justify-content:center;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      </div>
      <div>
        <div style="font-size:14px;font-weight:500;color:#222;">PolyRatings agent</div>
        <div style="font-size:11px;color:#bbb;">Cal Poly schedule assistant</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <div class="pr-agent-pinned-btn" title="Pinned messages" style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#ccc;transition:all 0.15s;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>
      </div>
      <div class="pr-agent-history-btn" title="Chat history" style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#ccc;transition:all 0.15s;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
      </div>
      <div class="pr-agent-close" style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#ccc;transition:all 0.15s;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
    </div>
  `;

  // ── Drag ──
  let isDragging = false, startX, startY, initLeft, initTop;
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.pr-agent-close') || e.target.closest('.pr-agent-history-btn') || e.target.closest('.pr-agent-pinned-btn')) return;
    isDragging = true; header.style.cursor = 'grabbing';
    const r = popup.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY; initLeft = r.left; initTop = r.top;
    const onMove = (mv) => {
      if (!isDragging) return;
      let nl = initLeft + mv.clientX - startX, nt = initTop + mv.clientY - startY;
      const m = 10;
      nl = Math.max(m, Math.min(nl, window.innerWidth - popup.offsetWidth - m));
      nt = Math.max(m, Math.min(nt, window.innerHeight - popup.offsetHeight - m));
      popup.style.left = nl + 'px'; popup.style.top = nt + 'px'; popup.style.transform = 'none';
    };
    const onUp = () => { isDragging = false; header.style.cursor = 'default'; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // ── Messages area ──
  const messagesArea = document.createElement('div');
  messagesArea.className = 'agent-messages';
  messagesArea.style.cssText = 'flex:1;padding:16px;overflow-y:auto;background:#fff;display:flex;flex-direction:column;';
  renderWelcomeState(messagesArea);

  // ── Input area ──
  const inputArea = document.createElement('div');
  inputArea.className = 'pr-agent-input';
  inputArea.style.cssText = 'border-top:1px solid #f0f0f0;display:flex;flex-direction:column;background:#fff;border-radius:0 0 14px 14px;overflow:hidden;position:relative;';

  const inputRow = document.createElement('div');
  inputRow.className = 'pr-input-inner';
  inputRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Ask about a course or professor...';
  input.style.cssText = 'flex:1;border:none;background:transparent;font-size:13px;outline:none;color:#222;';

  const sendBtn = document.createElement('div');
  sendBtn.className = 'pr-agent-send';
  sendBtn.style.cssText = `width:30px;height:30px;border-radius:50%;background:${BRAND.green};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.15s,opacity 0.15s;flex-shrink:0;`;
  sendBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
  sendBtn.addEventListener('mouseenter', () => sendBtn.style.transform = 'scale(1.08)');
  sendBtn.addEventListener('mouseleave', () => sendBtn.style.transform = 'scale(1)');

  // ── Header button events ──
  const closeBtn = header.querySelector('.pr-agent-close');
  closeBtn.addEventListener('mouseenter', function() { this.style.color = '#666'; this.style.background = '#f0f0f0'; });
  closeBtn.addEventListener('mouseleave', function() { this.style.color = '#ccc'; this.style.background = 'transparent'; });
  closeBtn.addEventListener('click', closeAgentPopup);

  const historyBtn = header.querySelector('.pr-agent-history-btn');
  historyBtn.addEventListener('mouseenter', () => { historyBtn.style.color = '#666'; historyBtn.style.background = '#f0f0f0'; });
  historyBtn.addEventListener('mouseleave', () => { historyBtn.style.color = '#ccc'; historyBtn.style.background = 'transparent'; });
  historyBtn.addEventListener('click', () => renderHistoryView(messagesArea));

  const pinnedBtn = header.querySelector('.pr-agent-pinned-btn');
  pinnedBtn.addEventListener('mouseenter', () => { pinnedBtn.style.color = BRAND.green; pinnedBtn.style.background = BRAND.greenLight; });
  pinnedBtn.addEventListener('mouseleave', () => { pinnedBtn.style.color = '#ccc'; pinnedBtn.style.background = 'transparent'; });
  pinnedBtn.addEventListener('click', () => renderPinnedView(messagesArea));

  // ── Send logic ──
  function sendMessage() {
    const msg = input.value.trim();
    if (!msg) return;
    const userId = localStorage.getItem('pr_user_id') || null;
    addUserMessage(messagesArea, msg);
    input.value = '';
    const typingId = addTypingIndicator(messagesArea);

    chrome.runtime.sendMessage({ type: 'chatbotQuery', query: msg, userId }, (response) => {
      const typing = document.getElementById(typingId);
      if (typing) typing.remove();

      if (response?.status === 'rate_limited') {
        showRateLimitBanner(popup, 0);
        addBotMessage(messagesArea, "You've reached your daily limit. It resets at 12:00 AM.");

      } else if (response?.status === 'success' || response?.status === 'ai_analysis') {
        const result = response.professor.analysis;
        if (result && typeof result === 'object' && result.type === 'comparison') {
          const historyText = `[Comparison] ${result.data.items.map(i => `${i.name} (${i.rating}/4.0)`).join(' vs ')}. ${result.data.verdict || ''}`;
          saveChatMessage('bot', historyText, result.data);
          const history = getChatHistory();
          const now = new Date();
          const dateKey = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          const idx = (history[dateKey] || []).length - 1;
          const pinKey = `${dateKey}::${idx}`;
          addComparisonCard(messagesArea, result.data, true, pinKey);
        } else {
          const text = (result && typeof result === 'object' && result.data) ? result.data : result;
          addBotMessage(messagesArea, text);
        }
        const rem = response.remaining != null ? response.remaining : 10;
        showRateLimitBanner(popup, rem);

      } else if (response?.status === 'general_response') {
        addBotMessage(messagesArea, response.message);
        const rem = response.remaining != null ? response.remaining : 10;
        showRateLimitBanner(popup, rem);

      } else {
        addBotMessage(messagesArea, "Sorry, I couldn't process that. Try asking about a course or professor.");
      }
    });
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);
  inputArea.appendChild(inputRow);
  popup.appendChild(header);
  popup.appendChild(messagesArea);
  popup.appendChild(inputArea);
  document.body.appendChild(popup);

  requestAnimationFrame(() => popup.classList.add('visible'));

  const userId = localStorage.getItem('pr_user_id') || null;
  chrome.runtime.sendMessage({ type: 'checkRateLimit', userId }, (response) => {
    if (response?.remaining != null && response.remaining <= 3) showRateLimitBanner(popup, response.remaining);
  });

  setTimeout(() => input.focus(), 100);
}

function closeAgentPopup() {
  const popup = document.querySelector('.pr-agent-popup');
  if (popup) { popup.style.transition = 'opacity 0.2s'; popup.style.opacity = '0'; setTimeout(() => popup.remove(), 200); }
  const btn = document.querySelector(`.${CSS_CLASSES.ASK_AGENT_BTN}`);
  if (btn) {
    const label = btn.querySelector('.cx-MuiButton-label');
    if (label) { label.textContent = 'Ask Agent'; label.style.color = 'white'; }
    btn.style.background = BRAND.green;
  }
}