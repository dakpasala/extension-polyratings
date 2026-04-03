// ==================== SCHEDULE CALENDAR TOOLTIP ====================
// Hover over ⚠ Conflict / ✓ Available badge → mini weekly calendar
// Uses the HOVERED ROW's actual times from DOM (not localStorage schedule times for that course)
// Draggable, resizable, closeable

(function () {
  if (window.prScheduleTooltipActive) return;
  window.prScheduleTooltipActive = true;

  // ==================== STYLES ====================

  (function injectStyles() {
    if (document.getElementById('pr-sched-styles')) return;
    const style = document.createElement('style');
    style.id = 'pr-sched-styles';
    style.textContent = `
      @keyframes schedFadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .pr-sched-tooltip {
        position: fixed;
        z-index: 999999;
        width: 480px;
        min-width: 320px;
        max-width: 700px;
        max-height: 90vh;
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
        font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
        font-size: 12px;
        color: #1a1a1a;
        pointer-events: none;
        opacity: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        user-select: none;
        resize: both;
        transition: opacity 0.16s ease, transform 0.16s ease;
        transform: translateY(6px);
      }

      .pr-sched-tooltip.pr-sched-visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      .pr-sched-tooltip.pr-sched-dragging {
        transition: none;
        cursor: grabbing;
      }

      .pr-sched-header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px 8px;
        border-bottom: 1px solid #efefef;
        cursor: grab;
        background: #fff;
        border-radius: 10px 10px 0 0;
      }
      .pr-sched-header:active { cursor: grabbing; }

      .pr-sched-title {
        font-size: 12.5px;
        font-weight: 600;
        color: #111;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .pr-sched-pill {
        font-size: 10px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 10px;
      }
      .pr-sched-pill-conflict {
        background: #fee2e2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }
      .pr-sched-pill-available {
        background: #d1fae5;
        color: #059669;
        border: 1px solid #a7f3d0;
      }

      .pr-sched-close {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #f3f3f3;
        border: 1px solid #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        color: #666;
        transition: all 0.15s;
        flex-shrink: 0;
      }
      .pr-sched-close:hover {
        background: #e8e8e8;
        color: #222;
        transform: scale(1.1);
      }

      .pr-sched-body {
        flex: 1;
        overflow: auto;
        padding: 10px;
        min-height: 0;
      }

      /* Calendar wrapper — scrollable */
      .pr-cal-scroll-wrap {
        overflow-y: auto;
        overflow-x: hidden;
        max-height: 280px;
        border: 1px solid #e4e4e4;
        border-radius: 6px;
      }

      .pr-cal-grid {
        display: grid;
        grid-template-columns: 44px repeat(5, 1fr);
        gap: 0;
        overflow: hidden;
        position: relative;
      }

      .pr-cal-day-header {
        background: #f7f7f7;
        text-align: center;
        font-size: 10px;
        font-weight: 600;
        color: #555;
        padding: 5px 2px;
        border-bottom: 1px solid #e4e4e4;
        letter-spacing: 0.3px;
        text-transform: uppercase;
        position: sticky;
        top: 0;
        z-index: 2;
      }
      .pr-cal-day-header:not(:last-child) {
        border-right: 1px solid #e4e4e4;
      }
      .pr-cal-time-header {
        background: #f7f7f7;
        border-bottom: 1px solid #e4e4e4;
        border-right: 1px solid #e4e4e4;
        position: sticky;
        top: 0;
        z-index: 2;
      }

      .pr-cal-time-col {
        border-right: 1px solid #e8e8e8;
        position: relative;
      }
      .pr-cal-time-label {
        font-size: 9px;
        color: #aaa;
        text-align: right;
        padding-right: 5px;
        position: absolute;
        right: 0;
        transform: translateY(-50%);
        white-space: nowrap;
        pointer-events: none;
        line-height: 1;
      }
      .pr-cal-time-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 1px;
        background: #f0f0f0;
      }

      .pr-cal-day-col {
        position: relative;
        border-right: 1px solid #efefef;
      }
      .pr-cal-day-col:last-child {
        border-right: none;
      }

      .pr-cal-event {
        position: absolute;
        left: 2px;
        right: 2px;
        border-radius: 4px;
        padding: 3px 4px;
        font-size: 9.5px;
        font-weight: 500;
        line-height: 1.3;
        overflow: hidden;
        cursor: default;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        min-height: 16px;
      }
      .pr-cal-event-name {
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pr-cal-event-time {
        font-size: 8.5px;
        opacity: 0.8;
        margin-top: 1px;
      }

      .pr-cal-event-enrolled {
        background: rgba(219, 234, 254, 0.9);
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
      }
      .pr-cal-event-enrolled-highlight {
        background: rgba(209, 250, 229, 0.95);
        color: #047857;
        border: 1px solid #6ee7b7;
      }
      .pr-cal-event-conflict {
        background: rgba(254, 226, 226, 0.95);
        color: #b91c1c;
        border: 1px solid #fca5a5;
      }
      .pr-cal-event-available {
        background: rgba(209, 250, 229, 0.95);
        color: #047857;
        border: 1px dashed #6ee7b7;
      }
      .pr-cal-event-conflict-overlap {
        background: repeating-linear-gradient(
          135deg,
          rgba(254, 226, 226, 0.95),
          rgba(254, 226, 226, 0.95) 4px,
          rgba(252, 165, 165, 0.6) 4px,
          rgba(252, 165, 165, 0.6) 8px
        );
        color: #b91c1c;
        border: 1.5px solid #ef4444;
      }

      .pr-sched-legend {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        padding: 8px 2px 2px;
        font-size: 10px;
        color: #555;
      }
      .pr-sched-legend-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .pr-sched-legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 2px;
        flex-shrink: 0;
      }

      .pr-sched-info {
        margin-top: 8px;
        padding: 7px 9px;
        border-radius: 6px;
        font-size: 10.5px;
        line-height: 1.5;
      }
      .pr-sched-info-conflict {
        background: #fff5f5;
        border: 1px solid #fecaca;
        color: #7f1d1d;
      }
      .pr-sched-info-available {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #14532d;
      }
      .pr-sched-info-title {
        font-weight: 600;
        margin-bottom: 3px;
      }
    `;
    document.head.appendChild(style);
  })();

  // ==================== CONSTANTS ====================

  const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr'];
  const DAY_LABELS = { Mo: 'Mon', Tu: 'Tue', We: 'Wed', Th: 'Thu', Fr: 'Fri' };
  const START_HOUR = 7;
  const END_HOUR = 21;
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
  const PX_PER_MIN = 1.5;
  const GRID_HEIGHT = TOTAL_MINUTES * PX_PER_MIN;

  // ==================== STATE ====================

  const state = {
    tooltip: null,
    showTimer: null,
    hideTimer: null,
    ownerBadge: null,
    pinned: false,
  };

  // ==================== UTILITIES ====================

  function getScheduleMap() {
    try { return JSON.parse(localStorage.getItem('pr_schedule_map')) || {}; }
    catch (e) { return {}; }
  }

  function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const m = timeStr.trim().toLowerCase().match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
    if (!m) return null;
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    if (m[3] === 'pm' && h !== 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    return h * 60 + min;
  }

  function expandDays(dayStr) {
    if (!dayStr) return [];
    const tokens = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const result = [];
    let i = 0;
    while (i < dayStr.length) {
      const two = dayStr.substring(i, i + 2);
      if (tokens.includes(two)) { result.push(two); i += 2; }
      else i++;
    }
    return result;
  }

  function minutesToPx(minutes) {
    return (minutes - START_HOUR * 60) * PX_PER_MIN;
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.replace(' am', 'a').replace(' pm', 'p');
  }

  function normalizeCode(code) {
    return (code || '').replace(/\s+/g, ' ').trim();
  }

  function esc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ==================== BADGE DATA EXTRACTION ====================
  // Reads times from the HOVERED ROW's DOM, not from localStorage

  function extractBadgeData(badge) {
    const row = badge.closest('[role="row"]');
    if (!row) return null;

    const headerEl = row.querySelector('[role="rowheader"]');
    if (!headerEl) return null;
    const ariaDiv = headerEl.querySelector('[aria-hidden="true"]');
    const sectionName = ariaDiv ? ariaDiv.textContent.trim() : headerEl.textContent.trim();
    if (!sectionName) return null;

    const xs5 = row.querySelector('.cx-MuiGrid-grid-xs-5');
    if (!xs5) return null;
    const xs4Cells = xs5.querySelectorAll('.cx-MuiGrid-grid-xs-4');
    if (xs4Cells.length < 4) return null;

    function readCell(cell) {
      if (!cell) return '';
      const roleCell = cell.querySelector('[role="cell"]');
      const target = roleCell || cell;
      const ariaD = target.querySelector('[aria-hidden="true"]');
      if (ariaD) return ariaD.textContent.trim();
      const clone = target.cloneNode(true);
      clone.querySelectorAll('.pr-conflict-badge,.pr-conflict-badge-wrap,.pr-sched-tooltip').forEach(n => n.remove());
      return clone.textContent.trim();
    }

    // Read times FROM THE DOM ROW — these are the actual times for this section
    const days = readCell(xs4Cells[1]);
    const start = readCell(xs4Cells[2]);
    const end = readCell(xs4Cells[3]);

    // Get course code from h2 header
    let courseCode = '';
    let el = row.parentElement;
    let depth = 0;
    while (el && depth < 30) {
      const h2s = el.querySelectorAll('h2');
      for (const h2 of h2s) {
        const text = h2.textContent.trim();
        const match = text.match(/^([A-Z]{2,4}\s+\d{3})/);
        if (match) { courseCode = match[1].replace(/\s+/g, ' ').trim(); break; }
      }
      if (courseCode) break;
      const btns = el.querySelectorAll('button.cx-MuiLink-button, .cx-MuiLink-button');
      for (const btn of btns) {
        const text = btn.textContent.trim();
        if (/^[A-Z]{2,4}\s+\d{3}/.test(text)) { courseCode = text.replace(/\s+/g, ' ').trim(); break; }
      }
      if (courseCode) break;
      el = el.parentElement;
      depth++;
    }

    const isConflict = badge.textContent.includes('Conflict');

    // Parse conflict details from badge title
    const conflictsWith = [];
    if (isConflict && badge.title) {
      badge.title.split('\n').forEach(line => {
        const m = line.match(/^([A-Z]{2,4}\s+\d{3})\s+(\S+):\s+(\S+)\s+(.+?)[–-](.+)$/);
        if (m) {
          conflictsWith.push({
            course: m[1].trim(),
            section: m[2].trim(),
            days: m[3].trim(),
            start: m[4].trim(),
            end: m[5].trim(),
          });
        }
      });
    }

    return {
      courseCode: courseCode || 'This Course',
      section: sectionName,
      days,    // FROM DOM — actual times for this specific section
      start,   // FROM DOM
      end,     // FROM DOM
      isConflict,
      conflictsWith
    };
  }

  // ==================== CALENDAR BUILDER ====================

  function buildCalendarHTML(badgeData, scheduleMap) {
    const { courseCode, section, days, start, end, isConflict, conflictsWith } = badgeData;

    // Flatten enrolled events from schedule map
    const enrolledEvents = [];
    Object.entries(scheduleMap).forEach(([code, slots]) => {
      slots.forEach(slot => {
        enrolledEvents.push({ course: code, section: slot.section, days: slot.days, start: slot.start, end: slot.end });
      });
    });

    const candidateDays = expandDays(days);
    const candidateStart = parseTimeToMinutes(start);
    const candidateEnd = parseTimeToMinutes(end);
    const candidateCode = normalizeCode(courseCode);

    // Is this exact section already enrolled?
    const alreadyEnrolled = !isConflict && enrolledEvents.some(ev =>
      normalizeCode(ev.course) === candidateCode &&
      candidateDays.length > 0 &&
      expandDays(ev.days).some(d => candidateDays.includes(d)) &&
      parseTimeToMinutes(ev.start) === candidateStart &&
      parseTimeToMinutes(ev.end) === candidateEnd
    );

    // Find the earliest relevant time for scrolling
    let scrollToMinutes = candidateStart || null;
    if (!scrollToMinutes) {
      // Find earliest enrolled event
      let earliest = Infinity;
      enrolledEvents.forEach(ev => {
        const s = parseTimeToMinutes(ev.start);
        if (s !== null && s < earliest) earliest = s;
      });
      if (earliest < Infinity) scrollToMinutes = earliest;
    }

    // Hour lines & labels
    const hours = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      hours.push({
        px: minutesToPx(h * 60),
        label: h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`,
      });
    }

    function renderHourLines() {
      return hours.map(h => `<div class="pr-cal-time-line" style="top:${h.px}px;"></div>`).join('');
    }

    function renderEventsForDay(dayCode) {
      const blocks = [];

      enrolledEvents.forEach(ev => {
        const evDays = expandDays(ev.days);
        if (!evDays.includes(dayCode)) return;
        const evStart = parseTimeToMinutes(ev.start);
        const evEnd = parseTimeToMinutes(ev.end);
        if (evStart === null || evEnd === null) return;

        const top = minutesToPx(evStart);
        const height = Math.max((evEnd - evStart) * PX_PER_MIN, 16);

        // Does this enrolled block overlap with the candidate?
        const isOverlap = isConflict
          && candidateDays.includes(dayCode)
          && candidateStart !== null && candidateEnd !== null
          && candidateStart < evEnd && evStart < candidateEnd
          && normalizeCode(ev.course) !== candidateCode;

        // Is this the exact section being hovered (already enrolled)?
        const isHighlight = !isConflict && alreadyEnrolled
          && normalizeCode(ev.course) === candidateCode
          && parseTimeToMinutes(ev.start) === candidateStart
          && parseTimeToMinutes(ev.end) === candidateEnd;

        const cls = isOverlap
          ? 'pr-cal-event-conflict-overlap'
          : isHighlight
            ? 'pr-cal-event-enrolled-highlight'
            : 'pr-cal-event-enrolled';

        blocks.push(`
          <div class="pr-cal-event ${cls}" style="top:${top}px;height:${height}px;" title="${esc(ev.course)} ${esc(ev.section)}: ${esc(ev.start)}–${esc(ev.end)}">
            <span class="pr-cal-event-name">${esc(ev.course)}</span>
            ${height > 26 ? `<span class="pr-cal-event-time">${esc(formatTime(ev.start))}–${esc(formatTime(ev.end))}</span>` : ''}
          </div>
        `);
      });

      // Draw candidate overlay (only if not already enrolled with same times)
      if (!alreadyEnrolled && candidateDays.includes(dayCode) && candidateStart !== null && candidateEnd !== null) {
        const top = minutesToPx(candidateStart);
        const height = Math.max((candidateEnd - candidateStart) * PX_PER_MIN, 16);
        const cls = isConflict ? 'pr-cal-event-conflict' : 'pr-cal-event-available';
        const label = isConflict ? `⚠ ${courseCode}` : `+ ${courseCode}`;
        blocks.push(`
          <div class="pr-cal-event ${cls}" style="top:${top}px;height:${height}px;left:30%;right:2px;" title="${esc(courseCode)} ${esc(section)}: ${esc(start)}–${esc(end)}">
            <span class="pr-cal-event-name">${esc(label)}</span>
            ${height > 26 ? `<span class="pr-cal-event-time">${esc(formatTime(start))}–${esc(formatTime(end))}</span>` : ''}
          </div>
        `);
      }

      return blocks.join('');
    }

    const timeLabelsHTML = hours.map(h =>
      `<div class="pr-cal-time-label" style="top:${h.px}px;">${h.label}</div>`
    ).join('');

    // Info box
    let infoHTML = '';
    if (isConflict) {
      const conflictList = conflictsWith.map(c =>
        `<b>${esc(c.course)} ${esc(c.section)}</b>: ${esc(c.days)} ${esc(c.start)}–${esc(c.end)}`
      ).join('<br>');
      infoHTML = `
        <div class="pr-sched-info pr-sched-info-conflict">
          <div class="pr-sched-info-title">⚠ Conflicts with selected class${conflictsWith.length !== 1 ? 'es' : ''}:</div>
          ${conflictList || 'Time overlap detected with your schedule.'}
        </div>
      `;
    } else if (alreadyEnrolled) {
      infoHTML = `
        <div class="pr-sched-info pr-sched-info-available">
          <div class="pr-sched-info-title">✓ Selected</div>
          ${esc(courseCode)} ${esc(section)}: ${esc(days)} ${esc(start)}–${esc(end)}
        </div>
      `;
    } else {
      infoHTML = `
        <div class="pr-sched-info pr-sched-info-available">
          <div class="pr-sched-info-title">✓ No conflicts — fits your schedule</div>
          ${esc(courseCode)} ${esc(section)}: ${esc(days)} ${esc(start)}–${esc(end)}
        </div>
      `;
    }

    // Legend
    const legendHTML = `
      <div class="pr-sched-legend">
        <div class="pr-sched-legend-item">
          <div class="pr-sched-legend-dot" style="background:#bfdbfe;border:1px solid #93c5fd;"></div>
          Selected
        </div>
        ${isConflict ? `
          <div class="pr-sched-legend-item">
            <div class="pr-sched-legend-dot" style="background:#fee2e2;border:1px solid #fca5a5;"></div>
            This section
          </div>
          <div class="pr-sched-legend-item">
            <div class="pr-sched-legend-dot" style="background:repeating-linear-gradient(135deg,#fee2e2,#fee2e2 4px,#fca5a5 4px,#fca5a5 8px);border:1px solid #ef4444;"></div>
            Overlap
          </div>
        ` : alreadyEnrolled ? `
          <div class="pr-sched-legend-item">
            <div class="pr-sched-legend-dot" style="background:#d1fae5;border:1px solid #6ee7b7;"></div>
            This section
          </div>
        ` : `
          <div class="pr-sched-legend-item">
            <div class="pr-sched-legend-dot" style="background:#d1fae5;border:1px dashed #6ee7b7;"></div>
            This section (fits)
          </div>
        `}
      </div>
    `;

    // Wrap calendar in scrollable container
    const calendarHTML = `
      <div class="pr-cal-scroll-wrap" data-scroll-to="${scrollToMinutes !== null ? minutesToPx(scrollToMinutes) : 0}">
        <div class="pr-cal-grid" style="height:${GRID_HEIGHT + 22}px;">
          <div class="pr-cal-time-header pr-cal-day-header"></div>
          ${DAYS.map(d => `<div class="pr-cal-day-header">${DAY_LABELS[d]}</div>`).join('')}
          <div class="pr-cal-time-col" style="height:${GRID_HEIGHT}px;position:relative;">
            ${timeLabelsHTML}
          </div>
          ${DAYS.map(d => `
            <div class="pr-cal-day-col" style="height:${GRID_HEIGHT}px;position:relative;">
              ${renderHourLines()}
              ${renderEventsForDay(d)}
            </div>
          `).join('')}
        </div>
      </div>
      ${legendHTML}
      ${infoHTML}
    `;

    return calendarHTML;
  }

  // ==================== TOOLTIP CREATION ====================

  function createTooltip(badge, badgeData, scheduleMap) {
    removeTooltip(true);

    const isConflict = badgeData.isConflict;
    const pillClass = isConflict ? 'pr-sched-pill-conflict' : 'pr-sched-pill-available';
    const pillText = isConflict ? '⚠ Conflict' : '✓ Available';
    const titleText = `${badgeData.courseCode} ${badgeData.section}`;

    const tooltip = document.createElement('div');
    tooltip.className = 'pr-sched-tooltip';
    tooltip.innerHTML = `
      <div class="pr-sched-header" id="pr-sched-drag-handle">
        <div class="pr-sched-title">
          <span>${esc(titleText)}</span>
          <span class="pr-sched-pill ${pillClass}">${pillText}</span>
        </div>
        <div class="pr-sched-close" title="Close">×</div>
      </div>
      <div class="pr-sched-body">
        ${buildCalendarHTML(badgeData, scheduleMap)}
      </div>
    `;

    document.body.appendChild(tooltip);
    state.tooltip = tooltip;
    state.ownerBadge = badge;

    positionTooltip(tooltip, badge);
    requestAnimationFrame(() => {
      tooltip.classList.add('pr-sched-visible');

      // Scroll to relevant time (offset by ~60px to show some context above)
      const scrollWrap = tooltip.querySelector('.pr-cal-scroll-wrap');
      if (scrollWrap) {
        const scrollTarget = parseInt(scrollWrap.getAttribute('data-scroll-to') || '0');
        if (scrollTarget > 0) {
          scrollWrap.scrollTop = Math.max(0, scrollTarget - 60);
        }
      }

      // Snap height to actual content — cap max-height so user can't resize into whitespace
      requestAnimationFrame(() => {
        const header = tooltip.querySelector('.pr-sched-header');
        const body = tooltip.querySelector('.pr-sched-body');
        if (header && body) {
          const contentHeight = header.offsetHeight + body.scrollHeight + 2;
          const cappedHeight = Math.min(contentHeight, window.innerHeight * 0.9);
          tooltip.style.height = cappedHeight + 'px';
          // KEY FIX: lock max-height to actual content so resize can't create whitespace
          tooltip.style.maxHeight = cappedHeight + 'px';
        }
        // Re-position after height is set
        positionTooltip(tooltip, badge);
      });
    });

    tooltip.querySelector('.pr-sched-close').addEventListener('click', (e) => {
      e.stopPropagation();
      state.pinned = false;
      removeTooltip(false);
    });

    tooltip.addEventListener('mouseenter', () => clearTimeout(state.hideTimer));
    tooltip.addEventListener('mouseleave', () => {
      if (!state.pinned) state.hideTimer = setTimeout(() => removeTooltip(false), 200);
    });

    setupDrag(tooltip);
  }

  function positionTooltip(tooltip, anchor) {
    const rect = anchor.getBoundingClientRect();
    const tw = tooltip.offsetWidth || 480;
    const th = tooltip.offsetHeight || 340;
    const margin = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(margin, Math.min(left, vw - tw - margin));

    let top = rect.top - th - 6 >= margin ? rect.top - th - 6 : rect.bottom + 6;
    top = Math.max(margin, Math.min(top, vh - th - margin));

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function removeTooltip(immediate) {
    const t = state.tooltip;
    if (!t) return;
    if (immediate) {
      t.remove();
      state.tooltip = null;
      state.ownerBadge = null;
    } else {
      t.classList.remove('pr-sched-visible');
      setTimeout(() => {
        t.remove();
        if (state.tooltip === t) { state.tooltip = null; state.ownerBadge = null; }
      }, 180);
    }
  }

  function setupDrag(tooltip) {
    const handle = tooltip.querySelector('#pr-sched-drag-handle');
    if (!handle) return;
    let startX, startY, origLeft, origTop;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('pr-sched-close')) return;
      e.preventDefault();
      state.pinned = true;
      tooltip.classList.add('pr-sched-dragging');
      startX = e.clientX;
      startY = e.clientY;
      origLeft = parseInt(tooltip.style.left) || 0;
      origTop  = parseInt(tooltip.style.top)  || 0;

      const onMove = (mv) => {
        const margin = 10;
        tooltip.style.left = `${Math.max(margin, Math.min(origLeft + mv.clientX - startX, window.innerWidth  - tooltip.offsetWidth  - margin))}px`;
        tooltip.style.top  = `${Math.max(margin, Math.min(origTop  + mv.clientY - startY, window.innerHeight - tooltip.offsetHeight - margin))}px`;
      };

      const onUp = () => {
        tooltip.classList.remove('pr-sched-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // ==================== HOVER LISTENERS ====================

  document.addEventListener('mouseenter', (e) => {
    if (!e.target.closest) return;
    const badge = e.target.closest('.pr-conflict-badge[data-pr-conflict]');
    if (!badge) return;
    clearTimeout(state.hideTimer);
    clearTimeout(state.showTimer);
    if (state.ownerBadge === badge && state.tooltip) return;
    state.showTimer = setTimeout(() => {
      const scheduleMap = getScheduleMap();
      const badgeData = extractBadgeData(badge);
      if (!badgeData) return;
      createTooltip(badge, badgeData, scheduleMap);
    }, 350);
  }, true);

  document.addEventListener('mouseleave', (e) => {
    if (!e.target.closest) return;
    const badge = e.target.closest('.pr-conflict-badge[data-pr-conflict]');
    if (!badge) return;
    clearTimeout(state.showTimer);
    if (!state.pinned) state.hideTimer = setTimeout(() => removeTooltip(false), 200);
  }, true);

  document.addEventListener('click', (e) => {
    if (!e.target.closest) return;
    const badge = e.target.closest('.pr-conflict-badge[data-pr-conflict]');
    if (!badge) return;
    if (state.tooltip && state.ownerBadge === badge) {
      state.pinned = !state.pinned;
      state.tooltip.style.outline = state.pinned ? '2px solid #6366f1' : '';
    }
  }, true);

  document.addEventListener('click', (e) => {
    if (!e.target.closest) return;
    if (!state.tooltip) return;
    if (state.tooltip.contains(e.target)) return;
    if (e.target.closest('.pr-conflict-badge[data-pr-conflict]')) return;
    // If pinned (user dragged it), don't close on click-outside
    // Only the X button can close a pinned tooltip
    if (state.pinned) return;
    removeTooltip(false);
  });

  console.log('📅 Schedule calendar tooltip initialized');
})();