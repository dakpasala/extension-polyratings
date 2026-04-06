// ==================== AGENT POPUP — REDESIGNED ====================
// Modern, minimal UI. Cal Poly green (#154734) accent.
// All functionality preserved: chat, history, search, select/delete, DB rate limiting.
// + Pinned messages: pin icon in header opens pinned view; hover-to-pin on bubbles.

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
    @keyframes prPinPop {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.5); }
      70%  { transform: scale(0.88); }
      100% { transform: scale(1); }
    }

    .pr-pin-btn {
      opacity: 0;
      transition: opacity 0.18s ease, color 0.18s ease;
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ccc;
      flex-shrink: 0;
    }
    .pr-pin-btn:hover { color: #154734 !important; opacity: 1 !important; }
    .pr-pin-btn.pinned { opacity: 1 !important; color: #154734 !important; }
    .pr-pin-btn.pin-pop svg { animation: prPinPop 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards; }
    .pr-msg-wrapper:hover .pr-pin-btn { opacity: 1; }

    /* Sub-view header slides in from top */
    .pr-history-sticky-header {
      opacity: 0;
      transform: translateY(-6px);
      transition: opacity 0.22s ease, transform 0.22s ease;
    }
    .pr-history-sticky-header.visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(s);
})();

// ==================== CHAT HISTORY (localStorage) ====================
const CHAT_HISTORY = { STORAGE_KEY: 'pr_agent_history' };
const PINNED_STORAGE_KEY = 'pr_agent_pinned';

// Registry of all live pin buttons in the DOM keyed by their pinKey.
// Allows us to sync the pair's button UI when one is toggled.
const PIN_BTN_REGISTRY = {};

function registerPinBtn(key, btn) {
  if (!PIN_BTN_REGISTRY[key]) PIN_BTN_REGISTRY[key] = new Set();
  PIN_BTN_REGISTRY[key].add(btn);
}
function unregisterPinBtn(key, btn) {
  if (PIN_BTN_REGISTRY[key]) PIN_BTN_REGISTRY[key].delete(btn);
}

function getPinnedSet() {
  try { const s = localStorage.getItem(PINNED_STORAGE_KEY); return s ? new Set(JSON.parse(s)) : new Set(); } catch(e) { return new Set(); }
}

function setPinnedSet(set) {
  localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...set]));
}

function getPairKey(dateKey, idx) {
  const history = getChatHistory();
  const msgs = history[dateKey] || [];
  const msg = msgs[idx];
  if (!msg) return null;
  if (msg.role === 'user') {
    const next = msgs[idx + 1];
    if (next && next.role !== 'user') return `${dateKey}::${idx + 1}`;
  } else {
    const prev = msgs[idx - 1];
    if (prev && prev.role === 'user') return `${dateKey}::${idx - 1}`;
  }
  return null;
}

function togglePin(key) {
  const pins = getPinnedSet();
  const [dateKey, idxStr] = key.split('::');
  const idx = parseInt(idxStr);
  const pairKey = getPairKey(dateKey, idx);

  if (pins.has(key)) {
    pins.delete(key);
    if (pairKey) pins.delete(pairKey);
  } else {
    pins.add(key);
    if (pairKey) pins.add(pairKey);
  }
  setPinnedSet(pins);

  // Sync all live buttons for both this key and its pair
  const nowPinned = pins.has(key);
  syncPinBtnUI(key, nowPinned, true);
  if (pairKey) syncPinBtnUI(pairKey, pins.has(pairKey), true);

  return nowPinned;
}

// Update every registered button for a key to reflect pinned state.
// skipAnimation = true means the triggering button already ran its own animation.
function syncPinBtnUI(key, isPinned, animate) {
  const btns = PIN_BTN_REGISTRY[key];
  if (!btns) return;
  btns.forEach(btn => {
    applyPinBtnState(btn, isPinned, animate);
  });
}

function applyPinBtnState(btn, isPinned, animate) {
  btn.innerHTML = isPinned
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>`
    : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>`;
  btn.title = isPinned ? 'Unpin' : 'Pin';
  if (isPinned) {
    btn.classList.add('pinned');
    if (animate) {
      btn.classList.remove('pin-pop');
      // Force reflow to restart animation
      void btn.offsetWidth;
      btn.classList.add('pin-pop');
      btn.addEventListener('animationend', () => btn.classList.remove('pin-pop'), { once: true });
    }
  } else {
    btn.classList.remove('pinned');
  }
  // Override inline opacity set in history view so CSS classes control it properly
  btn.style.opacity = '';
}

function saveChatMessage(role, text, comparisonData) {
  const now = new Date();
  const dateKey = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let history = {};
  try { const s = localStorage.getItem(CHAT_HISTORY.STORAGE_KEY); if (s) history = JSON.parse(s); } catch(e) {}
  if (!history[dateKey]) history[dateKey] = [];
  const entry = { role, text, time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) };
  if (comparisonData) entry.comparisonData = comparisonData;
  history[dateKey].push(entry);
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

function searchPinned(term) {
  const pins = getPinnedSet();
  const history = getChatHistory();
  const results = [];
  const nq = normalizeText(term).toLowerCase();
  pins.forEach(key => {
    const [dateKey, idxStr] = key.split('::');
    const idx = parseInt(idxStr);
    const msg = history[dateKey]?.[idx];
    if (!msg) return;
    const nm = normalizeText(msg.text).toLowerCase();
    if (nm.includes(nq) || dateKey.toLowerCase().includes(nq)) {
      results.push({ key, dateKey, idx, msg });
    }
  });
  return results;
}

// ==================== RESET ====================
function resetAgentUsage() {
  localStorage.removeItem(CHAT_HISTORY.STORAGE_KEY);
  localStorage.removeItem(PINNED_STORAGE_KEY);
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

  const bannerWrap = document.createElement('div');
  bannerWrap.className = 'pr-agent-limit-banner';
  bannerWrap.style.cssText = 'padding: 0 12px; background: #fff;';

  const banner = document.createElement('div');
  const isOut = remaining === 0;
  banner.style.cssText = `
    padding: 10px 16px;
    background: ${isOut ? 'rgba(180,30,30,0.95)' : 'rgba(45,35,55,0.95)'};
    color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 500;
    display: flex; align-items: center; gap: 8px;
    border-radius: 10px 10px 0 0;
    animation: agentBannerIn 0.2s ease-out;
  `;
  if (isOut) {
    banner.textContent = 'Daily limit reached — resets at 12:00 AM';
  } else {
    banner.innerHTML = `<div style="width:5px;height:5px;border-radius:50%;background:${remaining===1?'#F59E0B':'#A78BFA'};"></div>${remaining} message${remaining===1?'':'s'} remaining today`;
  }
  bannerWrap.appendChild(banner);

  const inputArea = popup.querySelector('.pr-agent-input');
  if (inputArea) {
    popup.insertBefore(bannerWrap, inputArea);
    inputArea.style.borderTop = 'none';
  }

  if (isOut) {
    const input = inputArea?.querySelector('input');
    const sendBtn = inputArea?.querySelector('.pr-agent-send');
    if (input) { input.disabled = true; input.placeholder = 'Limit reached'; input.style.opacity = '0.4'; }
    if (sendBtn) { sendBtn.style.opacity = '0.3'; sendBtn.style.pointerEvents = 'none'; }
  }
}

