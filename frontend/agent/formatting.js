// ==================== TEXT FORMATTING ====================

function convertLinksToHTML(text) {
  if (!text || typeof text !== 'string') return text;
  const escaped = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
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
  return text.split('\n\n').filter(p => p.trim()).map(para => {
    if (para.includes('\n- ') || para.includes('\n• ')) {
      const items = para.split(/\n[-•]\s+/).filter(i => i.trim());
      return `<ul style="margin:6px 0;padding-left:20px;font-size:13px;line-height:1.6;">${items.map(i=>`<li>${i.trim()}</li>`).join('')}</ul>`;
    }
    return `<p style="margin:6px 0;font-size:13px;line-height:1.6;">${para.trim()}</p>`;
  }).join('');
}

// ==================== SEARCH HELPERS ====================

function normalizeText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1')
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g,'-')
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g,' ')
    .replace(/[\u201C-\u201F\u2033\u2036]/g,'"')
    .replace(/[\u2018-\u201B\u2032\u2035]/g,"'");
}

function highlightTerm(text, term) {
  if (!term || !text) return text;
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return text.replace(new RegExp(`(${esc})`,'gi'), '<mark style="background:#FDE68A;color:#000;border-radius:2px;padding:0 1px;">$1</mark>');
}

function getSnippet(text, term, maxLen = 80) {
  if (!term) return text.length > maxLen ? text.substring(0,maxLen)+'…' : text;
  const nt = normalizeText(text).toLowerCase(), nq = normalizeText(term).toLowerCase();
  const idx = nt.indexOf(nq);
  if (idx === -1) return text.length > maxLen ? text.substring(0,maxLen)+'…' : text;
  const half = Math.floor((maxLen - term.length) / 2);
  let start = Math.max(0, idx - half), end = Math.min(text.length, start + maxLen);
  if (start > 0) start = Math.max(0, end - maxLen);
  let snippet = text.substring(start, end);
  if (start > 0) snippet = '…' + snippet;
  if (end < text.length) snippet += '…';
  return snippet;
}

function searchHistory(term) {
  const history = getChatHistory(), results = [], nq = normalizeText(term).toLowerCase();
  Object.keys(history).reverse().forEach(dateKey => {
    history[dateKey].forEach((msg, i) => {
      const nm = normalizeText(msg.text).toLowerCase();
      if (nm.includes(nq) || dateKey.toLowerCase().includes(nq)) results.push({ dateKey, msgIndex: i, msg });
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
    if (nm.includes(nq) || dateKey.toLowerCase().includes(nq)) results.push({ key, dateKey, idx, msg });
  });
  return results;
}