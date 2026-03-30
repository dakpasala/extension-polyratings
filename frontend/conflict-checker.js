// ==================== CONFLICT CHECKER ====================
// Detects time conflicts between selected course sections.
// Stores checked section times in localStorage as users browse.
// Injects "Available" / "Time Conflict" badges on visible sections.

const SCHEDULE_STORAGE_KEY = 'pr_schedule_map';

// ==================== TIME UTILITIES ====================

function parseTime(timeStr) {
  if (!timeStr || timeStr === '-' || timeStr.toLowerCase() === 'tba') return null;
  const cleaned = timeStr.trim().toLowerCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3];

  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function expandDays(dayStr) {
  if (!dayStr || dayStr === '-' || dayStr.toLowerCase() === 'tba') return [];
  const dayMap = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const days = [];
  let i = 0;
  const str = dayStr.trim();
  while (i < str.length) {
    const two = str.substring(i, i + 2);
    if (dayMap.includes(two)) {
      days.push(two);
      i += 2;
    } else {
      i++;
    }
  }
  return days;
}

function timesOverlap(slot1, slot2) {
  const days1 = expandDays(slot1.days);
  const days2 = expandDays(slot2.days);
  if (days1.length === 0 || days2.length === 0) return false;

  const sharedDays = days1.filter(d => days2.includes(d));
  if (sharedDays.length === 0) return false;

  const start1 = parseTime(slot1.start);
  const end1 = parseTime(slot1.end);
  const start2 = parseTime(slot2.start);
  const end2 = parseTime(slot2.end);

  if (start1 === null || end1 === null || start2 === null || end2 === null) return false;

  return start1 < end2 && start2 < end1;
}

function formatTimeRange(slot) {
  return `${slot.days} ${slot.start}–${slot.end}`;
}

// ==================== SCHEDULE STORAGE ====================

