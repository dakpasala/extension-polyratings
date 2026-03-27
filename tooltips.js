// ==================== TOOLTIPS ====================
// Drop-in replacement — all existing function names preserved.
//
// Fixes:
//   ✅ position: fixed  (was: absolute — caused viewport vs page coord drift)
//   ✅ Skeleton loader  (was: "Loading..." text flash)
//   ✅ Smooth fade + slide  (was: bouncy cubic-bezier scale)
//   ✅ 500ms show delay  (was: 400ms — feels more intentional)
//   ✅ 150ms hide grace  (was: 100ms — less flicker on mouse movement)
//   ✅ Styles in a <style> tag  (was: inline cssText soup)
//   ✅ Clean minimal design  (was: gold gradient)

/* ─── Inject styles once ─────────────────────────────────────────────────── */
(function injectTooltipStyles() {
  if (document.getElementById("pr-tooltip-styles")) return;
  const style = document.createElement("style");
  style.id = "pr-tooltip-styles";
  style.textContent = `
    .pr-professor-tooltip {
      position: fixed;
      z-index: 99999;
      width: 268px;
      min-width: 200px;
      max-width: 700px;
      height: 400px;
      min-height: 300px;
      max-height: 90vh;
      background: #ffffff;
      border: 1px solid #e8e8e8;
      border-radius: 10px;
      box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.08),
        0 2px 4px -1px rgba(0, 0, 0, 0.04);
      font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      pointer-events: none;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.16s ease, transform 0.16s ease;
      user-select: none;
      display: flex;
      flex-direction: column;
      cursor: default;
      resize: both;
      overflow: hidden;
    }
    
    .pr-professor-tooltip.pr-dragging {
      transition: none;
      cursor: grabbing;
    }

    .pr-tooltip-header-section {
      cursor: grab;
    }

    .pr-tooltip-header-section:active {
      cursor: grabbing;
    }

    .pr-professor-tooltip.pr-tooltip-visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .pr-tooltip-inner {
      padding: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    /* Fixed header section */
    .pr-tooltip-header-section {
      flex-shrink: 0;
      padding: 13px 15px 0 15px;
      background: #fff;
      border-bottom: 1px solid #e8e8e8;
    }

    /* Tab navigation */
    .pr-tooltip-tabs {
      display: flex;
      gap: 4px;
      padding: 8px 0 0 0;
      overflow-x: auto;
      flex-shrink: 0;
      scrollbar-width: thin;
      margin: 0 -15px;
      padding-left: 15px;
      padding-right: 15px;
    }

    .pr-tooltip-tabs::-webkit-scrollbar {
      height: 4px;
    }

    .pr-tooltip-tabs::-webkit-scrollbar-thumb {
      background: #ddd;
      border-radius: 2px;
    }

    .pr-tooltip-tab {
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 500;
      color: #666;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      pointer-events: auto;
    }

    .pr-tooltip-tab:hover {
      color: #333;
      background: #f8f8f8;
    }

    .pr-tooltip-tab.active {
      color: #2a7a2a;
      border-bottom-color: #2a7a2a;
    }

    .pr-tooltip-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 13px 15px;
      min-height: 0; /* Critical for flex scrolling */
    }

    .pr-tooltip-section {
      scroll-margin-top: 10px;
      padding-bottom: 12px;
    }

    .pr-tooltip-section + .pr-tooltip-section {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
    }

    .pr-course-title {
      font-size: 13px;
      font-weight: 600;
      color: #111;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }

    .pr-review {
      background: #f8f8f8;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .pr-review:last-child {
      margin-bottom: 0;
    }

    .pr-review-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 6px;
      font-size: 10px;
      color: #666;
    }

    .pr-review-tag {
      background: #fff;
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid #e0e0e0;
    }

    .pr-review-text {
      font-size: 11.5px;
      line-height: 1.5;
      color: #333;
    }

    /* ── Header ── */
    .pr-tooltip-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 9px;
      cursor: grab;
      padding: 2px 0;
      position: relative;
    }
    
    .pr-tooltip-header:active {
      cursor: grabbing;
    }

    .pr-tooltip-close {
      position: absolute;
      top: 5px;
      right: 5px;
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
      transition: all 0.15s ease;
      pointer-events: auto;
      z-index: 10;
    }

    .pr-tooltip-close:hover {
      background: #e8e8e8;
      color: #333;
      transform: scale(1.1);
    }

    .pr-tooltip-name {
      font-size: 13px;
      font-weight: 600;
      color: #111;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Rating badge ── */
    .pr-badge {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 3px 7px;
      border-radius: 5px;
      font-size: 11.5px;
      font-weight: 600;
      white-space: nowrap;
    }
    .pr-badge-high { background: #edf7ed; color: #2a7a2a; }
    .pr-badge-mid  { background: #fff8e6; color: #8a6400; }
    .pr-badge-low  { background: #fdf0f0; color: #b84040; }
    .pr-badge-none { background: #f3f3f3; color: #777;    }

    /* ── Divider ── */
    .pr-tooltip-divider {
      height: 1px;
      background: #f0f0f0;
      margin-bottom: 9px;
    }

    /* ── Summary ── */
    .pr-tooltip-summary {
      font-size: 12px;
      color: #444;
      line-height: 1.55;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      transition: max-height 0.3s ease;
      max-height: calc(1.55em * 4);
    }

    /* Stays expanded until tooltip is dismissed — class toggled via JS */
    .pr-professor-tooltip.pr-tooltip-expanded .pr-tooltip-summary {
      -webkit-line-clamp: unset;
      max-height: 600px;
      overflow: visible;
      transition: max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* ── Footer ── */
    .pr-tooltip-footer {
      margin-top: 9px;
      padding-top: 9px;
      border-top: 1px solid #f0f0f0;
      font-size: 11px;
      color: #999;
    }

    /* ── Skeleton shimmer ── */
    .pr-skel {
      background: linear-gradient(
        90deg,
        #f0f0f0 25%,
        #e8e8e8 50%,
        #f0f0f0 75%
      );
      background-size: 200% 100%;
      animation: pr-shimmer 1.4s infinite;
      border-radius: 4px;
    }
    .pr-skel-name  { height: 13px; width: 50%; margin-bottom: 9px; }
    .pr-skel-badge { height: 21px; width: 52px; border-radius: 5px; }
    .pr-skel-line  { height: 11px; margin-bottom: 6px; }

    @keyframes pr-shimmer {
      0%   { background-position:  200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
})();

/* ─── State ──────────────────────────────────────────────────────────────── */
function initTooltipState() {
  if (!window.PRTooltipState) {
    window.PRTooltipState = {
      owner: null,
      showTimeout: null,
      hideTimeout: null,
      expandTimeout: null,
      currentTooltip: null,
      isHovering: false,
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
    };
    // Tooltips now persist — user closes via X button
  }
}

/* ─── Attach hover listeners ─────────────────────────────────────────────── */
function addHoverTooltip(element, professor) {
  initTooltipState();

  element.addEventListener("mouseenter", () => {
    window.PRTooltipState.isHovering = true;

    clearTimeout(window.PRTooltipState.hideTimeout);
    window.PRTooltipState.hideTimeout = null;
    clearTimeout(window.PRTooltipState.showTimeout);
    window.PRTooltipState.showTimeout = null;

    // If a different element was active, hide it immediately
    if (
      window.PRTooltipState.owner &&
      window.PRTooltipState.owner !== element
    ) {
      hideProfessorTooltip(window.PRTooltipState.owner, true);
    }

    // Collapse expanded state when returning to the name
    const existing = window.PRTooltipState.currentTooltip;
    if (existing) {
      clearTimeout(window.PRTooltipState.expandTimeout);
      existing.classList.remove("pr-tooltip-expanded");
    }

    window.PRTooltipState.owner = element;

    // 500ms delay — feels intentional, not accidental
    window.PRTooltipState.showTimeout = setTimeout(() => {
      if (
        window.PRTooltipState.isHovering &&
        window.PRTooltipState.owner === element &&
        document.contains(element)
      ) {
        showProfessorTooltip(element, professor);
      }
      window.PRTooltipState.showTimeout = null;
    }, 500);
  });

  element.addEventListener("mouseleave", () => {
    window.PRTooltipState.isHovering = false;
    clearTimeout(window.PRTooltipState.showTimeout);
    window.PRTooltipState.showTimeout = null;
    // Tooltip stays open — user must click X to close
  });
}

/* ─── Show ───────────────────────────────────────────────────────────────── */
function showProfessorTooltip(element, professor) {
  hideProfessorTooltip(null, true);

  if (!element || !document.contains(element)) return;

  const tooltip = document.createElement("div");
  // Keep CSS_CLASSES.PROFESSOR_TOOLTIP so hideProfessorTooltip's querySelector
  // still works — add our styling class alongside it
  tooltip.className = `${CSS_CLASSES.PROFESSOR_TOOLTIP} pr-professor-tooltip`;
  tooltip.setAttribute(CSS_CLASSES.DATA_ATTR, "true");

  window.PRTooltipState.currentTooltip = tooltip;

  // Skeleton immediately — no "Loading..." flash
  tooltip.innerHTML = buildSkeleton();
  document.body.appendChild(tooltip);
  positionTooltip(tooltip, element);

  // Fade in on next two frames (one to paint, one to transition)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (window.PRTooltipState.currentTooltip === tooltip) {
        tooltip.classList.add("pr-tooltip-visible");
      }
    });
  });

  // Fetch real content from background script
  chrome.runtime.sendMessage(
    { type: "getGeminiTooltipAnalysis", profName: professor.name },
    (response) => {
      if (
        !tooltip.parentNode ||
        window.PRTooltipState.currentTooltip !== tooltip
      ) return;

      if (response?.status === "success" && response.professor) {
        const prof = response.professor;
        tooltip.innerHTML = buildContent(
          prof.name,
          prof.rating,
          prof.numEvals,
          prof.department,
          response.analysis,
          [] // Empty reviews initially - we'll fetch separately
        );
        
        // Re-position after real content loads
        positionTooltip(tooltip, element);
        // Re-attach drag after content rebuild
        setupDragListeners(tooltip);

        // NOW fetch reviews separately (async, doesn't block tooltip)
        chrome.runtime.sendMessage(
          { type: "getProfessorReviews", profName: prof.name },
          (reviewsResponse) => {
            if (reviewsResponse?.status === "success" && reviewsResponse.reviews) {
              // Rebuild tooltip with reviews added
              tooltip.innerHTML = buildContent(
                prof.name,
                prof.rating,
                prof.numEvals,
                prof.department,
                response.analysis,
                reviewsResponse.reviews
              );
              positionTooltip(tooltip, element);
              setupDragListeners(tooltip);
            }
          }
        );
      } else {
        // Not found or error — show fallback with whatever analysis text exists
        tooltip.innerHTML = buildContent(
          professor.name,
          null,
          null,
          null,
          response?.analysis || null,
          []
        );
        positionTooltip(tooltip, element);
        setupDragListeners(tooltip);
      }
    }
  );

  // Setup initial drag listeners
  setupDragListeners(tooltip);
  
  // Hovering onto the tooltip — expand and stay open
  tooltip.addEventListener("mouseenter", () => {
    window.PRTooltipState.isHovering = true;
    clearTimeout(window.PRTooltipState.hideTimeout);
    window.PRTooltipState.hideTimeout = null;
    // Small delay before expanding — feels intentional, not jumpy
    window.PRTooltipState.expandTimeout = setTimeout(() => {
      tooltip.classList.add("pr-tooltip-expanded");
      // Re-clamp after expansion changes height
      setTimeout(() => {
        const rect = tooltip.getBoundingClientRect();
        const margin = 10;
        const vh = window.innerHeight;
        if (rect.bottom > vh - margin) {
          const overflow = rect.bottom - (vh - margin);
          const currentTop = parseInt(tooltip.style.top);
          tooltip.style.top = `${Math.max(margin, currentTop - overflow)}px`;
        }
      }, 500); // wait for transition
    }, 120);
  });

  tooltip.addEventListener("mouseleave", (e) => {
    // Don't hide if dragging or mouse is still within tooltip
    if (window.PRTooltipState.isDragging || 
        tooltip.contains(e.relatedTarget)) {
      return;
    }
    window.PRTooltipState.isHovering = false;
    clearTimeout(window.PRTooltipState.expandTimeout);
    // Tooltip stays open — user must click X to close
  });
}

/* ─── Drag setup helper ─────────────────────────────────────────────────── */
function setupDragListeners(tooltip) {
  const headerSection = tooltip.querySelector(".pr-tooltip-header-section");
  const header = tooltip.querySelector(".pr-tooltip-header");
  const tabs = tooltip.querySelectorAll(".pr-tooltip-tab");
  const content = tooltip.querySelector(".pr-tooltip-content");
  const closeBtn = tooltip.querySelector(".pr-tooltip-close");
  
  if (!header) return;

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      tooltip.remove();
    });
  }

  // Tab navigation
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const sectionId = tab.dataset.section;
      const section = tooltip.querySelector(`[data-section-id="${sectionId}"]`);
      if (section && content) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Scroll spy - highlight active tab based on scroll position
  if (content) {
    content.addEventListener("scroll", () => {
      const sections = tooltip.querySelectorAll(".pr-tooltip-section");
      let currentSection = null;

      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        if (rect.top <= contentRect.top + 50) {
          currentSection = section.dataset.sectionId;
        }
      });

      if (currentSection) {
        tabs.forEach(tab => {
          if (tab.dataset.section === currentSection) {
            tab.classList.add("active");
          } else {
            tab.classList.remove("active");
          }
        });
      }
    });
  }

  // Make header draggable
  if (headerSection) {
    let startX, startY, tooltipLeft, tooltipTop;

    headerSection.addEventListener("mousedown", (e) => {
      // Don't drag if clicking close button or tab
      if (e.target.classList.contains("pr-tooltip-close") || 
          e.target.classList.contains("pr-tooltip-tab")) return;
      
      e.preventDefault();
      window.PRTooltipState.isDragging = true;
      tooltip.classList.add("pr-dragging");
      
      startX = e.clientX;
      startY = e.clientY;
      tooltipLeft = parseInt(tooltip.style.left) || 0;
      tooltipTop = parseInt(tooltip.style.top) || 0;

      const onMouseMove = (moveEvent) => {
        if (!window.PRTooltipState.isDragging) return;
        
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        
        let newLeft = tooltipLeft + deltaX;
        let newTop = tooltipTop + deltaY;

        // Clamp to viewport edges
        const tipW = tooltip.offsetWidth;
        const tipH = tooltip.offsetHeight;
        const margin = 10;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        newLeft = Math.max(margin, Math.min(newLeft, vw - tipW - margin));
        newTop = Math.max(margin, Math.min(newTop, vh - tipH - margin));

        tooltip.style.left = `${newLeft}px`;
        tooltip.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        window.PRTooltipState.isDragging = false;
        tooltip.classList.remove("pr-dragging");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }
}

/* ─── Position ───────────────────────────────────────────────────────────── */
// Uses fixed positioning so getBoundingClientRect() coords align correctly.
// Always clamps to viewport on all 4 edges, respecting max-height.
function positionTooltip(tooltip, element) {
  const rect   = element.getBoundingClientRect();
  const tipW   = tooltip.offsetWidth  || 268;
  const maxTipH = 500; // Match CSS max-height
  const tipH   = Math.min(tooltip.offsetHeight || 200, maxTipH);
  const margin = 10;
  const vw     = window.innerWidth;
  const vh     = window.innerHeight;

  // Horizontal: centre under/over element, clamped to viewport
  let left = rect.left + rect.width / 2 - tipW / 2;
  left = Math.max(margin, Math.min(left, vw - tipW - margin));

  // Vertical: prefer above, flip below if not enough room
  let top;
  if (rect.top - tipH - 4 >= margin) {
    top = rect.top - tipH - 4;   // above, only 4px gap
  } else {
    top = rect.bottom + 4;        // below, only 4px gap
  }
  
  // Critical: clamp to ensure tooltip never goes off bottom
  top = Math.max(margin, Math.min(top, vh - tipH - margin));

  tooltip.style.left = `${left}px`;
  tooltip.style.top  = `${top}px`;
}

/* ─── Hide ───────────────────────────────────────────────────────────────── */
function hideProfessorTooltip(owner = null, immediate = false) {
  const existingTooltip = document.querySelector(
    `.${CSS_CLASSES.PROFESSOR_TOOLTIP}`
  );

  if (!existingTooltip) return;
  if (owner && window.PRTooltipState?.owner !== owner) return;

  const removeNow = () => {
    existingTooltip.parentNode?.removeChild(existingTooltip);
    if (window.PRTooltipState) {
      if (!owner || window.PRTooltipState.owner === owner) {
        window.PRTooltipState.owner = null;
      }
      if (window.PRTooltipState.currentTooltip === existingTooltip) {
        window.PRTooltipState.currentTooltip = null;
      }
    }
  };

  if (immediate) {
    removeNow();
  } else {
    existingTooltip.classList.remove("pr-tooltip-visible");
    setTimeout(removeNow, 180); // matches transition duration
  }
}

/* ─── HTML builders ──────────────────────────────────────────────────────── */
function buildSkeleton() {
  return `
    <div class="pr-tooltip-inner">
      <div class="pr-tooltip-header">
        <div class="pr-skel pr-skel-name"></div>
        <div class="pr-skel pr-skel-badge"></div>
      </div>
      <div class="pr-tooltip-divider"></div>
      <div class="pr-skel pr-skel-line" style="width:100%"></div>
      <div class="pr-skel pr-skel-line" style="width:88%"></div>
      <div class="pr-skel pr-skel-line" style="width:76%"></div>
      <div class="pr-skel pr-skel-line" style="width:60%"></div>
    </div>
  `;
}

function buildContent(name, rating, numEvals, department, analysis, reviews = []) {
  const hasRating = rating && parseFloat(rating) > 0;
  const ratingVal = hasRating ? parseFloat(rating) : null;

  let badgeClass, badgeText;
  if (!hasRating) {
    badgeClass = "pr-badge-none";
    badgeText  = "Not rated";
  } else if (ratingVal >= 4.0) {
    badgeClass = "pr-badge-high";
    badgeText  = `★ ${ratingVal.toFixed(1)}`;
  } else if (ratingVal >= 3.0) {
    badgeClass = "pr-badge-mid";
    badgeText  = `★ ${ratingVal.toFixed(1)}`;
  } else {
    badgeClass = "pr-badge-low";
    badgeText  = `★ ${ratingVal.toFixed(1)}`;
  }

  const summaryText = analysis
    ? escapeHtml(
        analysis
          .replace(/https?:\/\/[^\s]+/g, "")
          .replace(/\n+/g, " ")
          .trim()
      )
    : "No summary available.";

  const footerParts = [
    department || "",
    numEvals ? `${numEvals} reviews` : "",
  ].filter(Boolean);
  const footerText = footerParts.length
    ? escapeHtml(footerParts.join(" · "))
    : "PolyRatings";

  // Group reviews by course
  const reviewsByCourse = {};
  (reviews || []).forEach(review => {
    const course = review.course || "Unknown Course";
    if (!reviewsByCourse[course]) {
      reviewsByCourse[course] = [];
    }
    reviewsByCourse[course].push(review);
  });

  const courses = Object.keys(reviewsByCourse).sort();
  
  // Build tabs
  const tabs = ['<button class="pr-tooltip-tab active" data-section="overview">AI Overview</button>'];
  courses.forEach(course => {
    const count = reviewsByCourse[course].length;
    tabs.push(`<button class="pr-tooltip-tab" data-section="${escapeHtml(course)}">${escapeHtml(course)} (${count})</button>`);
  });

  // Build sections
  const sections = [];
  
  // AI Overview section (no header in content, it's in the fixed header)
  sections.push(`
    <div class="pr-tooltip-section" data-section-id="overview">
      <div class="pr-tooltip-summary">${summaryText}</div>
      <div class="pr-tooltip-footer">${footerText}</div>
    </div>
  `);

  // Course review sections
  courses.forEach(course => {
    const courseReviews = reviewsByCourse[course];
    const reviewsHtml = courseReviews.map(review => {
      const meta = [];
      if (review.rating) meta.push(`★ ${review.rating.toFixed(1)}`);
      if (review.grade) meta.push(`Grade: ${review.grade}`);
      if (review.gradeLevel) meta.push(review.gradeLevel);
      if (review.date) {
        const date = new Date(review.date);
        meta.push(date.getFullYear());
      }

      return `
        <div class="pr-review">
          <div class="pr-review-meta">
            ${meta.map(m => `<span class="pr-review-tag">${escapeHtml(m)}</span>`).join('')}
          </div>
          <div class="pr-review-text">${escapeHtml(review.text)}</div>
        </div>
      `;
    }).join('');

    sections.push(`
      <div class="pr-tooltip-section" data-section-id="${escapeHtml(course)}">
        <div class="pr-course-title">${escapeHtml(course)}</div>
        ${reviewsHtml}
      </div>
    `);
  });

  return `
    <div class="pr-tooltip-inner">
      <button class="pr-tooltip-close" title="Close">×</button>
      <div class="pr-tooltip-header-section">
        <div class="pr-tooltip-header">
          <span class="pr-tooltip-name">${escapeHtml(name)}</span>
          <span class="pr-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="pr-tooltip-tabs">
          ${tabs.join('')}
        </div>
      </div>
      <div class="pr-tooltip-content">
        ${sections.join('')}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}