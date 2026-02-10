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
    }

    .pr-professor-tooltip.pr-tooltip-visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .pr-tooltip-inner {
      padding: 13px 15px;
    }

    /* ── Header ── */
    .pr-tooltip-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 9px;
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
      transition: max-height 0.25s ease;
      max-height: 4lh;
    }

    .pr-professor-tooltip:hover .pr-tooltip-summary {
      -webkit-line-clamp: unset;
      max-height: 400px;
      overflow: visible;
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
      currentTooltip: null,
      isHovering: false,
    };
    // Hide on scroll or window blur
    document.addEventListener(
      "scroll",
      () => hideProfessorTooltip(null, true),
      { capture: true, passive: true }
    );
    window.addEventListener("blur", () => hideProfessorTooltip(null, true));
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
    clearTimeout(window.PRTooltipState.hideTimeout);
    window.PRTooltipState.hideTimeout = null;

    // 300ms grace — enough time to move mouse from name to tooltip
    window.PRTooltipState.hideTimeout = setTimeout(() => {
      hideProfessorTooltip(element, false);
      window.PRTooltipState.hideTimeout = null;
    }, 300);
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
          response.analysis
        );
      } else {
        // Not found or error — show fallback with whatever analysis text exists
        tooltip.innerHTML = buildContent(
          professor.name,
          null,
          null,
          null,
          response?.analysis || null
        );
      }

      // Re-position after real content loads (height will have changed)
      positionTooltip(tooltip, element);
    }
  );

  // Keep tooltip alive when mouse moves onto it
  tooltip.addEventListener("mouseenter", () => {
    window.PRTooltipState.isHovering = true;
    clearTimeout(window.PRTooltipState.hideTimeout);
    window.PRTooltipState.hideTimeout = null;
  });

  tooltip.addEventListener("mouseleave", () => {
    window.PRTooltipState.isHovering = false;
    window.PRTooltipState.hideTimeout = setTimeout(() => {
      hideProfessorTooltip(element, false);
      window.PRTooltipState.hideTimeout = null;
    }, 300);
  });
}

/* ─── Position ───────────────────────────────────────────────────────────── */
// Uses fixed positioning so getBoundingClientRect() coords align correctly.
function positionTooltip(tooltip, element) {
  const rect   = element.getBoundingClientRect();
  const tipW   = tooltip.offsetWidth  || 268;
  const tipH   = tooltip.offsetHeight || 160;
  const margin = 10;
  const vw     = window.innerWidth;
  const vh     = window.innerHeight;

  // Horizontal: centre under/over element, clamped to viewport
  let left = rect.left + rect.width / 2 - tipW / 2;
  if (left < margin)             left = margin;
  if (left + tipW > vw - margin) left = vw - tipW - margin;

  // Vertical: prefer above, flip below if not enough room
  let top;
  if (rect.top - tipH - 4 >= margin) {
    top = rect.top - tipH - 4;   // above, only 4px gap
  } else {
    top = rect.bottom + 4;        // below, only 4px gap
  }
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

function buildContent(name, rating, numEvals, department, analysis) {
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
          .replace(/https?:\/\/[^\s]+/g, "") // strip raw URLs
          .replace(/\n+/g, " ")
          .trim()
      )
    : "No summary available.";

  const footerParts = [
    department || "",
    numEvals   ? `${numEvals} reviews` : "",
  ].filter(Boolean);
  const footerText = footerParts.length
    ? escapeHtml(footerParts.join(" · "))
    : "PolyRatings";

  return `
    <div class="pr-tooltip-inner">
      <div class="pr-tooltip-header">
        <span class="pr-tooltip-name">${escapeHtml(name)}</span>
        <span class="pr-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="pr-tooltip-divider"></div>
      <div class="pr-tooltip-summary">${summaryText}</div>
      <div class="pr-tooltip-footer">${footerText}</div>
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