function getScheduleMap() {
  try {
    const stored = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

function saveScheduleMap(map) {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(map));
}

function addSectionToSchedule(courseCode, sectionData) {
  const map = getScheduleMap();
  if (!map[courseCode]) map[courseCode] = [];

  // Replace if same section name exists (user re-checked)
  map[courseCode] = map[courseCode].filter(s => s.section !== sectionData.section);
  map[courseCode].push(sectionData);

  saveScheduleMap(map);
  console.log(`📅 Added ${courseCode} ${sectionData.section}: ${formatTimeRange(sectionData)}`);
}

function removeSectionFromSchedule(courseCode, sectionName) {
  const map = getScheduleMap();
  if (!map[courseCode]) return;

  map[courseCode] = map[courseCode].filter(s => s.section !== sectionName);
  if (map[courseCode].length === 0) delete map[courseCode];

  saveScheduleMap(map);
  console.log(`📅 Removed ${courseCode} ${sectionName}`);
}

function removeCourseFromSchedule(courseCode) {
  const map = getScheduleMap();
  if (!map[courseCode]) return;
  delete map[courseCode];
  saveScheduleMap(map);
  console.log(`📅 Removed entire course ${courseCode}`);
}

// ==================== DOM PARSING ====================

function getCourseCodeFromRow(row) {
  // Walk up to find the course code — it's in a cx-MuiLink-button
  let el = row;
  while (el) {
    const btn = el.querySelector('button.cx-MuiLink-button');
    if (btn) {
      const code = btn.textContent.trim();
      if (/^[A-Z]{2,4}\s+\d{3}/.test(code)) return code;
    }
    el = el.parentElement;
  }
  return '';
}

function extractSectionFromRow(sectionRow) {
  // sectionRow = the [role="row"] div containing section details
  // Returns: { section, days, start, end, isChecked, courseCode, hasTimes }

  // Section name from rowheader (e.g. "01-LEC*")
  const headerEl = sectionRow.querySelector('[role="rowheader"]');
  let sectionName = '';
  if (headerEl) {
    const ariaDiv = headerEl.querySelector('[aria-hidden="true"]');
    sectionName = ariaDiv ? ariaDiv.textContent.trim() : '';
  }

  // The xs-5 container holds: Instructor, Days, Start, End, Room
  const detailsContainer = sectionRow.querySelector('.cx-MuiGrid-grid-xs-5');
  if (!detailsContainer) return null;

  const detailCells = detailsContainer.querySelectorAll('.cx-MuiGrid-grid-xs-4');
  // Index 0 = Instructor, 1 = Days, 2 = Start, 3 = End, 4 = Room
  let days = '', start = '', end = '';
  if (detailCells.length >= 4) {
    days = detailCells[1]?.textContent?.trim() || '';
    start = detailCells[2]?.textContent?.trim() || '';
    end = detailCells[3]?.textContent?.trim() || '';
  }

  // Checkbox state
  const checkbox = sectionRow.querySelector('input[type="checkbox"]');
  const isChecked = checkbox?.getAttribute('aria-checked') === 'true';

  const courseCode = getCourseCodeFromRow(sectionRow);

  // Clean up days — remove any extra whitespace or nested text
  days = days.replace(/\s+/g, '').trim();

  const hasTimes = !!(days && start && end && days !== '-' && !days.toLowerCase().includes('tba'));

  return {
    section: sectionName,
    days,
    start,
    end,
    isChecked,
    courseCode,
    hasTimes,
  };
}

function getAllVisibleSectionRows() {
  // Find all section rows in expanded panels
  const rows = document.querySelectorAll('.cx-MuiExpansionPanelSummary-content [role="row"]');
  return Array.from(rows).filter(row => {
    // Must have a rowheader (section name) to be a section row, not a header row
    return row.querySelector('[role="rowheader"]');
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
    // Don't conflict-check against the same course's own sections
    if (courseCode === sectionData.courseCode) return;

    sections.forEach(slot => {
      if (timesOverlap(sectionData, slot)) {
        conflicts.push({
          course: courseCode,
          section: slot.section,
          days: slot.days,
          start: slot.start,
          end: slot.end,
        });
      }
    });
  });

  return {
    hasConflict: conflicts.length > 0,
    conflictsWith: conflicts,
    noTime: false,
  };
}

// ==================== BADGE UI ====================

function injectConflictStyles() {
  if (document.querySelector('#pr-conflict-styles')) return;
  const style = document.createElement('style');
  style.id = 'pr-conflict-styles';
  style.textContent = `
    @keyframes conflictFadeIn {
      from { opacity: 0; transform: translateX(-4px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .pr-conflict-badge {
      animation: conflictFadeIn 0.25s ease-out;
    }
  `;
  document.head.appendChild(style);
}

function createConflictBadge(conflictResult, sectionData) {
  injectConflictStyles();

  const badge = document.createElement('div');
  badge.className = 'pr-conflict-badge';
  badge.setAttribute('data-pr-conflict', 'true');

  if (!sectionData.hasTimes) {
    badge.style.cssText = `
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
      background: #f5f5f5; color: #999;
      border: 1px solid #e0e0e0;
      white-space: nowrap; margin-top: 4px;
    `;
    badge.textContent = '— No time set';
    return badge;
  }

  if (conflictResult.hasConflict) {
    const conflictCourses = conflictResult.conflictsWith
      .map(c => c.course)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', ');

    badge.style.cssText = `
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
      background: #FEE2E2; color: #DC2626;
      border: 1px solid #FECACA;
      white-space: nowrap; margin-top: 4px;
      cursor: default;
    `;
    badge.innerHTML = `<span style="font-size: 12px;">⚠</span> Conflict with ${conflictCourses}`;

    // Tooltip with details on hover
    const details = conflictResult.conflictsWith
      .map(c => `${c.course} ${c.section}: ${formatTimeRange(c)}`)
      .join('\n');
    badge.title = details;
  } else {
    badge.style.cssText = `
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
      background: #D1FAE5; color: #059669;
      border: 1px solid #A7F3D0;
      white-space: nowrap; margin-top: 4px;
    `;
    badge.innerHTML = `<span style="font-size: 12px;">✓</span> Available`;
  }

  return badge;
}

function injectBadgeOnRow(sectionRow, conflictResult, sectionData) {
  // Remove existing badge on this row
  const existing = sectionRow.querySelector('.pr-conflict-badge');
  if (existing) existing.remove();

  const badge = createConflictBadge(conflictResult, sectionData);

  // Inject near the section name (rowheader area)
  const headerEl = sectionRow.querySelector('[role="rowheader"]');
  if (headerEl) {
    headerEl.appendChild(badge);
  }
}

// ==================== MAIN SCANNING LOGIC ====================

