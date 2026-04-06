// ==================== STORAGE ====================
const CHAT_HISTORY = { STORAGE_KEY: 'pr_agent_history' };

// ---------- Chat history ----------
function saveChatMessage(role, text, comparisonData) {
  const now = new Date();
  const dateKey = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let history = {};
  try { const s = localStorage.getItem(CHAT_HISTORY.STORAGE_KEY); if (s) history = JSON.parse(s); } catch(e) {}
  if (!history[dateKey]) history[dateKey] = [];
  const entry = { role, text, time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) };
  if (comparisonData) entry.comparisonData = comparisonData;
  history[dateKey].push(entry);
  localStorage.setItem(CHAT_HISTORY.STORAGE_KEY, JSON.stringify(history));
}

function getChatHistory() {
  try { const s = localStorage.getItem(CHAT_HISTORY.STORAGE_KEY); return s ? JSON.parse(s) : {}; } catch(e) { return {}; }
}

// ---------- Pinned ----------
function getPinnedSet() {
  try { const s = localStorage.getItem(PINNED_STORAGE_KEY); return s ? new Set(JSON.parse(s)) : new Set(); } catch(e) { return new Set(); }
}

function setPinnedSet(set) {
  localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...set]));
}

// Returns the key of the paired message (user↔bot) for a given key
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

// ---------- Pin toggle ----------
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

  const nowPinned = pins.has(key);
  syncPinBtnUI(key, nowPinned, true);
  if (pairKey) syncPinBtnUI(pairKey, pins.has(pairKey), true);

  return nowPinned;
}

// ---------- Reset ----------
function resetAgentUsage() {
  localStorage.removeItem(CHAT_HISTORY.STORAGE_KEY);
  localStorage.removeItem(PINNED_STORAGE_KEY);
  console.log('🔄 Agent history + pins reset');
}