// ==================== PIN BUTTON HELPER ====================
function makePinButton(key) {
  const pins = getPinnedSet();
  const isPinned = pins.has(key);

  const btn = document.createElement('button');
  btn.className = 'pr-pin-btn' + (isPinned ? ' pinned' : '');
  btn.title = isPinned ? 'Unpin' : 'Pin';
  btn.innerHTML = isPinned
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>`
    : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>`;

  registerPinBtn(key, btn);

  // Clean up registry when element is removed from DOM
  const observer = new MutationObserver(() => {
    if (!document.contains(btn)) {
      unregisterPinBtn(key, btn);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // togglePin now handles syncing ALL registered buttons for key + pair
    togglePin(key);
  });

  return btn;
}

// ==================== COMPARISON CARD ====================
function addComparisonCard(container, data, skipSave, pinKey) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'margin-bottom:12px;animation:agentSlideInL 0.25s ease-out;';

  const sorted = [...data.items].sort((a, b) => b.rating - a.rating);
  const winnerId = sorted[0]?.name;

  function ratingDots(rating) {
    const max = 4;
    const filled = Math.round(rating);
    let html = '<div style="display:flex;gap:3px;align-items:center;">';
    for (let i = 1; i <= max; i++) {
      html += `<div style="width:7px;height:7px;border-radius:50%;background:${i <= filled ? BRAND.green : '#e0e0e0'};"></div>`;
    }
    html += `<span style="font-size:11px;color:#888;margin-left:4px;">${parseFloat(rating).toFixed(1)}</span>`;
    html += '</div>';
    return html;
  }

  function diffColor(diff) {
    if (!diff) return '#999';
    const d = diff.toLowerCase();
    if (d === 'easy') return '#16a34a';
    if (d === 'medium') return '#d97706';
    if (d === 'hard') return '#dc2626';
    return '#888';
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;';

  data.items.forEach(item => {
    const isWinner = item.name === winnerId;
    const card = document.createElement('div');
    card.style.cssText = `
      background:#fafafa;
      border:1.5px solid ${isWinner ? BRAND.green : '#ebebeb'};
      border-radius:12px;
      padding:12px;
      position:relative;
      transition:border-color 0.15s;
    `;

    if (isWinner) {
      const badge = document.createElement('div');
      badge.style.cssText = `
        position:absolute;top:-1px;right:8px;
        background:${BRAND.green};color:white;
        font-size:8px;font-weight:600;letter-spacing:0.05em;
        padding:2px 6px;border-radius:0 0 5px 5px;
        text-transform:uppercase;
      `;
      badge.textContent = 'Top pick';
      card.appendChild(badge);
    }

    const name = document.createElement('div');
    name.style.cssText = `font-size:13px;font-weight:600;color:#222;margin-bottom:6px;line-height:1.3;padding-right:4px;${isWinner ? 'margin-top:14px;' : ''}`;
    name.textContent = item.name;
    card.appendChild(name);

    const ratingEl = document.createElement('div');
    ratingEl.style.cssText = 'margin-bottom:5px;';
    ratingEl.innerHTML = ratingDots(item.rating);
    card.appendChild(ratingEl);

    if (item.reviewCount) {
      const reviewCount = document.createElement('div');
      reviewCount.style.cssText = 'font-size:10px;color:#bbb;margin-bottom:6px;';
      reviewCount.textContent = `${item.reviewCount} review${item.reviewCount === 1 ? '' : 's'}`;
      card.appendChild(reviewCount);
    }

    if (item.difficulty) {
      const diff = document.createElement('div');
      diff.style.cssText = `
        display:inline-block;font-size:10px;font-weight:600;
        color:${diffColor(item.difficulty)};
        background:${diffColor(item.difficulty)}18;
        padding:2px 7px;border-radius:20px;margin-bottom:7px;
      `;
      diff.textContent = item.difficulty;
      card.appendChild(diff);
    }

    if (item.tags && item.tags.length > 0) {
      const tagsEl = document.createElement('div');
      tagsEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;margin-bottom:7px;';
      item.tags.slice(0, 3).forEach(tag => {
        const t = document.createElement('div');
        t.style.cssText = 'font-size:10px;color:#666;background:#f0f0f0;padding:2px 6px;border-radius:10px;';
        t.textContent = tag;
        tagsEl.appendChild(t);
      });
      card.appendChild(tagsEl);
    }

    if (item.summary) {
      const summary = document.createElement('div');
      summary.style.cssText = 'font-size:11px;color:#777;line-height:1.5;border-top:1px solid #f0f0f0;padding-top:7px;margin-top:2px;';
      summary.textContent = item.summary;
      card.appendChild(summary);
    }

    grid.appendChild(card);
  });

  wrapper.appendChild(grid);

  if (data.verdict) {
    const verdict = document.createElement('div');
    verdict.style.cssText = `
      background:${BRAND.greenLight};
      border-left:3px solid ${BRAND.green};
      border-radius:0 8px 8px 0;
      padding:9px 12px;
      font-size:12px;color:#333;line-height:1.5;
    `;
    verdict.innerHTML = `<span style="font-weight:600;color:${BRAND.green};">Verdict: </span>${data.verdict}`;
    wrapper.appendChild(verdict);
  }

  const metaRow = document.createElement('div');
  metaRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-top:4px;padding:0 2px;';
  const time = document.createElement('div');
  time.style.cssText = 'font-size:10px;color:#ccc;';
  time.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  metaRow.appendChild(time);

  if (pinKey) {
    const pinBtn = makePinButton(pinKey);
    metaRow.appendChild(pinBtn);
  }

  wrapper.appendChild(metaRow);
  container.appendChild(wrapper);
  if (container.scrollTop !== undefined && container.className === "agent-messages") container.scrollTop = container.scrollHeight;

  const historyText = `[Comparison] ${data.items.map(i => `${i.name} (${i.rating}/4.0)`).join(' vs ')}. ${data.verdict || ''}`;
  if (!skipSave) saveChatMessage("bot", historyText, data);
}

// ==================== SHARED TRANSITIONS ====================
// Unified fade helper: fade messagesArea + sticky header out, then call fn, then fade in.
function fadeTransition(messagesArea, popup, outDuration, inDuration, fn) {
  const stickyHeader = popup.querySelector('.pr-history-sticky-header');
  const targets = [messagesArea];
  if (stickyHeader) targets.push(stickyHeader);

  targets.forEach(el => {
    el.style.transition = `opacity ${outDuration}ms ease-out, transform ${outDuration}ms ease-out`;
    el.style.opacity = '0';
    if (el === messagesArea) el.style.transform = 'translateY(4px)';
    if (el === stickyHeader) el.style.transform = 'translateY(-4px)';
  });

  setTimeout(() => {
    fn();
    // Fade in — done after fn() sets up new DOM
    requestAnimationFrame(() => {
      messagesArea.style.transition = `opacity ${inDuration}ms ease-out, transform ${inDuration}ms ease-out`;
      messagesArea.style.opacity = '1';
      messagesArea.style.transform = 'translateY(0)';
    });
  }, outDuration);
}

// Navigate back to chat from any sub-view
function navigateBackToChat(popup, messagesArea) {
  const inputArea = popup.querySelector('.pr-agent-input');
  const limitBanner = popup.querySelector('.pr-agent-limit-banner');

  fadeTransition(messagesArea, popup, 160, 220, () => {
    // Clean up sub-view chrome
    const existingHeader = popup.querySelector('.pr-history-sticky-header');
    const backToTopEl = popup.querySelector('.pr-back-to-top-pill');
    if (existingHeader) existingHeader.remove();
    if (backToTopEl) backToTopEl.remove();

    if (inputArea) inputArea.style.display = 'flex';
    if (limitBanner) limitBanner.style.display = 'flex';
    messagesArea.innerHTML = '';
    messagesArea.style.paddingTop = '16px';
    renderWelcomeState(messagesArea);
  });
}

// Fade content area only (used for search/filter swaps inside a view)
function fadeContent(contentArea, fn) {
  contentArea.style.transition = 'opacity 0.12s ease-out';
  contentArea.style.opacity = '0';
  setTimeout(() => {
    fn();
    contentArea.style.transition = 'opacity 0.15s ease-in';
    contentArea.style.opacity = '1';
  }, 120);
}

// Build and attach the back-to-top pill, return it.
function makeBackToTopPill(popup, messagesArea) {
  const pill = document.createElement('div');
  pill.className = 'pr-back-to-top-pill';
  pill.style.cssText = `
    position:absolute; bottom:20px; left:50%; transform:translateX(-50%) translateY(16px);
    background:${BRAND.green}; color:white;
    font-size:11px; font-weight:600; letter-spacing:0.02em;
    padding:7px 16px; border-radius:20px;
    display:flex; align-items:center; gap:5px;
    cursor:pointer; opacity:0; pointer-events:none;
    transition:opacity 0.25s ease, transform 0.25s ease;
    white-space:nowrap; z-index:100;
    box-shadow: 0 3px 12px rgba(21,71,52,0.3);
  `;
  pill.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg> Back to top`;
  pill.addEventListener('click', () => messagesArea.scrollTo({ top: 0, behavior: 'smooth' }));
  popup.appendChild(pill);
  return pill;
}

function showPill(pill) {
  pill.style.opacity = '1';
  pill.style.transform = 'translateX(-50%) translateY(0)';
  pill.style.pointerEvents = 'auto';
}
function hidePill(pill) {
  pill.style.opacity = '0';
  pill.style.transform = 'translateX(-50%) translateY(12px)';
  pill.style.pointerEvents = 'none';
}

// ==================== HISTORY VIEW ====================
function renderHistoryView(messagesArea) {
  const popup = messagesArea.closest('.pr-agent-popup');
  // Clean up any existing sub-view chrome instantly (switching between sub-views)
  const existingHeader = popup.querySelector('.pr-history-sticky-header');
  if (existingHeader) existingHeader.remove();
  const existingPill = popup.querySelector('.pr-back-to-top-pill');
  if (existingPill) existingPill.remove();

  const inputArea = popup?.querySelector('.pr-agent-input');
  const limitBanner = popup?.querySelector('.pr-agent-limit-banner');

  const history = getChatHistory();
  const dates = Object.keys(history);

  // Build sticky header element (inserted into DOM inside the fade callback)
  const stickyHeader = document.createElement('div');
  stickyHeader.className = 'pr-history-sticky-header';
  stickyHeader.style.cssText = 'background:#fff;padding:10px 16px 0;border-bottom:1px solid #f0f0f0;flex-shrink:0;';

  const topBar = document.createElement('div');
  topBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';

  const backBtn = document.createElement('div');
  backBtn.style.cssText = 'display:inline-flex;align-items:center;gap:5px;color:#999;font-size:13px;font-weight:500;cursor:pointer;transition:color 0.15s;';
  backBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg> Back`;
  backBtn.addEventListener('mouseenter', () => backBtn.style.color = '#333');
  backBtn.addEventListener('mouseleave', () => backBtn.style.color = '#999');
  backBtn.addEventListener('click', () => navigateBackToChat(popup, messagesArea));

  let selectMode = false;
  const selectedMessages = new Set();

  const selectBtn = document.createElement('div');
  selectBtn.style.cssText = 'font-size:12px;font-weight:500;color:#999;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all 0.15s;';
  selectBtn.textContent = 'Select';
  selectBtn.addEventListener('mouseenter', () => { selectBtn.style.color = '#333'; selectBtn.style.background = '#f0f0f0'; });
  selectBtn.addEventListener('mouseleave', () => { selectBtn.style.color = selectMode ? BRAND.green : '#999'; selectBtn.style.background = selectMode ? BRAND.greenLight : 'transparent'; });

  topBar.appendChild(backBtn);
  topBar.appendChild(selectBtn);
  stickyHeader.appendChild(topBar);

  // Search bar
  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'position:relative;margin-bottom:10px;transform-origin:top center;overflow:hidden;max-height:50px;';
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
  stickyHeader.appendChild(searchWrap);

  fadeTransition(messagesArea, popup, 150, 200, () => {
    messagesArea.innerHTML = '';
    if (inputArea) inputArea.style.display = 'none';
    if (limitBanner) limitBanner.style.display = 'none';
    messagesArea.style.paddingTop = '8px';
    messagesArea.style.transform = 'translateY(0)';

    // Insert header now — after old content is gone
    popup.insertBefore(stickyHeader, messagesArea);

    const contentArea = document.createElement('div');
    contentArea.className = 'history-content-area';
    messagesArea.appendChild(contentArea);

    // Action bar
    const actionBar = document.createElement('div');
    actionBar.style.cssText = `position:sticky;bottom:0;background:rgba(30,30,35,0.96);backdrop-filter:blur(8px);padding:8px 12px;border-radius:10px;display:none;align-items:center;justify-content:space-between;margin-top:8px;gap:8px;`;

    const actionCount = document.createElement('span');
    actionCount.style.cssText = 'color:rgba(255,255,255,0.7);font-size:12px;font-weight:500;flex:1;';

    const actionBtns = document.createElement('div');
    actionBtns.style.cssText = 'display:flex;gap:6px;';

    const cancelSelBtn = document.createElement('button');
    cancelSelBtn.style.cssText = 'background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.8);border:none;padding:5px 11px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;';
    cancelSelBtn.textContent = 'Cancel';

    const pinSelBtn = document.createElement('button');
    pinSelBtn.style.cssText = `background:${BRAND.green};color:white;border:none;padding:5px 11px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;`;
    pinSelBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg> Pin`;

    const deleteSelBtn = document.createElement('button');
    deleteSelBtn.style.cssText = 'background:rgba(220,38,38,0.85);color:white;border:none;padding:5px 11px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;';
    deleteSelBtn.textContent = 'Delete';

    actionBtns.appendChild(cancelSelBtn);
    actionBtns.appendChild(pinSelBtn);
    actionBtns.appendChild(deleteSelBtn);
    actionBar.appendChild(actionCount);
    actionBar.appendChild(actionBtns);
    messagesArea.appendChild(actionBar);

    const backToTop = makeBackToTopPill(popup, messagesArea);

    function updateActionBar() {
      const count = selectedMessages.size;
      if (count > 0) {
        if (actionBar.style.display !== 'flex') {
          actionBar.style.display = 'flex'; actionBar.style.opacity = '0'; actionBar.style.transform = 'translateY(8px)';
          requestAnimationFrame(() => { actionBar.style.transition = 'opacity 0.2s,transform 0.2s'; actionBar.style.opacity = '1'; actionBar.style.transform = 'translateY(0)'; });
        }
        actionCount.textContent = `${count} selected`;
        pinSelBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg> Pin (${count})`;
        deleteSelBtn.textContent = `Delete (${count})`;
        hidePill(backToTop);
      } else {
        actionBar.style.transition = 'opacity 0.15s,transform 0.15s'; actionBar.style.opacity = '0'; actionBar.style.transform = 'translateY(8px)';
        setTimeout(() => { actionBar.style.display = 'none'; }, 150);
      }
    }

    function exitSelectMode() {
      selectMode = false; selectedMessages.clear();
      selectBtn.style.transition = 'color 0.2s, background 0.2s';
      selectBtn.textContent = 'Select'; selectBtn.style.color = '#999'; selectBtn.style.background = 'transparent';
      actionBar.style.transition = 'opacity 0.2s ease-in, transform 0.2s ease-in';
      actionBar.style.opacity = '0'; actionBar.style.transform = 'translateY(8px)';
      setTimeout(() => { actionBar.style.display = 'none'; }, 200);

      const circles = [...contentArea.querySelectorAll('.select-circle')];
      const rows = [...contentArea.querySelectorAll('[data-select-row]')];

      // Crossfade the whole content area so reflow is invisible
      contentArea.style.transition = 'opacity 0.15s ease-out';
      contentArea.style.opacity = '0';
      setTimeout(() => {
        circles.forEach(c => c.remove());
        rows.forEach(row => {
          row.style.transition = 'none';
          row.style.paddingLeft = '2px';
          row.style.background = 'transparent';
        });
        contentArea.style.transition = 'opacity 0.2s ease-in';
        contentArea.style.opacity = '1';
      }, 150);
    }

    function enterSelectMode() {
      selectMode = true;
      selectBtn.style.transition = 'color 0.2s, background 0.2s';
      selectBtn.textContent = 'Done'; selectBtn.style.color = BRAND.green; selectBtn.style.background = BRAND.greenLight;
      const rows = [...contentArea.querySelectorAll('[data-select-row]')];

      // Crossfade so the layout shift is invisible
      contentArea.style.transition = 'opacity 0.15s ease-out';
      contentArea.style.opacity = '0.3';
      setTimeout(() => {
        rows.forEach(row => {
          row.style.transition = 'none';
          row.style.paddingLeft = '28px';
          addSelectCircle(row);
        });
        contentArea.style.transition = 'opacity 0.2s ease-in';
        contentArea.style.opacity = '1';
      }, 150);
    }

    function addSelectCircle(row) {
      if (row.querySelector('.select-circle')) return;
      const key = row.getAttribute('data-select-key');
      const circle = document.createElement('div');
      circle.className = 'select-circle';
      // Fade + scale in alongside the padding slide
      // No entrance animation needed — contentArea crossfade covers it
      circle.style.cssText = 'position:absolute;left:4px;top:50%;transform:translateY(-50%);width:18px;height:18px;border-radius:50%;border:1.5px solid #ddd;cursor:pointer;display:flex;align-items:center;justify-content:center;background:white;transition:background 0.15s,border-color 0.15s,transform 0.15s cubic-bezier(0.34,1.3,0.64,1);';
      row.style.position = 'relative';
      row.appendChild(circle);

      circle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedMessages.has(key)) {
          selectedMessages.delete(key);
          circle.style.transform = 'translateY(-50%) scale(0.8)';
          setTimeout(() => { circle.style.transform = 'translateY(-50%) scale(1)'; }, 130);
          circle.style.background = 'white'; circle.style.borderColor = '#ddd'; circle.innerHTML = '';
          row.style.background = 'transparent';
        } else {
          selectedMessages.add(key);
          circle.style.transform = 'translateY(-50%) scale(1.3)';
          setTimeout(() => { circle.style.transform = 'translateY(-50%) scale(1)'; }, 130);
          circle.style.background = BRAND.green; circle.style.borderColor = BRAND.green;
          circle.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
          row.style.background = BRAND.greenLight;
        }
        updateActionBar();
      });
    }

    selectBtn.addEventListener('click', () => { if (selectMode) exitSelectMode(); else enterSelectMode(); });
    cancelSelBtn.addEventListener('click', () => exitSelectMode());

    pinSelBtn.addEventListener('click', () => {
      if (selectedMessages.size === 0) return;
      const pins = getPinnedSet();
      const alreadyPinned = [...selectedMessages].filter(k => pins.has(k)).length;
      const shouldPin = alreadyPinned < selectedMessages.size / 2;
      selectedMessages.forEach(key => {
        const [dk, idxStr] = key.split('::');
        const idx = parseInt(idxStr);
        const pairKey = getPairKey(dk, idx);
        if (shouldPin) { pins.add(key); if (pairKey) pins.add(pairKey); }
        else { pins.delete(key); if (pairKey) pins.delete(pairKey); }
        syncPinBtnUI(key, pins.has(key), true);
        if (pairKey) syncPinBtnUI(pairKey, pins.has(pairKey), true);
      });
      setPinnedSet(pins);
      exitSelectMode();
    });

    deleteSelBtn.addEventListener('click', () => {
      if (selectedMessages.size === 0) return;
      const hist = getChatHistory(), toDelete = {};
      selectedMessages.forEach(key => { const [dk,idx] = key.split('::'); if (!toDelete[dk]) toDelete[dk] = []; toDelete[dk].push(parseInt(idx)); });
      Object.entries(toDelete).forEach(([dk,indices]) => { if (!hist[dk]) return; indices.sort((a,b)=>b-a).forEach(i=>hist[dk].splice(i,1)); if (hist[dk].length===0) delete hist[dk]; });
      localStorage.setItem(CHAT_HISTORY.STORAGE_KEY, JSON.stringify(hist));
      const pins = getPinnedSet();
      selectedMessages.forEach(key => pins.delete(key));
      setPinnedSet(pins);
      exitSelectMode();
      fadeContent(contentArea, () => { contentArea.innerHTML = ''; renderFullHistory(contentArea, getChatHistory(), Object.keys(getChatHistory())); });
    });

    renderFullHistory(contentArea, history, dates);

    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      if (selectMode) exitSelectMode();
      searchTimeout = setTimeout(() => {
        const term = searchInput.value.trim();
        fadeContent(contentArea, () => {
          contentArea.innerHTML = '';
          if (!term) renderFullHistory(contentArea, history, dates);
          else renderSearchResults(contentArea, term, messagesArea);
        });
      }, 200);
    });

    const SCROLL_THRESHOLD = 150;
    let searchCollapsed = false;
    messagesArea.addEventListener('scroll', () => {
      const scrolled = messagesArea.scrollTop > SCROLL_THRESHOLD;

      if (scrolled && !searchCollapsed) {
        searchCollapsed = true;
        searchWrap.style.transition = 'opacity 0.3s cubic-bezier(0.4,0,0.2,1), max-height 0.35s cubic-bezier(0.4,0,0.2,1), margin-bottom 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1)';
        searchWrap.style.opacity = '0'; searchWrap.style.maxHeight = '0'; searchWrap.style.marginBottom = '0';
        searchWrap.style.transform = 'translateY(-4px) scaleY(0.95)'; searchWrap.style.pointerEvents = 'none';
      } else if (!scrolled && searchCollapsed) {
        searchCollapsed = false;
        searchWrap.style.transition = 'opacity 0.3s cubic-bezier(0.4,0,0.2,1), max-height 0.35s cubic-bezier(0.4,0,0.2,1), margin-bottom 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1)';
        searchWrap.style.opacity = '1'; searchWrap.style.maxHeight = '50px'; searchWrap.style.marginBottom = '10px';
        searchWrap.style.transform = 'translateY(0) scaleY(1)'; searchWrap.style.pointerEvents = '';
      }

      const actionBarVisible = actionBar.style.display === 'flex';
      if (scrolled && !actionBarVisible) showPill(backToTop);
      else hidePill(backToTop);
    });

    // Animate header in after a tiny delay
    requestAnimationFrame(() => {
      setTimeout(() => stickyHeader.classList.add('visible'), 40);
    });

    setTimeout(() => searchInput.focus(), 260);
  });
}