function scanAndUpdateConflicts() {
  const sectionRows = getAllVisibleSectionRows();
  if (sectionRows.length === 0) return;

  console.log(`📅 Scanning ${sectionRows.length} visible sections for conflicts`);

  sectionRows.forEach(row => {
    const data = extractSectionFromRow(row);
    if (!data || !data.section) return;

    // If checked, store in schedule map
    if (data.isChecked && data.hasTimes) {
      addSectionToSchedule(data.courseCode, {
        section: data.section,
        days: data.days,
        start: data.start,
        end: data.end,
      });
    }

    // If unchecked, remove from schedule map (user deselected)
    if (!data.isChecked && data.courseCode) {
      removeSectionFromSchedule(data.courseCode, data.section);
    }

    // Only show badges on unchecked sections (the ones user is deciding on)
    if (!data.isChecked) {
      const result = findConflicts(data);
      injectBadgeOnRow(row, result, data);
    } else {
      // Remove badge from checked sections (they're part of schedule)
      const existing = row.querySelector('.pr-conflict-badge');
      if (existing) existing.remove();
    }
  });
}

// ==================== DELETE COURSE HANDLER ====================

function setupDeleteListeners() {
  // Listen for clicks on delete buttons (trash icon)
  document.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[title="Delete course"] button, [title="Delete course"]');
    if (!deleteBtn) return;

    // Find the course code from the parent row
    const courseRow = deleteBtn.closest('.cx-MuiPaper-root');
    if (!courseRow) return;

    const courseBtn = courseRow.querySelector('button.cx-MuiLink-button');
    if (!courseBtn) return;

    const courseCode = courseBtn.textContent.trim();
    if (courseCode) {
      // Small delay to let the DOM update first
      setTimeout(() => {
        removeCourseFromSchedule(courseCode);
        // Re-scan to update badges
        scanAndUpdateConflicts();
      }, 300);
    }
  }, true);
}

// ==================== CHECKBOX CHANGE HANDLER ====================

function setupCheckboxListeners() {
  // Listen for checkbox changes in section rows
  document.addEventListener('change', (e) => {
    const checkbox = e.target;
    if (checkbox.type !== 'checkbox') return;

    // Check if this is a section checkbox (inside a row with rowheader)
    const row = checkbox.closest('[role="row"]');
    if (!row || !row.querySelector('[role="rowheader"]')) return;

    // Small delay to let aria-checked update
    setTimeout(() => {
      scanAndUpdateConflicts();
    }, 100);
  }, true);

  // Also catch click-based checkbox toggles (Cal Poly uses MUI checkboxes)
  document.addEventListener('click', (e) => {
    const checkboxSpan = e.target.closest('.cx-MuiCheckbox-root');
    if (!checkboxSpan) return;

    const row = checkboxSpan.closest('[role="row"]');
    if (!row || !row.querySelector('[role="rowheader"]')) return;

    setTimeout(() => {
      scanAndUpdateConflicts();
    }, 200);
  }, true);
}

// ==================== SELECT SECTIONS HANDLER ====================

function setupSelectSectionsListener() {
  // When user clicks "Select Sections", the panel expands and sections load
  // We need to scan after the panel content loads
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const label = btn.querySelector('.cx-MuiButton-label');
    if (!label) return;

    const text = label.textContent.trim().toLowerCase();
    if (text.includes('select sections')) {
      // Wait for the panel to expand and sections to render
      setTimeout(() => scanAndUpdateConflicts(), 500);
      setTimeout(() => scanAndUpdateConflicts(), 1000);
      setTimeout(() => scanAndUpdateConflicts(), 2000);
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

  // Initial scan for any already-visible sections
  setTimeout(() => scanAndUpdateConflicts(), 1000);

  // Also watch for DOM changes (panels expanding/collapsing)
  const conflictObserver = new MutationObserver((mutations) => {
    // Only react to relevant changes (not our own badge injections)
    const isRelevant = mutations.some(m => {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.classList?.contains('pr-conflict-badge')) continue;
        if (node.querySelector?.('[role="row"]')) return true;
        if (node.querySelector?.('[role="rowheader"]')) return true;
        if (node.classList?.contains('cx-MuiExpansionPanelDetails-root')) return true;
      }
      return false;
    });

    if (isRelevant) {
      setTimeout(() => scanAndUpdateConflicts(), 300);
    }
  });

  conflictObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConflictChecker);
} else {
  initConflictChecker();
}