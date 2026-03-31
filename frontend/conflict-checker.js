// ==================== CONFLICT CHECKER ====================
// Reads schedule from window.highpoint.cachedBuild (server-rendered)
// and shows Available / Conflict badges on section rows.

const SCHEDULE_STORAGE_KEY = 'pr_schedule_map';

// ==================== TIME UTILITIES ====================

const DAY_MAP = { mon: 'Mo', tues: 'Tu', wed: 'We', thurs: 'Th', fri: 'Fr', sat: 'Sa', sun: 'Su' };

function parseApiTime(timeStr) {
  // "13.30.00.000000" → "1:30 pm"
  if (!timeStr) return null;
  const parts = timeStr.split('.');
  let hours = parseInt(parts[0]);
  const minutes = parts[1] || '00';
  const ampm = hours >= 12 ? 'pm' : 'am';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.trim().toLowerCase().match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  if (match[3] === 'pm' && hours !== 12) hours += 12;
  if (match[3] === 'am' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function expandDays(dayStr) {
  if (!dayStr) return [];
  const dayTokens = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const days = [];
  let i = 0;
  while (i < dayStr.length) {
    const two = dayStr.substring(i, i + 2);
    if (dayTokens.includes(two)) { days.push(two); i += 2; }
    else i++;
  }
  return days;
}

function timesOverlap(slot1, slot2) {
  const days1 = expandDays(slot1.days);
  const days2 = expandDays(slot2.days);
  if (days1.length === 0 || days2.length === 0) return false;
  if (!days1.some(d => days2.includes(d))) return false;

  const s1 = parseTimeToMinutes(slot1.start), e1 = parseTimeToMinutes(slot1.end);
  const s2 = parseTimeToMinutes(slot2.start), e2 = parseTimeToMinutes(slot2.end);
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false;
  return s1 < e2 && s2 < e1;
}

// ==================== SCHEDULE MAP FROM HIGHPOINT ====================

function buildScheduleFromHighpoint() {
  const hp = window.highpoint;
  if (!hp?.cachedBuild?.schedules?.[0]?.classes) {
    console.log('📅 No cachedBuild data found');
    return {};
  }

  const map = {};
  hp.cachedBuild.schedules[0].classes.forEach(cls => {
    const courseCode = `${cls.subject} ${cls.catalogNbr}`;
    const section = cls.sections?.[0]?.classSection || cls.component || '';

    (cls.meetingPatterns || []).forEach(pattern => {
      if (!pattern.startTime || !pattern.endTime || !pattern.daysScheduled?.length) return;

      const days = pattern.daysScheduled.map(d => DAY_MAP[d] || '').join('');
      const start = parseApiTime(pattern.startTime);
      const end = parseApiTime(pattern.endTime);
      if (!days || !start || !end) return;

      if (!map[courseCode]) map[courseCode] = [];
      // Avoid duplicates
      const key = `${section}-${days}-${start}-${end}`;
      if (!map[courseCode].some(s => `${s.section}-${s.days}-${s.start}-${s.end}` === key)) {
        map[courseCode].push({ section, days, start, end });
      }
    });
  });

  // Save to localStorage as backup
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(map));
  console.log(`📅 Schedule loaded from highpoint: ${Object.keys(map).length} courses`, map);
  return map;
}

function getScheduleMap() {
  // Try highpoint first, fall back to localStorage
  const hp = window.highpoint;
  if (hp?.cachedBuild?.schedules?.[0]?.classes) {
    return buildScheduleFromHighpoint();
  }
  try { return JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY)) || {}; }
  catch (e) { return {}; }
}

// ==================== DOM PARSING ====================