function renderFullHistory(container, history, dates) {
  if (dates.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:#bbb;font-size:13px;padding:40px 20px;">No messages yet</div>`;
    return;
  }
  const pins = getPinnedSet();
  [...dates].reverse().forEach(dateKey => {
    const dateHeader = document.createElement('div');
    dateHeader.style.cssText = 'font-size:11px;font-weight:600;color:#bbb;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0 4px;margin-top:6px;border-bottom:1px solid #f0f0f0;margin-bottom:8px;';
    dateHeader.textContent = dateKey;
    container.appendChild(dateHeader);

    history[dateKey].forEach((msg, idx) => {
      const key = `${dateKey}::${idx}`;
      const row = document.createElement('div');
      row.id = `hist-${dateKey.replace(/\s/g,'_')}-${idx}`;
      row.setAttribute('data-select-row', 'true');
      row.setAttribute('data-select-key', key);
      row.setAttribute('data-select-role', msg.role);
      const isUser = msg.role === 'user';
      row.style.cssText = `display:flex;flex-direction:column;align-items:${isUser?'flex-end':'flex-start'};margin-bottom:6px;transition:background 0.3s,padding-left 0.2s;padding:2px 4px;border-radius:8px;position:relative;`;

      if (!isUser && msg.comparisonData) {
        const cardWrap = document.createElement('div');
        cardWrap.id = row.id;
        cardWrap.setAttribute('data-select-row', 'true');
        cardWrap.setAttribute('data-select-key', key);
        cardWrap.setAttribute('data-select-role', msg.role);
        cardWrap.style.cssText = 'position:relative;margin-bottom:6px;transition:background 0.3s,padding-left 0.2s;';
        addComparisonCard(cardWrap, msg.comparisonData, true, key);
        const innerWrapper = cardWrap.firstChild;
        if (innerWrapper) {
          const metaRow = innerWrapper.lastChild;
          if (metaRow) { const timeEl = metaRow.firstChild; if (timeEl) timeEl.textContent = msg.time; }
        }
        container.appendChild(cardWrap);
      } else {
        const bubble = document.createElement('div');
        bubble.style.cssText = isUser
          ? `background:${BRAND.green};color:#fff;padding:8px 14px;border-radius:14px 14px 4px 14px;max-width:80%;font-size:13px;word-wrap:break-word;line-height:1.5;`
          : `background:#f5f5f5;color:#333;padding:8px 14px;border-radius:14px 14px 14px 4px;max-width:80%;font-size:13px;word-wrap:break-word;line-height:1.5;`;
        if (isUser) bubble.textContent = msg.text;
        else bubble.innerHTML = formatBotMessage(convertLinksToHTML(msg.text));

        const metaRow = document.createElement('div');
        metaRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:2px;padding:0 4px;';
        const time = document.createElement('div');
        time.style.cssText = 'font-size:10px;color:#ccc;';
        time.textContent = msg.time;

        const pinBtn = makePinButton(key);
        // In history, pins are always dimly visible; CSS class will handle pinned=full
        if (!pins.has(key)) pinBtn.style.opacity = '0.35';

        if (isUser) { metaRow.appendChild(pinBtn); metaRow.appendChild(time); }
        else { metaRow.appendChild(time); metaRow.appendChild(pinBtn); }

        row.appendChild(bubble);
        row.appendChild(metaRow);
        container.appendChild(row);
      }
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
      const key = `${dateKey}::${msgIndex}`;
      const card = document.createElement('div');
      card.style.cssText = 'background:#fafafa;border-radius:8px;padding:8px 12px;margin-bottom:4px;cursor:pointer;border:1px solid #f0f0f0;transition:all 0.15s;';

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
      const roleLabel = document.createElement('span');
      roleLabel.style.cssText = `font-size:10px;font-weight:700;color:${isUser?BRAND.green:'#888'};text-transform:uppercase;letter-spacing:0.03em;`;
      roleLabel.textContent = isUser ? 'You' : 'Agent';
      const rightMeta = document.createElement('div');
      rightMeta.style.cssText = 'display:flex;align-items:center;gap:6px;';
      const timeLabel = document.createElement('span');
      timeLabel.style.cssText = 'font-size:10px;color:#ccc;';
      timeLabel.textContent = msg.time;
      const pinBtn = makePinButton(key);
      if (!getPinnedSet().has(key)) pinBtn.style.opacity = '0.35';
      rightMeta.appendChild(timeLabel);
      rightMeta.appendChild(pinBtn);
      topRow.appendChild(roleLabel);
      topRow.appendChild(rightMeta);

      const snippetEl = document.createElement('div');
      snippetEl.style.cssText = 'font-size:12px;color:#555;line-height:1.4;margin-top:3px;';
      snippetEl.innerHTML = highlightTerm(getSnippet(normalizeText(msg.text), term, 90), term);

      card.appendChild(topRow);
      card.appendChild(snippetEl);
      card.addEventListener('mouseenter', () => { card.style.borderColor = BRAND.green; card.style.background = BRAND.greenLight; });
      card.addEventListener('mouseleave', () => { card.style.borderColor = '#f0f0f0'; card.style.background = '#fafafa'; });
      card.addEventListener('click', () => {
        fadeContent(container, () => {
          container.innerHTML = '';
          renderFullHistory(container, getChatHistory(), Object.keys(getChatHistory()));
          const targetId = `hist-${dateKey.replace(/\s/g,'_')}-${msgIndex}`;
          setTimeout(() => {
            const target = container.querySelector(`#${CSS.escape(targetId)}`);
            if (target) { target.scrollIntoView({behavior:'smooth',block:'center'}); target.style.background = BRAND.greenLight; setTimeout(()=>{target.style.background='transparent';},1500); }
          }, 80);
          const si = messagesArea.querySelector('input[type="text"]');
          if (si) si.value = '';
        });
      });
      container.appendChild(card);
    });
  });
}

