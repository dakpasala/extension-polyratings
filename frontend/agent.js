// ==================== AGENT POPUP — REDESIGNED ====================
// Modern, minimal UI. Cal Poly green (#154734) accent.
// All functionality preserved: chat, history, search, select/delete, DB rate limiting.

const BRAND = { green: '#154734', greenLight: 'rgba(21, 71, 52, 0.08)', greenMid: 'rgba(21, 71, 52, 0.15)' };

// ==================== STYLES ====================
(function injectAgentStyles() {
  if (document.getElementById('pr-agent-styles')) return;
  const s = document.createElement('style');
  s.id = 'pr-agent-styles';
  s.textContent = `
    .pr-agent-popup {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 420px; max-width: 92vw;
      height: 540px; max-height: 85vh;
      min-width: 300px; min-height: 400px;
      background: #fff; border-radius: 14px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06);
      display: flex; flex-direction: column; overflow: hidden;
      z-index: 10000; opacity: 0;
      transition: opacity 0.2s ease-out;
      resize: both;
      font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    }
    .pr-agent-popup.visible { opacity: 1; }

    @keyframes agentSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes agentSlideInR {
      from { opacity: 0; transform: translateX(12px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes agentSlideInL {
      from { opacity: 0; transform: translateX(-12px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes agentTyping {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }
    @keyframes agentBannerIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(s);
})();

// ==================== CHAT HISTORY (localStorage) ====================
const CHAT_HISTORY = { STORAGE_KEY: 'pr_agent_history' };

function saveChatMessage(role, text) {
  const now = new Date();
  const dateKey = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let history = {};
  try { const s = localStorage.getItem(CHAT_HISTORY.STORAGE_KEY); if (s) history = JSON.parse(s); } catch(e) {}
  if (!history[dateKey]) history[dateKey] = [];
  history[dateKey].push({ role, text, time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) });
  localStorage.setItem(CHAT_HISTORY.STORAGE_KEY, JSON.stringify(history));
}

function getChatHistory() {
  try { const s = localStorage.getItem(CHAT_HISTORY.STORAGE_KEY); return s ? JSON.parse(s) : {}; } catch(e) { return {}; }
}

// ==================== SEARCH HELPERS ====================
function normalizeText(text) {
  return text.replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1')
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g,'-')
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g,' ')
    .replace(/[\u201C-\u201F\u2033\u2036]/g,'"').replace(/[\u2018-\u201B\u2032\u2035]/g,"'");
}

function highlightTerm(text, term) {
  if (!term || !text) return text;
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return text.replace(new RegExp(`(${esc})`,'gi'), '<mark style="background:#FDE68A;color:#000;border-radius:2px;padding:0 1px;">$1</mark>');
}

function getSnippet(text, term, maxLen) {
  maxLen = maxLen || 80;
  if (!term) return text.length > maxLen ? text.substring(0,maxLen)+'…' : text;
  const nt = normalizeText(text).toLowerCase(), nq = normalizeText(term).toLowerCase();
  const idx = nt.indexOf(nq);
  if (idx===-1) return text.length>maxLen ? text.substring(0,maxLen)+'…' : text;
  const half = Math.floor((maxLen-term.length)/2);
  let start = Math.max(0,idx-half), end = Math.min(text.length,start+maxLen);
  if (start>0) start = Math.max(0,end-maxLen);
  let snippet = text.substring(start,end);
  if (start>0) snippet = '…'+snippet;
  if (end<text.length) snippet += '…';
  return snippet;
}

function searchHistory(term) {
  const history = getChatHistory(), results = [], nq = normalizeText(term).toLowerCase();
  Object.keys(history).reverse().forEach(dateKey => {
    history[dateKey].forEach((msg,i) => {
      const nm = normalizeText(msg.text).toLowerCase();
      if (nm.includes(nq) || dateKey.toLowerCase().includes(nq)) results.push({dateKey,msgIndex:i,msg});
    });
  });
  return results;
}

// ==================== RESET ====================
function resetAgentUsage() {
  localStorage.removeItem(CHAT_HISTORY.STORAGE_KEY);
  console.log('🔄 Agent history reset');
}

// ==================== TEXT FORMATTING ====================
function convertLinksToHTML(text) {
  if (!text || typeof text !== 'string') return text;
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
  return escaped.replace(/(https?:\/\/[^\s]+)/g, (url) => {
    let label = url;
    if (url.includes('polyratings.dev/professor/')) label = 'View profile →';
    else if (url.includes('polyratings.dev/new-professor')) label = 'Add to PolyRatings →';
    else if (url.length > 45) label = url.substring(0,42)+'...';
    return `<a href="${url}" target="_blank" rel="noopener" style="color:${BRAND.green};text-decoration:none;font-weight:600;border-bottom:1px solid ${BRAND.greenMid};">${label}</a>`;
  });
}

function formatBotMessage(text) {
  if (!text || typeof text !== 'string') return text;
  text = text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
  return text.split('\n\n').filter(p=>p.trim()).map(para => {
    if (para.includes('\n- ')||para.includes('\n• ')) {
      const items = para.split(/\n[-•]\s+/).filter(i=>i.trim());
      return `<ul style="margin:6px 0;padding-left:20px;font-size:13px;line-height:1.6;">${items.map(i=>`<li>${i.trim()}</li>`).join('')}</ul>`;
    }
    return `<p style="margin:6px 0;font-size:13px;line-height:1.6;">${para.trim()}</p>`;
  }).join('');
}

// ==================== RATE LIMIT BANNER ====================
function showRateLimitBanner(popup, remaining) {
  if (!popup) return;
  const existing = popup.querySelector('.pr-agent-limit-banner');
  if (existing) existing.remove();
  if (remaining > 3) return;

  const banner = document.createElement('div');
  banner.className = 'pr-agent-limit-banner';
  const isOut = remaining === 0;
  banner.style.cssText = `
    padding: 8px 16px; margin: 0;
    background: ${isOut ? 'rgba(180,30,30,0.95)' : 'rgba(45,35,55,0.95)'};
    color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 500;
    display: flex; align-items: center; gap: 8px;
    animation: agentBannerIn 0.2s ease-out;
  `;
  if (isOut) {
    banner.textContent = 'Daily limit reached — resets at 12:00 AM';
  } else {
    banner.innerHTML = `<div style="width:5px;height:5px;border-radius:50%;background:${remaining===1?'#F59E0B':'#A78BFA'};"></div>${remaining} message${remaining===1?'':'s'} remaining today`;
  }

  const inputArea = popup.querySelector('.pr-agent-input');
  if (inputArea) popup.insertBefore(banner, inputArea);

  if (isOut) {
    const input = inputArea?.querySelector('input');
    const sendBtn = inputArea?.querySelector('.pr-agent-send');
    if (input) { input.disabled = true; input.placeholder = 'Limit reached'; input.style.opacity = '0.4'; }
    if (sendBtn) { sendBtn.style.opacity = '0.3'; sendBtn.style.pointerEvents = 'none'; }
  }
}

// ==================== HISTORY VIEW ====================
function renderHistoryView(messagesArea) {
  const history = getChatHistory();
  const dates = Object.keys(history);
  const popup = messagesArea.closest('.pr-agent-popup');
  const inputArea = popup?.querySelector('.pr-agent-input');
  const limitBanner = popup?.querySelector('.pr-agent-limit-banner');

  messagesArea.style.transition = 'opacity 0.15s ease-out';
  messagesArea.style.opacity = '0';

  setTimeout(() => {
    messagesArea.innerHTML = '';
    if (inputArea) inputArea.style.display = 'none';
    if (limitBanner) limitBanner.style.display = 'none';

    // Select mode state
    let selectMode = false;
    const selectedMessages = new Set();

    // Top bar
    const topBar = document.createElement('div');
    topBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';

    const backBtn = document.createElement('div');
    backBtn.style.cssText = 'display:inline-flex;align-items:center;gap:5px;color:#999;font-size:13px;font-weight:500;cursor:pointer;transition:color 0.15s;';
    backBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg> Back`;
    backBtn.addEventListener('mouseenter', () => backBtn.style.color = '#333');
    backBtn.addEventListener('mouseleave', () => backBtn.style.color = '#999');
    backBtn.addEventListener('click', () => {
      messagesArea.style.transition = 'opacity 0.15s ease-out';
      messagesArea.style.opacity = '0';
      setTimeout(() => {
        if (inputArea) inputArea.style.display = 'flex';
        if (limitBanner) limitBanner.style.display = 'flex';
        messagesArea.innerHTML = '';
        renderWelcomeState(messagesArea);
        messagesArea.style.transition = 'opacity 0.2s ease-in';
        messagesArea.style.opacity = '1';
      }, 150);
    });

    const selectBtn = document.createElement('div');
    selectBtn.style.cssText = 'font-size:12px;font-weight:500;color:#999;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all 0.15s;';
    selectBtn.textContent = 'Select';
    selectBtn.addEventListener('mouseenter', () => { selectBtn.style.color = '#333'; selectBtn.style.background = '#f0f0f0'; });
    selectBtn.addEventListener('mouseleave', () => { selectBtn.style.color = selectMode ? BRAND.green : '#999'; selectBtn.style.background = selectMode ? BRAND.greenLight : 'transparent'; });

    topBar.appendChild(backBtn);
    topBar.appendChild(selectBtn);
    messagesArea.appendChild(topBar);

    // Search bar
    const searchWrap = document.createElement('div');
    searchWrap.style.cssText = 'position:relative;margin-bottom:12px;';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search messages…';
    searchInput.style.cssText = `width:100%;padding:9px 12px 9px 32px;border:1px solid #e8e8e8;border-radius:10px;font-size:13px;outline:none;background:#fafafa;transition:all 0.15s;box-sizing:border-box;`;
    searchInput.addEventListener('focus', () => { searchInput.style.borderColor = BRAND.green; searchInput.style.background = '#fff'; });
    searchInput.addEventListener('blur', () => { if (!searchInput.value) { searchInput.style.borderColor = '#e8e8e8'; searchInput.style.background = '#fafafa'; }});
    const searchIcon = document.createElement('div');
    searchIcon.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    searchIcon.style.cssText = 'position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;';
    searchWrap.appendChild(searchIcon);
    searchWrap.appendChild(searchInput);
    messagesArea.appendChild(searchWrap);

    // Content area
    const contentArea = document.createElement('div');
    contentArea.className = 'history-content-area';
    messagesArea.appendChild(contentArea);

    // Delete bar
    const deleteBar = document.createElement('div');
    deleteBar.style.cssText = `position:sticky;bottom:0;background:rgba(220,38,38,0.95);backdrop-filter:blur(8px);padding:8px 14px;border-radius:10px;display:none;align-items:center;justify-content:space-between;margin-top:8px;`;
    const deleteCount = document.createElement('span');
    deleteCount.style.cssText = 'color:white;font-size:12px;font-weight:500;';
    const deleteActions = document.createElement('div');
    deleteActions.style.cssText = 'display:flex;gap:6px;';
    const cancelDelBtn = document.createElement('button');
    cancelDelBtn.style.cssText = 'background:rgba(255,255,255,0.2);color:white;border:none;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;';
    cancelDelBtn.textContent = 'Cancel';
    const confirmDelBtn = document.createElement('button');
    confirmDelBtn.style.cssText = 'background:white;color:#DC2626;border:none;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;';
    confirmDelBtn.textContent = 'Delete';
    deleteActions.appendChild(cancelDelBtn);
    deleteActions.appendChild(confirmDelBtn);
    deleteBar.appendChild(deleteCount);
    deleteBar.appendChild(deleteActions);
    messagesArea.appendChild(deleteBar);

    function updateDeleteBar() {
      const count = selectedMessages.size;
      if (count > 0) {
        if (deleteBar.style.display !== 'flex') {
          deleteBar.style.display = 'flex'; deleteBar.style.opacity = '0'; deleteBar.style.transform = 'translateY(8px)';
          requestAnimationFrame(() => { deleteBar.style.transition = 'opacity 0.2s,transform 0.2s'; deleteBar.style.opacity = '1'; deleteBar.style.transform = 'translateY(0)'; });
        }
        deleteCount.textContent = `${count} selected`;
        confirmDelBtn.textContent = `Delete (${count})`;
      } else {
        deleteBar.style.transition = 'opacity 0.15s,transform 0.15s'; deleteBar.style.opacity = '0'; deleteBar.style.transform = 'translateY(8px)';
        setTimeout(() => { deleteBar.style.display = 'none'; }, 150);
      }
    }

    function exitSelectMode() {
      selectMode = false; selectedMessages.clear();
      selectBtn.textContent = 'Select'; selectBtn.style.color = '#999'; selectBtn.style.background = 'transparent';
      deleteBar.style.transition = 'opacity 0.15s,transform 0.15s'; deleteBar.style.opacity = '0'; deleteBar.style.transform = 'translateY(8px)';
      setTimeout(() => { deleteBar.style.display = 'none'; }, 150);
      contentArea.querySelectorAll('.select-circle').forEach(c => c.remove());
      contentArea.querySelectorAll('[data-select-row]').forEach(row => { row.style.background = 'transparent'; row.style.paddingLeft = '2px'; });
    }

    function enterSelectMode() {
      selectMode = true; selectBtn.textContent = 'Done'; selectBtn.style.color = BRAND.green; selectBtn.style.background = BRAND.greenLight;
      contentArea.querySelectorAll('[data-select-row]').forEach(row => { addSelectCircle(row); row.style.paddingLeft = '30px'; });
    }

    function addSelectCircle(row) {
      if (row.querySelector('.select-circle')) return;
      const key = row.getAttribute('data-select-key');
      const circle = document.createElement('div');
      circle.className = 'select-circle';
      circle.style.cssText = `position:absolute;left:4px;top:50%;transform:translateY(-50%);width:18px;height:18px;border-radius:50%;border:1.5px solid #ccc;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;background:white;`;
      circle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedMessages.has(key)) {
          selectedMessages.delete(key); circle.style.background = 'white'; circle.style.borderColor = '#ccc'; circle.innerHTML = ''; row.style.background = 'transparent';
        } else {
          selectedMessages.add(key); circle.style.background = BRAND.green; circle.style.borderColor = BRAND.green;
          circle.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
          row.style.background = BRAND.greenLight;
        }
        updateDeleteBar();
      });
      row.style.position = 'relative'; row.appendChild(circle);
    }

    selectBtn.addEventListener('click', () => { if (selectMode) exitSelectMode(); else enterSelectMode(); });
    cancelDelBtn.addEventListener('click', () => exitSelectMode());
    confirmDelBtn.addEventListener('click', () => {
      if (selectedMessages.size === 0) return;
      const hist = getChatHistory(), toDelete = {};
      selectedMessages.forEach(key => { const [dk,idx] = key.split('::'); if (!toDelete[dk]) toDelete[dk] = []; toDelete[dk].push(parseInt(idx)); });
      Object.entries(toDelete).forEach(([dk,indices]) => { if (!hist[dk]) return; indices.sort((a,b)=>b-a).forEach(i=>hist[dk].splice(i,1)); if (hist[dk].length===0) delete hist[dk]; });
      localStorage.setItem(CHAT_HISTORY.STORAGE_KEY, JSON.stringify(hist));
      exitSelectMode();
      contentArea.style.transition = 'opacity 0.12s'; contentArea.style.opacity = '0';
      setTimeout(() => { contentArea.innerHTML = ''; renderFullHistory(contentArea, getChatHistory(), Object.keys(getChatHistory())); contentArea.style.transition = 'opacity 0.15s'; contentArea.style.opacity = '1'; }, 120);
    });

    renderFullHistory(contentArea, history, dates);

    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      if (selectMode) exitSelectMode();
      searchTimeout = setTimeout(() => {
        const term = searchInput.value.trim();
        contentArea.style.transition = 'opacity 0.12s'; contentArea.style.opacity = '0';
        setTimeout(() => {
          contentArea.innerHTML = '';
          if (!term) renderFullHistory(contentArea, history, dates);
          else renderSearchResults(contentArea, term, messagesArea);
          contentArea.style.transition = 'opacity 0.15s'; contentArea.style.opacity = '1';
        }, 120);
      }, 200);
    });

    messagesArea.style.transition = 'opacity 0.2s ease-in';
    messagesArea.style.opacity = '1';
    setTimeout(() => searchInput.focus(), 220);
  }, 150);
}