function getCourseCodeFromRow(row) {
  let el = row.parentElement;
  let depth = 0;
  while (el && depth < 30) {
    // Check h2 headers like "CPE 470 - Selected Advanced Topics"
    const h2s = el.querySelectorAll('h2');
    for (const h2 of h2s) {
      const text = h2.textContent.trim();
      const match = text.match(/^([A-Z]{2,4}\s+\d{3})/);
      if (match) return match[1].replace(/\s+/g, ' ').trim();
    }
    // Check buttons
    const buttons = el.querySelectorAll('button.cx-MuiLink-button, .cx-MuiLink-button');
    for (const btn of buttons) {
      const text = btn.textContent.trim();
      if (/^[A-Z]{2,4}\s+\d{3}/.test(text)) return text.replace(/\s+/g, ' ').trim();
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
  clone.querySelectorAll('[data-polyratings], .polyratings-rating-element, .pr-conflict-badge, .pr-conflict-badge-wrap').forEach(n => n.remove());
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

function findConflicts(sectionData, scheduleMap) {
  if (!sectionData.hasTimes) {
    return { hasConflict: false, conflictsWith: [], noTime: true };
  }

  // Normalize: "CPE  470" → "CPE 470"
  const ownCourse = (sectionData.courseCode || '').replace(/\s+/g, ' ').trim();

  const conflicts = [];
  Object.entries(scheduleMap).forEach(([courseCode, sections]) => {
    const mapCourse = courseCode.replace(/\s+/g, ' ').trim();
    // Don't conflict with own course
    if (mapCourse === ownCourse) return;
    sections.forEach(slot => {
      if (timesOverlap(sectionData, slot)) {
        conflicts.push({ course: mapCourse, section: slot.section, days: slot.days, start: slot.start, end: slot.end });
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

function createConflictBadge(conflictResult) {
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

  if (conflictResult.hasConflict) {
    const courses = conflictResult.conflictsWith
      .map(c => c.course).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    badge.style.cssText = baseStyle + `
      background: rgba(254, 226, 226, 0.9); color: #DC2626;
      border: 1px solid #FECACA;
    `;
    badge.innerHTML = `⚠ Conflict · ${courses}`;
    badge.title = conflictResult.conflictsWith
      .map(c => `${c.course} ${c.section}: ${c.days} ${c.start}–${c.end}`).join('\n');
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
  // Remove existing badges
  sectionRow.querySelectorAll('.pr-conflict-badge-wrap').forEach(b => b.remove());

  // No times = no badge
  if (!sectionData.hasTimes) return;

  const badge = createConflictBadge(conflictResult);

  // Place below the DAYS cell (xs-4 index 1 inside xs-5)
  // Using days cell since it's shorter text and has room
  const xs5 = sectionRow.querySelector('.cx-MuiGrid-grid-xs-5');
  if (!xs5) return;
  const xs4Cells = xs5.querySelectorAll('.cx-MuiGrid-grid-xs-4');
  if (xs4Cells.length < 2) return;

  const daysCell = xs4Cells[1];

  // Make the cell a flex column so badge goes below the text
  daysCell.style.display = 'flex';
  daysCell.style.flexDirection = 'column';
  daysCell.style.alignItems = 'flex-start';

  const badgeContainer = document.createElement('div');
  badgeContainer.className = 'pr-conflict-badge-wrap';
  badgeContainer.style.cssText = 'margin-top: 4px;';
  badgeContainer.appendChild(badge);
  daysCell.appendChild(badgeContainer);
}

// ==================== MAIN SCANNING LOGIC ====================

function scanAndUpdateConflicts() {
  const sectionRows = getAllVisibleSectionRows();
  if (sectionRows.length === 0) return;

  const scheduleMap = getScheduleMap();
  if (Object.keys(scheduleMap).length === 0) {
    console.log('📅 No schedule data available yet');
    return;
  }

  console.log(`📅 Scanning ${sectionRows.length} sections against ${Object.keys(scheduleMap).length} courses`);

  sectionRows.forEach(row => {
    const data = extractSectionFromRow(row);
    if (!data || !data.section || !data.hasTimes) return;

    console.log(`📅 Section: ${data.courseCode} ${data.section} | ${data.days} ${data.start}-${data.end}`);
    const result = findConflicts(data, scheduleMap);
    injectBadgeOnRow(row, result, data);
  });
}

// ==================== EVENT HANDLERS ====================

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

function setupCheckboxListeners() {
  document.addEventListener('click', (e) => {
    const checkboxSpan = e.target.closest('.cx-MuiCheckbox-root');
    if (!checkboxSpan) return;
    const row = checkboxSpan.closest('[role="row"]');
    if (!row || !row.querySelector('[role="rowheader"]')) return;
    setTimeout(() => scanAndUpdateConflicts(), 300);
  }, true);
}

function setupBuildSaveListeners() {
  // When user clicks Build Schedule or Save, highpoint.cachedBuild gets updated
  // Re-scan after a delay to pick up changes
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const label = btn.querySelector('.cx-MuiButton-label');
    if (!label) return;
    const text = label.textContent.trim().toLowerCase();
    if (text.includes('build schedule') || text === 'save') {
      // Wait for the API response to update highpoint
      setTimeout(() => {
        buildScheduleFromHighpoint();
        scanAndUpdateConflicts();
      }, 2000);
      setTimeout(() => {
        buildScheduleFromHighpoint();
        scanAndUpdateConflicts();
      }, 4000);
    }
  }, true);
}

// ==================== INITIALIZATION ====================

function initConflictChecker() {
  if (window.prConflictCheckerActive) return;
  window.prConflictCheckerActive = true;
  console.log('📅 Conflict checker initialized');

  // Load schedule from highpoint immediately
  const map = getScheduleMap();
  console.log(`📅 Loaded ${Object.keys(map).length} courses from schedule`);

  setupSelectSectionsListener();
  setupCheckboxListeners();
  setupBuildSaveListeners();

  // Initial scan for any already-visible sections
  setTimeout(() => scanAndUpdateConflicts(), 1000);

  // Watch for DOM changes (panels expanding)
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