// ==================== PINNED VIEW ====================
function renderPinnedView(messagesArea) {
  const popup = messagesArea.closest('.pr-agent-popup');
  const existingHeader = popup.querySelector('.pr-history-sticky-header');
  if (existingHeader) existingHeader.remove();
  const existingPill = popup.querySelector('.pr-back-to-top-pill');
  if (existingPill) existingPill.remove();

  const inputArea = popup?.querySelector('.pr-agent-input');
  const limitBanner = popup?.querySelector('.pr-agent-limit-banner');

  // Build sticky header
  const stickyHeader = document.createElement('div');
  stickyHeader.className = 'pr-history-sticky-header';
  stickyHeader.style.cssText = 'background:#fff;padding:10px 16px 0;border-bottom:1px solid #f0f0f0;flex-shrink:0;';

  const topBar = document.createElement('div');
  topBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';

  const backBtn = document.createElement('div');
  backBtn.style.cssText = 'display:inline-flex;align-items:center;gap:5px;color:#999;font-size:13px;font-weight:500;cursor:pointer;transition:color 0.15s;';
  backBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg> Back`;
  backBtn.addEventListener('mouseenter', () => backBtn.style.color = '#333');
  backBtn.addEventListener('mouseleave', () => backBtn.style.color = '#999');
  backBtn.addEventListener('click', () => navigateBackToChat(popup, messagesArea));

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `font-size:12px;font-weight:600;color:${BRAND.green};display:flex;align-items:center;gap:5px;`;
  titleEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg> Pinned`;

  topBar.appendChild(backBtn);
  topBar.appendChild(titleEl);
  stickyHeader.appendChild(topBar);

  // Search bar for pinned view
  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'position:relative;margin-bottom:10px;transform-origin:top center;overflow:hidden;max-height:50px;';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search pinned…';
  searchInput.style.cssText = `width:100%;padding:9px 12px 9px 32px;border:1px solid #e8e8e8;border-radius:10px;font-size:13px;outline:none;background:#fafafa;transition:all 0.15s;box-sizing:border-box;`;
  searchInput.addEventListener('focus', () => { searchInput.style.borderColor = BRAND.green; searchInput.style.background = '#fff'; });
  searchInput.addEventListener('blur', () => { if (!searchInput.value) { searchInput.style.borderColor = '#e8e8e8'; searchInput.style.background = '#fafafa'; }});
  const searchIcon = document.createElement('div');
  searchIcon.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  searchIcon.style.cssText = 'position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;';
  searchWrap.appendChild(searchIcon);
  searchWrap.appendChild(searchInput);
  stickyHeader.appendChild(searchWrap);

  fadeTransition(messagesArea, popup, 150, 200, () => {
    messagesArea.innerHTML = '';
    if (inputArea) inputArea.style.display = 'none';
    if (limitBanner) limitBanner.style.display = 'none';
    messagesArea.style.paddingTop = '8px';
    messagesArea.style.transform = 'translateY(0)';

    // Insert header now — after old content is gone
    popup.insertBefore(stickyHeader, messagesArea);

    const contentArea = document.createElement('div');
    messagesArea.appendChild(contentArea);

    const backToTop = makeBackToTopPill(popup, messagesArea);

    const SCROLL_THRESHOLD = 150;
    let searchCollapsed = false;
    messagesArea.addEventListener('scroll', () => {
      const scrolled = messagesArea.scrollTop > SCROLL_THRESHOLD;
      if (scrolled && !searchCollapsed) {
        searchCollapsed = true;
        searchWrap.style.transition = 'opacity 0.3s cubic-bezier(0.4,0,0.2,1), max-height 0.35s cubic-bezier(0.4,0,0.2,1), margin-bottom 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1)';
        searchWrap.style.opacity = '0'; searchWrap.style.maxHeight = '0'; searchWrap.style.marginBottom = '0';
        searchWrap.style.transform = 'translateY(-4px) scaleY(0.95)'; searchWrap.style.pointerEvents = 'none';
      } else if (!scrolled && searchCollapsed) {
        searchCollapsed = false;
        searchWrap.style.transition = 'opacity 0.3s cubic-bezier(0.4,0,0.2,1), max-height 0.35s cubic-bezier(0.4,0,0.2,1), margin-bottom 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1)';
        searchWrap.style.opacity = '1'; searchWrap.style.maxHeight = '50px'; searchWrap.style.marginBottom = '10px';
        searchWrap.style.transform = 'translateY(0) scaleY(1)'; searchWrap.style.pointerEvents = '';
      }
      if (scrolled) showPill(backToTop); else hidePill(backToTop);
    });

    function renderPinnedContent(filteredKeys) {
      fadeContent(contentArea, () => {
        contentArea.innerHTML = '';
        const pins = filteredKeys || getPinnedSet();

        if (pins.size === 0 && !filteredKeys) {
          contentArea.innerHTML = `
            <div style="text-align:center;padding:50px 20px;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:10px;"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>
              <div style="color:#bbb;font-size:13px;margin-top:4px;">No pinned messages yet</div>
              <div style="color:#ccc;font-size:12px;margin-top:6px;line-height:1.5;">Hover over any message<br>and tap the pin icon to save it here.</div>
            </div>`;
          return;
        }

        const history = getChatHistory();
        const byDate = {};

        // If filteredKeys is a Set of key strings from search, use those; else all pins
        const keySet = filteredKeys instanceof Set ? filteredKeys : getPinnedSet();
        keySet.forEach(key => {
          const [dateKey, idxStr] = key.split('::');
          const idx = parseInt(idxStr);
          if (history[dateKey] && history[dateKey][idx]) {
            if (!byDate[dateKey]) byDate[dateKey] = [];
            if (!byDate[dateKey].find(e => e.key === key)) {
              byDate[dateKey].push({ key, idx, msg: history[dateKey][idx] });
            }
          }
        });

        const sortedDates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));

        if (sortedDates.length === 0) {
          contentArea.innerHTML = `<div style="text-align:center;color:#bbb;font-size:13px;padding:40px 20px;">No results found</div>`;
          return;
        }

        sortedDates.forEach(dateKey => {
          const dateHeader = document.createElement('div');
          dateHeader.style.cssText = 'font-size:11px;font-weight:600;color:#bbb;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0 4px;margin-top:6px;border-bottom:1px solid #f0f0f0;margin-bottom:8px;';
          dateHeader.textContent = dateKey;
          contentArea.appendChild(dateHeader);

          byDate[dateKey].sort((a, b) => a.idx - b.idx).forEach(({ key, msg }) => {
            const isUser = msg.role === 'user';

            if (!isUser && msg.comparisonData) {
              const cardWrap = document.createElement('div');
              cardWrap.style.cssText = 'position:relative;margin-bottom:6px;';
              addComparisonCard(cardWrap, msg.comparisonData, true, null);
              const innerWrapper = cardWrap.firstChild;
              if (innerWrapper) {
                const metaRow = innerWrapper.lastChild;
                if (metaRow) {
                  const timeEl = metaRow.firstChild;
                  if (timeEl) timeEl.textContent = msg.time;
                  const existingPin = metaRow.querySelector('.pr-pin-btn');
                  if (existingPin) existingPin.remove();
                  const unpinBtn = makeUnpinButton(key, () => renderPinnedContent());
                  metaRow.appendChild(unpinBtn);
                }
              }
              contentArea.appendChild(cardWrap);
            } else {
              const row = document.createElement('div');
              row.style.cssText = `display:flex;flex-direction:column;align-items:${isUser?'flex-end':'flex-start'};margin-bottom:10px;`;

              const bubble = document.createElement('div');
              bubble.style.cssText = isUser
                ? `background:${BRAND.green};color:#fff;padding:8px 14px;border-radius:14px 14px 4px 14px;max-width:82%;font-size:13px;word-wrap:break-word;line-height:1.5;`
                : `background:#f5f5f5;color:#333;padding:8px 14px;border-radius:14px 14px 14px 4px;max-width:82%;font-size:13px;word-wrap:break-word;line-height:1.5;`;
              if (isUser) bubble.textContent = msg.text;
              else bubble.innerHTML = formatBotMessage(convertLinksToHTML(msg.text));

              const metaRow = document.createElement('div');
              metaRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:2px;padding:0 4px;';
              const time = document.createElement('div');
              time.style.cssText = 'font-size:10px;color:#ccc;';
              time.textContent = msg.time;

              const unpinBtn = makeUnpinButton(key, () => renderPinnedContent());

              if (isUser) { metaRow.appendChild(unpinBtn); metaRow.appendChild(time); }
              else { metaRow.appendChild(time); metaRow.appendChild(unpinBtn); }

              row.appendChild(bubble);
              row.appendChild(metaRow);
              contentArea.appendChild(row);
            }
          });
        });
      });
    }

    // Initial render — not through fadeContent since we're already fading in the whole view
    contentArea.innerHTML = '';
    (() => {
      const pins = getPinnedSet();
      if (pins.size === 0) {
        contentArea.innerHTML = `
          <div style="text-align:center;padding:50px 20px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:10px;"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>
            <div style="color:#bbb;font-size:13px;margin-top:4px;">No pinned messages yet</div>
            <div style="color:#ccc;font-size:12px;margin-top:6px;line-height:1.5;">Hover over any message<br>and tap the pin icon to save it here.</div>
          </div>`;
        return;
      }
      const history = getChatHistory();
      const byDate = {};
      pins.forEach(key => {
        const [dateKey, idxStr] = key.split('::');
        const idx = parseInt(idxStr);
        if (history[dateKey] && history[dateKey][idx]) {
          if (!byDate[dateKey]) byDate[dateKey] = [];
          if (!byDate[dateKey].find(e => e.key === key)) byDate[dateKey].push({ key, idx, msg: history[dateKey][idx] });
        }
      });
      const sortedDates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));
      sortedDates.forEach(dateKey => {
        const dateHeader = document.createElement('div');
        dateHeader.style.cssText = 'font-size:11px;font-weight:600;color:#bbb;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0 4px;margin-top:6px;border-bottom:1px solid #f0f0f0;margin-bottom:8px;';
        dateHeader.textContent = dateKey;
        contentArea.appendChild(dateHeader);
        byDate[dateKey].sort((a, b) => a.idx - b.idx).forEach(({ key, msg }) => {
          const isUser = msg.role === 'user';
          const row = document.createElement('div');
          row.style.cssText = `display:flex;flex-direction:column;align-items:${isUser?'flex-end':'flex-start'};margin-bottom:10px;`;
          const bubble = document.createElement('div');
          bubble.style.cssText = isUser
            ? `background:${BRAND.green};color:#fff;padding:8px 14px;border-radius:14px 14px 4px 14px;max-width:82%;font-size:13px;word-wrap:break-word;line-height:1.5;`
            : `background:#f5f5f5;color:#333;padding:8px 14px;border-radius:14px 14px 14px 4px;max-width:82%;font-size:13px;word-wrap:break-word;line-height:1.5;`;
          if (isUser) bubble.textContent = msg.text;
          else bubble.innerHTML = formatBotMessage(convertLinksToHTML(msg.text));
          const metaRow = document.createElement('div');
          metaRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:2px;padding:0 4px;';
          const time = document.createElement('div');
          time.style.cssText = 'font-size:10px;color:#ccc;';
          time.textContent = msg.time;
          const unpinBtn = makeUnpinButton(key, () => renderPinnedContent());
          if (isUser) { metaRow.appendChild(unpinBtn); metaRow.appendChild(time); }
          else { metaRow.appendChild(time); metaRow.appendChild(unpinBtn); }
          row.appendChild(bubble);
          row.appendChild(metaRow);
          contentArea.appendChild(row);
        });
      });
    })();

    // Search
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const term = searchInput.value.trim();
        if (!term) {
          renderPinnedContent(); // re-render all pinned with fade
        } else {
          const results = searchPinned(term);
          const filteredKeys = new Set(results.map(r => r.key));
          // Render filtered — use a local fade without the outer fadeContent wrapper
          contentArea.style.transition = 'opacity 0.12s ease-out';
          contentArea.style.opacity = '0';
          setTimeout(() => {
            contentArea.innerHTML = '';
            if (results.length === 0) {
              contentArea.innerHTML = `<div style="text-align:center;color:#bbb;font-size:13px;padding:40px 20px;">No pinned results for "${term.replace(/</g,'&lt;')}"</div>`;
            } else {
              // Group by date
              const byDate = {};
              results.forEach(r => {
                if (!byDate[r.dateKey]) byDate[r.dateKey] = [];
                if (!byDate[r.dateKey].find(e => e.key === r.key)) byDate[r.dateKey].push(r);
              });
              const history = getChatHistory();
              Object.keys(byDate).sort((a,b)=>new Date(b)-new Date(a)).forEach(dateKey => {
                const dh = document.createElement('div');
                dh.style.cssText = 'font-size:11px;font-weight:600;color:#bbb;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0 4px;margin-top:6px;border-bottom:1px solid #f0f0f0;margin-bottom:8px;';
                dh.textContent = dateKey;
                contentArea.appendChild(dh);
                byDate[dateKey].sort((a,b)=>a.idx-b.idx).forEach(({ key, idx, msg }) => {
                  const isUser = msg.role === 'user';
                  const card = document.createElement('div');
                  card.style.cssText = 'background:#fafafa;border-radius:8px;padding:8px 12px;margin-bottom:4px;border:1px solid #f0f0f0;';
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
                  contentArea.appendChild(card);
                });
              });
            }
            contentArea.style.transition = 'opacity 0.15s ease-in';
            contentArea.style.opacity = '1';
          }, 120);
        }
      }, 200);
    });

    // Animate header in
    requestAnimationFrame(() => {
      setTimeout(() => stickyHeader.classList.add('visible'), 40);
    });

    setTimeout(() => searchInput.focus(), 260);
  });
}