function renderFullHistory(container, history, dates) {
  if (dates.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:#bbb;font-size:13px;padding:40px 20px;">No messages yet</div>`;
    return;
  }
  [...dates].reverse().forEach(dateKey => {
    const dateHeader = document.createElement('div');
    dateHeader.style.cssText = 'font-size:11px;font-weight:600;color:#bbb;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0 4px;margin-top:6px;border-bottom:1px solid #f0f0f0;margin-bottom:8px;';
    dateHeader.textContent = dateKey;
    container.appendChild(dateHeader);

    history[dateKey].forEach((msg, idx) => {
      const row = document.createElement('div');
      row.id = `hist-${dateKey.replace(/\s/g,'_')}-${idx}`;
      row.setAttribute('data-select-row', 'true');
      row.setAttribute('data-select-key', `${dateKey}::${idx}`);
      row.setAttribute('data-select-role', msg.role);
      const isUser = msg.role === 'user';
      row.style.cssText = `display:flex;flex-direction:column;align-items:${isUser?'flex-end':'flex-start'};margin-bottom:6px;transition:background 0.3s,padding-left 0.2s;padding:2px 4px;border-radius:8px;position:relative;`;

      const bubble = document.createElement('div');
      bubble.style.cssText = isUser
        ? `background:${BRAND.green};color:#fff;padding:8px 14px;border-radius:14px 14px 4px 14px;max-width:80%;font-size:13px;word-wrap:break-word;line-height:1.5;`
        : `background:#f5f5f5;color:#333;padding:8px 14px;border-radius:14px 14px 14px 4px;max-width:80%;font-size:13px;word-wrap:break-word;line-height:1.5;`;
      if (isUser) bubble.textContent = msg.text;
      else bubble.innerHTML = formatBotMessage(convertLinksToHTML(msg.text));

      const time = document.createElement('div');
      time.style.cssText = 'font-size:10px;color:#ccc;margin-top:2px;padding:0 4px;';
      time.textContent = msg.time;

      row.appendChild(bubble);
      row.appendChild(time);
      container.appendChild(row);
    });
  });
}

