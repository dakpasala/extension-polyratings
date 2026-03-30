// ==================== CONFLICT CHECKER ====================
const SCHEDULE_STORAGE_KEY = 'pr_schedule_map';

// ==================== TIME UTILITIES ====================

function parseTime(timeStr) {
  if (!timeStr || timeStr === '-' || timeStr.toLowerCase() === 'tba') return null;
  const match = timeStr.trim().toLowerCase().match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  if (match[3] === 'pm' && hours !== 12) hours += 12;
  if (match[3] === 'am' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function expandDays(dayStr) {
  if (!dayStr || dayStr === '-' || dayStr.toLowerCase() === 'tba') return [];
  const dayMap = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const days = [];
  let i = 0;
  while (i < dayStr.length) {
    const two = dayStr.substring(i, i + 2);
    if (dayMap.includes(two)) { days.push(two); i += 2; }
    else i++;
  }
  return days;
}

function timesOverlap(slot1, slot2) {
  const days1 = expandDays(slot1.days);
  const days2 = expandDays(slot2.days);
  if (days1.length === 0 || days2.length === 0) return false;
  if (!days1.some(d => days2.includes(d))) return false;
  const s1 = parseTime(slot1.start), e1 = parseTime(slot1.end);
  const s2 = parseTime(slot2.start), e2 = parseTime(slot2.end);
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false;
  return s1 < e2 && s2 < e1;
}

function formatTimeRange(slot) {
  return `${slot.days} ${slot.start}–${slot.end}`;
}

// ==================== SCHEDULE STORAGE ====================

function getScheduleMap() {
  try { return JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveScheduleMap(map) {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(map));
}
function addSectionToSchedule(courseCode, sectionData) {
  const map = getScheduleMap();
  if (!map[courseCode]) map[courseCode] = [];
  map[courseCode] = map[courseCode].filter(s => s.section !== sectionData.section);
  map[courseCode].push(sectionData);
  saveScheduleMap(map);
}
function removeSectionFromSchedule(courseCode, sectionName) {
  const map = getScheduleMap();
  if (!map[courseCode]) return;
  map[courseCode] = map[courseCode].filter(s => s.section !== sectionName);
  if (map[courseCode].length === 0) delete map[courseCode];
  saveScheduleMap(map);
}
function removeCourseFromSchedule(courseCode) {
  const map = getScheduleMap();
  delete map[courseCode];
  saveScheduleMap(map);
}

// ==================== DOM PARSING ====================

function getCourseCodeFromRow(row) {
  let el = row.parentElement;
  let depth = 0;
  while (el && depth < 30) {
    const buttons = el.querySelectorAll('button.cx-MuiLink-button, .cx-MuiLink-button');
    for (const btn of buttons) {
      const text = btn.textContent.trim();
      if (/^[A-Z]{2,4}\s+\d{3}/.test(text)) return text;
    }
    el = el.parentElement;
    depth++;
  }
  return '';
}

function readCellText(cell) {
  if (!cell) return '';
  const roleCell = cell.querySelector('[role="cell"]');
  const target = roleCell || cell;
  const ariaDiv = target.querySelector('[aria-hidden="true"]');
  if (ariaDiv) return ariaDiv.textContent.trim();
  const clone = target.cloneNode(true);
  clone.querySelectorAll('[data-polyratings], .polyratings-rating-element, .pr-conflict-badge').forEach(n => n.remove());
  return clone.textContent.trim();
}

function extractSectionFromRow(sectionRow) {
  const headerEl = sectionRow.querySelector('[role="rowheader"]');
  let sectionName = '';
  if (headerEl) {
    const ariaDiv = headerEl.querySelector('[aria-hidden="true"]');
    sectionName = ariaDiv ? ariaDiv.textContent.trim() : '';
  }
  if (!sectionName) return null;

  const xs5 = sectionRow.querySelector('.cx-MuiGrid-grid-xs-5');
  if (!xs5) return null;
  const xs4Cells = xs5.querySelectorAll('.cx-MuiGrid-grid-xs-4');
  if (xs4Cells.length < 4) return null;

  const days = readCellText(xs4Cells[1]);
  const start = readCellText(xs4Cells[2]);
  const end = readCellText(xs4Cells[3]);

  const checkbox = sectionRow.querySelector('input[type="checkbox"]');
  const isChecked = checkbox?.getAttribute('aria-checked') === 'true';
  const courseCode = getCourseCodeFromRow(sectionRow);

  const hasTimes = !!(days && start && end && days !== '-' && start !== '-' && end !== '-'
    && !days.toLowerCase().includes('tba'));

  return { section: sectionName, days, start, end, isChecked, courseCode, hasTimes };
}

function getAllVisibleSectionRows() {
  return Array.from(document.querySelectorAll('[role="row"]')).filter(row => {
    const header = row.querySelector('[role="rowheader"]');
    return header && /\d{2}-/.test(header.textContent || '');
  });
}

// ==================== CONFLICT DETECTION ====================

function findConflicts(sectionData) {
  const map = getScheduleMap();
  const conflicts = [];

  if (!sectionData.hasTimes) {
    return { hasConflict: false, conflictsWith: [], noTime: true };
  }

  Object.entries(map).forEach(([courseCode, sections]) => {
    // Don't conflict with own course
    if (courseCode === sectionData.courseCode) return;
    sections.forEach(slot => {
      if (timesOverlap(sectionData, slot)) {
        conflicts.push({ course: courseCode, section: slot.section, days: slot.days, start: slot.start, end: slot.end });
      }
    });
  });

  return { hasConflict: conflicts.length > 0, conflictsWith: conflicts, noTime: false };
}

// ==================== BADGE UI ====================

function injectConflictStyles() {
  if (document.querySelector('#pr-conflict-styles')) return;
  const style = document.createElement('style');
  style.id = 'pr-conflict-styles';
  style.textContent = `
    @keyframes conflictFadeIn {
      from { opacity: 0; transform: translateY(4px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .pr-conflict-badge {
      animation: conflictFadeIn 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);
}

function createConflictBadge(conflictResult, sectionData) {
  injectConflictStyles();

  const badge = document.createElement('span');
  badge.className = 'pr-conflict-badge';
  badge.setAttribute('data-pr-conflict', 'true');

  const baseStyle = `
    display: inline-flex; align-items: center; gap: 3px;
    padding: 3px 8px; border-radius: 12px;
    font-size: 12px; font-weight: 500;
    white-space: nowrap;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    cursor: default;
    max-width: calc(100% - 4px); width: fit-content;
  `;

  if (!sectionData.hasTimes) {
    badge.style.cssText = baseStyle + `
      background: rgba(245, 245, 245, 0.9); color: #999;
      border: 1px solid #ddd;
    `;
    badge.textContent = '— No time set';
  } else if (conflictResult.hasConflict) {
    const courses = conflictResult.conflictsWith
      .map(c => c.course).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    badge.style.cssText = baseStyle + `
      background: rgba(254, 226, 226, 0.9); color: #DC2626;
      border: 1px solid #FECACA;
    `;
    badge.innerHTML = `⚠ Conflict · ${courses}`;
    badge.title = conflictResult.conflictsWith
      .map(c => `${c.course} ${c.section}: ${formatTimeRange(c)}`).join('\n');
  } else {
    badge.style.cssText = baseStyle + `
      background: rgba(209, 250, 229, 0.9); color: #059669;
      border: 1px solid #A7F3D0;
    `;
    badge.innerHTML = `✓ Available`;
  }

  return badge;
}

function injectBadgeOnRow(sectionRow, conflictResult, sectionData) {
  // Remove existing badges from this row
  sectionRow.querySelectorAll('.pr-conflict-badge').forEach(b => b.remove());

  const badge = createConflictBadge(conflictResult, sectionData);

  // Target: the START TIME cell (xs-4 index 2 inside xs-5 > xs-12)
  // We create a wrapper div below it so the badge appears on a new line
  const xs5 = sectionRow.querySelector('.cx-MuiGrid-grid-xs-5');
  if (!xs5) return;
  const xs4Cells = xs5.querySelectorAll('.cx-MuiGrid-grid-xs-4');
  if (xs4Cells.length < 3) return;

  const startTimeCell = xs4Cells[2]; // the "3:10 pm" cell

  // Find or create a badge container below the cell content
  let badgeContainer = startTimeCell.querySelector('.pr-conflict-badge-wrap');
  if (!badgeContainer) {
    badgeContainer = document.createElement('div');
    badgeContainer.className = 'pr-conflict-badge-wrap';
    badgeContainer.style.cssText = 'width: 100%; margin-top: 4px;';
    startTimeCell.appendChild(badgeContainer);
  }
  badgeContainer.innerHTML = '';
  badgeContainer.appendChild(badge);
}

// ==================== MAIN SCANNING LOGIC ====================

function scanAndUpdateConflicts() {
  const sectionRows = getAllVisibleSectionRows();
  if (sectionRows.length === 0) return;

  // Pass 1: Store all checked sections into schedule map
  sectionRows.forEach(row => {
    const data = extractSectionFromRow(row);
    if (!data || !data.section) return;

    if (data.isChecked && data.hasTimes && data.courseCode) {
      addSectionToSchedule(data.courseCode, {
        section: data.section, days: data.days, start: data.start, end: data.end,
      });
    }
    if (!data.isChecked && data.courseCode) {
      removeSectionFromSchedule(data.courseCode, data.section);
    }
  });

  // Pass 2: Inject badges on ALL rows (checked and unchecked)
  sectionRows.forEach(row => {
    const data = extractSectionFromRow(row);
    if (!data || !data.section) return;

    const result = findConflicts(data);
    injectBadgeOnRow(row, result, data);
  });
}

// ==================== EVENT HANDLERS ====================

function setupDeleteListeners() {
  document.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[title="Delete course"] button, [title="Delete course"]');
    if (!deleteBtn) return;
    const courseRow = deleteBtn.closest('.cx-MuiPaper-root');
    if (!courseRow) return;
    const courseBtn = courseRow.querySelector('button.cx-MuiLink-button');
    if (!courseBtn) return;
    const courseCode = courseBtn.textContent.trim();
    if (courseCode) {
      setTimeout(() => { removeCourseFromSchedule(courseCode); scanAndUpdateConflicts(); }, 300);
    }
  }, true);
}

function setupCheckboxListeners() {
  document.addEventListener('click', (e) => {
    const checkboxSpan = e.target.closest('.cx-MuiCheckbox-root');
    if (!checkboxSpan) return;
    const row = checkboxSpan.closest('[role="row"]');
    if (!row || !row.querySelector('[role="rowheader"]')) return;
    // Wait for aria-checked to update then rescan all
    setTimeout(() => scanAndUpdateConflicts(), 250);
  }, true);
}

function setupSelectSectionsListener() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const label = btn.querySelector('.cx-MuiButton-label');
    if (!label) return;
    if (label.textContent.trim().toLowerCase().includes('select sections')) {
      setTimeout(() => scanAndUpdateConflicts(), 500);
      setTimeout(() => scanAndUpdateConflicts(), 1200);
      setTimeout(() => scanAndUpdateConflicts(), 2500);
    }
  }, true);
}

// ==================== INITIALIZATION ====================

function initConflictChecker() {
  if (window.prConflictCheckerActive) return;
  window.prConflictCheckerActive = true;
  console.log('📅 Conflict checker initialized');

  setupDeleteListeners();
  setupCheckboxListeners();
  setupSelectSectionsListener();

  setTimeout(() => scanAndUpdateConflicts(), 1000);

  const conflictObserver = new MutationObserver((mutations) => {
    const isRelevant = mutations.some(m => {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.classList?.contains('pr-conflict-badge')) continue;
        if (node.classList?.contains('pr-conflict-badge-wrap')) continue;
        if (node.getAttribute?.('data-pr-conflict') === 'true') continue;
        if (node.querySelector?.('[role="rowheader"]')) return true;
        if (node.classList?.contains('cx-MuiExpansionPanelDetails-root')) return true;
      }
      return false;
    });
    if (isRelevant) setTimeout(() => scanAndUpdateConflicts(), 300);
  });

  conflictObserver.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConflictChecker);
} else {
  initConflictChecker();
}