// Unpin button used inside the pinned view
function makeUnpinButton(key, onUnpin) {
  const btn = document.createElement('button');
  btn.className = 'pr-pin-btn pinned';
  btn.title = 'Unpin';
  btn.style.opacity = '1';
  btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 1.5 7L12 17l-5.5 3L8 13 4 9h5z"/></svg>`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const [dateKey, idxStr] = key.split('::');
    const idx = parseInt(idxStr);
    const pairKey = getPairKey(dateKey, idx);
    const pins = getPinnedSet();
    pins.delete(key);
    if (pairKey) pins.delete(pairKey);
    setPinnedSet(pins);
    // Sync all live pin buttons for this key and pair
    syncPinBtnUI(key, false, false);
    if (pairKey) syncPinBtnUI(pairKey, false, false);
    if (onUnpin) onUnpin();
  });
  return btn;
}

// ==================== WELCOME STATE ====================
function renderWelcomeState(messagesArea) {
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

  const chips = document.createElement('div');
  chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;';
  ['Compare professors', 'Compare classes', 'Who is the best professor?', 'Course difficulty'].forEach(label => {
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
}

// ==================== CHAT MESSAGES ====================
function addUserMessage(container, message) {
  const wrapper = document.createElement('div');
  wrapper.className = 'pr-msg-wrapper';
  wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;margin-bottom:10px;animation:agentSlideInR 0.25s ease-out;';
  const bubble = document.createElement('div');
  bubble.style.cssText = `background:${BRAND.green};color:#fff;padding:10px 14px;border-radius:16px 16px 4px 16px;margin-left:48px;font-size:13px;word-wrap:break-word;line-height:1.5;`;
  bubble.textContent = message;

  saveChatMessage('user', message);
  const history = getChatHistory();
  const now = new Date();
  const dateKey = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const idx = (history[dateKey] || []).length - 1;
  const pinKey = `${dateKey}::${idx}`;

  const metaRow = document.createElement('div');
  metaRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:2px;padding:0 4px;';
  const time = document.createElement('div');
  time.style.cssText = 'font-size:10px;color:#ccc;';
  time.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const pinBtn = makePinButton(pinKey);
  metaRow.appendChild(pinBtn);
  metaRow.appendChild(time);

  wrapper.appendChild(bubble);
  wrapper.appendChild(metaRow);
  container.appendChild(wrapper);
  if (container.scrollTop !== undefined && container.className === "agent-messages") container.scrollTop = container.scrollHeight;
}

function addBotMessage(container, message) {
  saveChatMessage('bot', message);
  const history = getChatHistory();
  const now = new Date();
  const dateKey = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const idx = (history[dateKey] || []).length - 1;
  const pinKey = `${dateKey}::${idx}`;

  const wrapper = document.createElement('div');
  wrapper.className = 'pr-msg-wrapper';
  wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;margin-bottom:10px;animation:agentSlideInL 0.25s ease-out;';
  const bubble = document.createElement('div');
  bubble.style.cssText = 'background:#f5f5f5;color:#333;padding:10px 14px;border-radius:16px 16px 16px 4px;margin-right:48px;font-size:13px;word-wrap:break-word;line-height:1.6;';
  bubble.innerHTML = formatBotMessage(convertLinksToHTML(message));

  const metaRow = document.createElement('div');
  metaRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:2px;padding:0 4px;';
  const time = document.createElement('div');
  time.style.cssText = 'font-size:10px;color:#ccc;';
  time.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const pinBtn = makePinButton(pinKey);
  metaRow.appendChild(time);
  metaRow.appendChild(pinBtn);

  wrapper.appendChild(bubble);
  wrapper.appendChild(metaRow);
  container.appendChild(wrapper);
  if (container.scrollTop !== undefined && container.className === "agent-messages") container.scrollTop = container.scrollHeight;
}

function addTypingIndicator(container) {
  const id = 'typing-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.style.cssText = 'display:flex;align-items:center;gap:6px;padding:10px 14px;background:#f5f5f5;border-radius:16px 16px 16px 4px;margin-right:48px;margin-bottom:10px;width:fit-content;animation:agentSlideInL 0.2s ease-out;';
  el.innerHTML = `<div style="display:flex;gap:3px;">${[0,0.15,0.3].map(d=>`<div style="width:5px;height:5px;border-radius:50%;background:#999;animation:agentTyping 1.2s infinite ease-in-out ${d}s;"></div>`).join('')}</div>`;
  container.appendChild(el);
  if (container.scrollTop !== undefined && container.className === "agent-messages") container.scrollTop = container.scrollHeight;
  return id;
}

// ==================== MAIN POPUP ====================
function openAgentPopup(button) {
  const btnLabel = button.querySelector('.cx-MuiButton-label');
  if (btnLabel) btnLabel.textContent = 'agent';
  button.style.background = BRAND.green;

  const popup = document.createElement('div');
  popup.className = 'pr-agent-popup';

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

  // Drag
  let isDragging = false, startX, startY, initLeft, initTop;
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.pr-agent-close') || e.target.closest('.pr-agent-history-btn') || e.target.closest('.pr-agent-pinned-btn')) return;
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

  const messagesArea = document.createElement('div');
  messagesArea.className = 'agent-messages';
  messagesArea.style.cssText = 'flex:1;padding:16px;overflow-y:auto;background:#fff;display:flex;flex-direction:column;';
  renderWelcomeState(messagesArea);

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
          saveChatMessage("bot", historyText, result.data);
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

  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);
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