function renderSearchResults(container, term, messagesArea) {
  const results = searchHistory(term);
  if (results.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:#bbb;font-size:13px;padding:40px 20px;">No results for "${term.replace(/</g,'&lt;')}"</div>`;
    return;
  }
  const countEl = document.createElement('div');
  countEl.style.cssText = 'font-size:11px;color:#bbb;margin-bottom:8px;';
  countEl.textContent = `${results.length} result${results.length===1?'':'s'}`;
  container.appendChild(countEl);

  const grouped = {};
  results.forEach(r => { if (!grouped[r.dateKey]) grouped[r.dateKey] = []; grouped[r.dateKey].push(r); });

  Object.keys(grouped).forEach(dateKey => {
    const dl = document.createElement('div');
    dl.style.cssText = 'font-size:11px;font-weight:600;color:#bbb;text-transform:uppercase;letter-spacing:0.05em;padding:4px 0;margin-top:4px;';
    dl.textContent = dateKey;
    container.appendChild(dl);

    grouped[dateKey].forEach(result => {
      const { msg, msgIndex } = result;
      const isUser = msg.role === 'user';
      const card = document.createElement('div');
      card.style.cssText = 'background:#fafafa;border-radius:8px;padding:8px 12px;margin-bottom:4px;cursor:pointer;border:1px solid #f0f0f0;transition:all 0.15s;';

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
      const roleLabel = document.createElement('span');
      roleLabel.style.cssText = `font-size:10px;font-weight:700;color:${isUser?BRAND.green:'#888'};text-transform:uppercase;letter-spacing:0.03em;`;
      roleLabel.textContent = isUser ? 'You' : 'Agent';
      const timeLabel = document.createElement('span');
      timeLabel.style.cssText = 'font-size:10px;color:#ccc;';
      timeLabel.textContent = msg.time;
      topRow.appendChild(roleLabel);
      topRow.appendChild(timeLabel);

      const snippetEl = document.createElement('div');
      snippetEl.style.cssText = 'font-size:12px;color:#555;line-height:1.4;margin-top:3px;';
      snippetEl.innerHTML = highlightTerm(getSnippet(normalizeText(msg.text), term, 90), term);

      card.appendChild(topRow);
      card.appendChild(snippetEl);
      card.addEventListener('mouseenter', () => { card.style.borderColor = BRAND.green; card.style.background = BRAND.greenLight; });
      card.addEventListener('mouseleave', () => { card.style.borderColor = '#f0f0f0'; card.style.background = '#fafafa'; });
      card.addEventListener('click', () => {
        container.style.transition = 'opacity 0.12s'; container.style.opacity = '0';
        setTimeout(() => {
          container.innerHTML = '';
          renderFullHistory(container, getChatHistory(), Object.keys(getChatHistory()));
          container.style.transition = 'opacity 0.15s'; container.style.opacity = '1';
          const targetId = `hist-${dateKey.replace(/\s/g,'_')}-${msgIndex}`;
          setTimeout(() => {
            const target = container.querySelector(`#${CSS.escape(targetId)}`);
            if (target) { target.scrollIntoView({behavior:'smooth',block:'center'}); target.style.background = BRAND.greenLight; setTimeout(()=>{target.style.background='transparent';},1500); }
          }, 80);
          const si = messagesArea.querySelector('input[type="text"]');
          if (si) si.value = '';
        }, 120);
      });
      container.appendChild(card);
    });
  });
}

// ==================== WELCOME STATE ====================
function renderWelcomeState(messagesArea) {
  // Get user name from localStorage (set by highpoint bridge)
  const userName = localStorage.getItem('pr_user_name') || '';
  const firstName = userName.split(' ')[0] || '';
  const greeting = firstName ? `Hi ${firstName}` : 'Hi there';

  const welcome = document.createElement('div');
  welcome.style.cssText = 'animation:agentSlideIn 0.3s ease-out;';
  welcome.innerHTML = `
    <div style="background:#f8f8f8;border-radius:10px;padding:14px 16px;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:500;color:#222;margin-bottom:4px;">${greeting}</div>
      <div style="font-size:12px;color:#888;line-height:1.5;">Ask me about professors, course difficulty, or schedule conflicts.</div>
    </div>
  `;
  messagesArea.appendChild(welcome);

  // Suggestion chips
  const chips = document.createElement('div');
  chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;';
  ['Compare professors', 'Course difficulty', 'Best electives', 'Schedule help'].forEach(label => {
    const chip = document.createElement('div');
    chip.style.cssText = `font-size:12px;color:#777;padding:6px 12px;border-radius:20px;border:1px solid #e8e8e8;cursor:pointer;transition:all 0.15s;`;
    chip.textContent = label;
    chip.addEventListener('mouseenter', () => { chip.style.borderColor = BRAND.green; chip.style.color = BRAND.green; chip.style.background = BRAND.greenLight; });
    chip.addEventListener('mouseleave', () => { chip.style.borderColor = '#e8e8e8'; chip.style.color = '#777'; chip.style.background = 'transparent'; });
    chip.addEventListener('click', () => {
      const popup = messagesArea.closest('.pr-agent-popup');
      const input = popup?.querySelector('.pr-agent-input input');
      if (input) { input.value = label + ' for '; input.focus(); }
    });
    chips.appendChild(chip);
  });
  messagesArea.appendChild(chips);

  // Spacer
  const spacer = document.createElement('div');
  spacer.style.cssText = 'flex:1;';
  messagesArea.appendChild(spacer);

  // History button
  const history = getChatHistory();
  const totalMsgs = Object.values(history).reduce((s,m) => s+m.length, 0);

  const histBtn = document.createElement('div');
  histBtn.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fafafa;border-radius:10px;cursor:pointer;border:1px solid #f0f0f0;transition:all 0.15s;';
  histBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="2" stroke-linecap="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
    <div style="flex:1;">
      <div style="font-size:12px;font-weight:500;color:#666;">Past messages</div>
      <div style="font-size:11px;color:#bbb;">${totalMsgs > 0 ? `${totalMsgs} saved` : 'None yet'}</div>
    </div>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
  `;
  histBtn.addEventListener('mouseenter', () => { histBtn.style.borderColor = BRAND.green; histBtn.style.background = BRAND.greenLight; });
  histBtn.addEventListener('mouseleave', () => { histBtn.style.borderColor = '#f0f0f0'; histBtn.style.background = '#fafafa'; });
  histBtn.addEventListener('click', () => renderHistoryView(messagesArea));
  messagesArea.appendChild(histBtn);
}

// ==================== CHAT MESSAGES ====================
function addUserMessage(container, message) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;margin-bottom:10px;animation:agentSlideInR 0.25s ease-out;';
  const bubble = document.createElement('div');
  bubble.style.cssText = `background:${BRAND.green};color:#fff;padding:10px 14px;border-radius:16px 16px 4px 16px;margin-left:48px;font-size:13px;word-wrap:break-word;line-height:1.5;`;
  bubble.textContent = message;
  const time = document.createElement('div');
  time.style.cssText = 'font-size:10px;color:#ccc;margin-top:2px;padding:0 4px;';
  time.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  wrapper.appendChild(bubble);
  wrapper.appendChild(time);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
  saveChatMessage('user', message);
}

function addBotMessage(container, message) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;margin-bottom:10px;animation:agentSlideInL 0.25s ease-out;';
  const bubble = document.createElement('div');
  bubble.style.cssText = 'background:#f5f5f5;color:#333;padding:10px 14px;border-radius:16px 16px 16px 4px;margin-right:48px;font-size:13px;word-wrap:break-word;line-height:1.6;';
  bubble.innerHTML = formatBotMessage(convertLinksToHTML(message));
  const time = document.createElement('div');
  time.style.cssText = 'font-size:10px;color:#ccc;margin-top:2px;padding:0 4px;';
  time.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  wrapper.appendChild(bubble);
  wrapper.appendChild(time);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
  saveChatMessage('bot', message);
}

function addTypingIndicator(container) {
  const id = 'typing-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.style.cssText = 'display:flex;align-items:center;gap:6px;padding:10px 14px;background:#f5f5f5;border-radius:16px 16px 16px 4px;margin-right:48px;margin-bottom:10px;width:fit-content;animation:agentSlideInL 0.2s ease-out;';
  el.innerHTML = `<div style="display:flex;gap:3px;">${[0,0.15,0.3].map(d=>`<div style="width:5px;height:5px;border-radius:50%;background:#999;animation:agentTyping 1.2s infinite ease-in-out ${d}s;"></div>`).join('')}</div>`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return id;
}

// ==================== MAIN POPUP ====================
function openAgentPopup(button) {
  const btnLabel = button.querySelector('.cx-MuiButton-label');
  if (btnLabel) btnLabel.textContent = 'agent';
  button.style.background = BRAND.green;

  const popup = document.createElement('div');
  popup.className = 'pr-agent-popup';

  // Header
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
    <div class="pr-agent-close" style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#ccc;transition:all 0.15s;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </div>
  `;

  // Drag
  let isDragging = false, startX, startY, initLeft, initTop;
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.pr-agent-close')) return;
    isDragging = true; header.style.cursor = 'grabbing';
    const r = popup.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY; initLeft = r.left; initTop = r.top;
    const onMove = (mv) => {
      if (!isDragging) return;
      let nl = initLeft + mv.clientX - startX, nt = initTop + mv.clientY - startY;
      const m = 10; nl = Math.max(m, Math.min(nl, window.innerWidth-popup.offsetWidth-m)); nt = Math.max(m, Math.min(nt, window.innerHeight-popup.offsetHeight-m));
      popup.style.left = nl+'px'; popup.style.top = nt+'px'; popup.style.transform = 'none';
    };
    const onUp = () => { isDragging = false; header.style.cursor = 'default'; document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Messages area
  const messagesArea = document.createElement('div');
  messagesArea.className = 'agent-messages';
  messagesArea.style.cssText = 'flex:1;padding:16px;overflow-y:auto;background:#fff;display:flex;flex-direction:column;';
  renderWelcomeState(messagesArea);

  // Input area
  const inputArea = document.createElement('div');
  inputArea.className = 'pr-agent-input';
  inputArea.style.cssText = 'padding:10px 14px;border-top:1px solid #f0f0f0;display:flex;align-items:center;gap:8px;background:#fff;border-radius:0 0 14px 14px;';
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

  // Close
  header.querySelector('.pr-agent-close').addEventListener('mouseenter', function() { this.style.color = '#666'; this.style.background = '#f0f0f0'; });
  header.querySelector('.pr-agent-close').addEventListener('mouseleave', function() { this.style.color = '#ccc'; this.style.background = 'transparent'; });
  header.querySelector('.pr-agent-close').addEventListener('click', closeAgentPopup);

  // Send logic
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
        addBotMessage(messagesArea, response.professor.analysis);
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

  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);
  popup.appendChild(header);
  popup.appendChild(messagesArea);
  popup.appendChild(inputArea);
  document.body.appendChild(popup);

  requestAnimationFrame(() => popup.classList.add('visible'));

  // Check rate limit on open
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
    if (label) label.textContent = 'Ask Agent';
    label.style.color = 'white';
    btn.style.background = BRAND.green;
  }
}

// ==================== BUTTON INJECTION ====================
function injectAskAgentButton() {
  if (!shouldEnableAgent(document)) return;
  if (document.querySelector(`.${CSS_CLASSES.ASK_AGENT_BTN}`)) return;

  let deleteButton = null;
  document.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.trim().toLowerCase();
    if (text === 'delete selected' || text.includes('delete selected')) deleteButton = btn;
  });

  if (deleteButton) {
    const container = deleteButton.parentElement;
    if (container) {
      const agentBtn = document.createElement('button');
      agentBtn.className = 'cx-MuiButtonBase-root cx-MuiButton-root cx-MuiButton-contained mr-1 ' + CSS_CLASSES.ASK_AGENT_BTN;
      agentBtn.tabIndex = 0; agentBtn.type = 'button';
      agentBtn.style.cssText = `background:${BRAND.green};`;
      const label = document.createElement('span');
      label.className = 'cx-MuiButton-label';
      label.textContent = 'Ask Agent';
      label.style.color = 'white';
      agentBtn.appendChild(label);
      agentBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (document.querySelector('.pr-agent-popup')) closeAgentPopup();
        else openAgentPopup(agentBtn);
      });
      container.insertBefore(agentBtn, deleteButton);
      return;
    }
  }

  // Fallback
  const selectors = ['button[type="button"]', '.MuiButton-root', 'button', '[role="button"]'];
  let found = [];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(btn => {
      const t = btn.textContent.trim().toLowerCase();
      if (t.includes('cancel') || t.includes('ok') || t.includes('submit')) found.push(btn);
    });
  });
  if (found.length > 0) {
    const container = found[0].closest('div') || found[0].parentElement;
    if (container) {
      const agentBtn = document.createElement('button');
      agentBtn.className = 'cx-MuiButtonBase-root cx-MuiButton-root cx-MuiButton-contained mr-1 ' + CSS_CLASSES.ASK_AGENT_BTN;
      agentBtn.tabIndex = 0; agentBtn.type = 'button';
      agentBtn.style.cssText = `background:${BRAND.green};`;
      const label = document.createElement('span');
      label.className = 'cx-MuiButton-label';
      label.textContent = 'Ask Agent';
      label.style.color = 'white';
      agentBtn.appendChild(label);
      agentBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (document.querySelector('.pr-agent-popup')) closeAgentPopup();
        else openAgentPopup(agentBtn);
      });
      container.insertBefore(agentBtn, found[0]);
    }
  }
}

function setupButtonObserver() {
  if (!shouldEnableAgent(document)) return;
  injectAskAgentButton();
  const interval = setInterval(() => {
    if (document.querySelector(`.${CSS_CLASSES.ASK_AGENT_BTN}`)) clearInterval(interval);
    else injectAskAgentButton();
  }, 500);
  setTimeout(() => clearInterval(interval), OBSERVER_TIMEOUT);
}