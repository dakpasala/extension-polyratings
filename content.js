// PolyRatings Enhancer - Content Script (Complete Fixed Version)
console.log("PolyRatings Enhancer content script loaded!");

// Track current URL for page change detection
let currentUrl = window.location.href.split("#")[0]; // Initialize currentUrl

// Track processed professors to prevent re-processing
const processedProfessors = new Set();

// Throttle rendering while scrolling to avoid flicker in virtualized lists
if (!window.prScrollState) {
  window.prScrollState = { busy: false, t: null };
  const onScroll = () => {
    window.prScrollState.busy = true;
    if (window.prScrollState.t) clearTimeout(window.prScrollState.t);
    window.prScrollState.t = setTimeout(() => {
      window.prScrollState.busy = false;
      window.prScrollState.t = null;
    }, 150);
  };
  document.addEventListener("scroll", onScroll, {
    capture: true,
    passive: true,
  });
}

// Check if an element is mostly visible in the viewport
function isElementMostlyVisible(el) {
  try {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    if (rect.width === 0 || rect.height === 0) return false;
    const vertVisible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    const horizVisible = Math.min(rect.right, vw) - Math.max(rect.left, 0);
    const visibleArea = Math.max(0, vertVisible) * Math.max(0, horizVisible);
    const totalArea = rect.width * rect.height;
    return totalArea > 0 && visibleArea / totalArea >= 0.4; // at least 40% visible
  } catch (_) {
    return true;
  }
}

// Promise wrapper for chrome.runtime.sendMessage
function prMessage(type, payload) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type, ...payload }, (response) => {
        resolve(response || { status: "error", message: "no_response" });
      });
    } catch (e) {
      resolve({ status: "error", message: e?.message || "send_failed" });
    }
  });
}

// Schedule a stable render when element is visible and not actively scrolling
function scheduleStableRender(hostElement, renderFn, attempts = 10) {
  const tryRender = () => {
    if (window.prScrollState?.busy) {
      if (attempts <= 0) return;
      setTimeout(
        () => scheduleStableRender(hostElement, renderFn, attempts - 1),
        80
      );
      return;
    }
    if (!isElementMostlyVisible(hostElement)) {
      if (attempts <= 0) return;
      setTimeout(
        () => scheduleStableRender(hostElement, renderFn, attempts - 1),
        120
      );
      return;
    }
    try {
      renderFn();
    } catch (_) {}
  };
  tryRender();
}

// Determine if extension should be disabled based on class notes content
function shouldDisableForClassNotes(rootDoc) {
  try {
    const doc = rootDoc || document;

    // Structured scan: find explicit Class Notes headers and read nearby text
    const headers = Array.from(
      doc.querySelectorAll("p.cx-MuiTypography-h4, .cx-MuiTypography-h4")
    ).filter(
      (el) => (el.textContent || "").trim().toLowerCase() === "class notes"
    );

    const disablingPhrases = [
      "additional time",
      "continuous enroll",
      "continuous enrollment",
    ];

    for (const header of headers) {
      // Notes text is often in a following sibling <p> or within the same container
      let notesContainer = header.parentElement;
      let notesText = "";

      // Try immediate nextElementSibling first
      if (header.nextElementSibling) {
        notesText = header.nextElementSibling.textContent || "";
      }

      // Fallback: search the parent block for any body text element
      if (!notesText && notesContainer) {
        const bodyNode = notesContainer.querySelector(
          ".cx-MuiTypography-body1, .cx-MuiTypography-body2, p"
        );
        if (bodyNode) notesText = bodyNode.textContent || "";
      }

      notesText = notesText.toLowerCase();
      if (disablingPhrases.some((p) => notesText.includes(p))) return true;
    }

    // Fallback to whole-document text scan in case structure changes
    const bodyText = (
      doc.body && doc.body.innerText
        ? doc.body.innerText
        : doc.documentElement.textContent || ""
    ).toLowerCase();
    if (!bodyText.includes("class notes")) return false;
    return disablingPhrases.some((phrase) => bodyText.includes(phrase));
  } catch (e) {
    return false;
  }
}

const PR_DISABLE_FOR_NOTES = shouldDisableForClassNotes();

// Determine if Agent button should be enabled (Cal Poly domains + Select Sections)
function shouldEnableAgent(rootDoc) {
  const doc = rootDoc || document;
  const host = (location && location.hostname) || "";
  const isCalPoly =
    /(?:^|\.)calpoly\.edu$/i.test(host) || /calpoly\.edu$/i.test(host);
  if (!isCalPoly) return false;
  try {
    const text = (
      doc.body?.innerText ||
      doc.documentElement?.textContent ||
      ""
    ).toLowerCase();
    if (text.includes("select sections")) return true;
  } catch (_) {}
  return false;
}

// Function to mark professor as processed
function markProfessorProcessed(professorName, elementId) {
  const key = `${professorName}-${elementId}`;
  processedProfessors.add(key);
}

// Function to check if professor is already processed
function isProfessorProcessed(professorName, elementId) {
  const key = `${professorName}-${elementId}`;
  return processedProfessors.has(key);
}

// OR make it smarter:
function clearRatingsIfUrlChanged() {
  // Ensure currentUrl is defined (defensive programming)
  if (typeof currentUrl === "undefined") {
    currentUrl = window.location.href.split("#")[0];
  }

  const newUrl = window.location.href.split("#")[0]; // ignore hash changes
  if (newUrl !== currentUrl) {
    console.log("🔄 Major URL changed, clearing existing ratings");
    document
      .querySelectorAll(".polyratings-rating-element")
      .forEach((r) => r.remove());
    currentUrl = newUrl;
  }
}

// Monitor URL changes (reduced frequency for better performance)
setInterval(clearRatingsIfUrlChanged, 3000);

function prInjectStyles() {
  if (document.getElementById("pr-style")) return;
  const style = document.createElement("style");
  style.id = "pr-style";
  style.textContent = `
      /* --- Table Layout Fixes --- */
      
      /* Ensure expansion panel summaries don't break out of containers */
      .cx-MuiExpansionPanelSummary-root {
        width: 100% !important;
        max-width: 100% !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* Ensure all expansion panels have consistent sizing */
      .cx-MuiExpansionPanel-root,
      [class*="cx-MuiExpansionPanel-root"] {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        margin: 0 !important;
      }
      
      /* Force all content within expansion panels to respect boundaries */
      .cx-MuiExpansionPanelSummary-root * {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      
      /* Comprehensive grid container constraints - catch all variations */
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-container,
      .cx-MuiExpansionPanelSummary-root [class*="cx-MuiGrid-container"] {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      }
      
      /* Ensure all grid items respect container boundaries */
      .cx-MuiExpansionPanelSummary-root [class*="cx-MuiGrid-grid-xs"],
      .cx-MuiExpansionPanelSummary-root [class*="cx-MuiGrid-item"] {
        max-width: 100% !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
      
      /* Base grid item styling - prevent content overflow and set consistent padding */
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item {
        overflow: hidden !important;
        padding: 5px 2px !important; /* Small horizontal padding for breathing room */
        min-height: 38px !important; /* Slightly reduced minimum height */
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important; /* Left align by default to match headers */
        box-sizing: border-box !important;
      }
      
      /* Checkbox column (first column) - center aligned */
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:first-child {
        justify-content: center !important;
        padding: 5px 2px !important; /* Small horizontal padding */
      }
      
      /* Section name Typography - left aligned */
      .cx-MuiExpansionPanelSummary-root .cx-MuiTypography-root.cx-MuiTypography-body2.cx-MuiTypography-noWrap {
        text-align: left !important;
      }
      
      /* Instructor column (xs-4) - left aligned with more space */
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-4 {
        justify-content: flex-start !important;
        padding: 5px 2px !important; /* Small horizontal padding */
      }
      
      /* Typography base styling - text truncation with ellipsis */
      .cx-MuiExpansionPanelSummary-root .cx-MuiTypography-root {
        width: 100% !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        line-height: 1.4 !important;
        text-align: center !important; /* Default center alignment */
      }
      
      /* Typography in instructor column - left aligned */
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-4 .cx-MuiTypography-root {
        text-align: left !important;
      }
      
      /* Typography for specific columns that should be left aligned */
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-2 .cx-MuiTypography-root,
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-3 .cx-MuiTypography-root {
        text-align: left !important;
      }
      
      /* Only right-align the wait list or status column (typically xs-1 at the end) */
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-1:last-child {
        justify-content: flex-end !important;
        padding: 5px 2px !important; /* Small horizontal padding */
      }
      
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-1:last-child .cx-MuiTypography-root {
        text-align: right !important;
      }
      
      /* Ensure form controls (checkboxes, buttons) are properly centered */
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item input[type="checkbox"],
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item button {
        margin: 0 auto !important;
        display: block !important;
      }
      
      /* Class notes section - keep left aligned */
      .cx-MuiDivider-root.mx-3,
      .cx-MuiDivider-root.mx-3 + *,
      .cx-MuiDivider-root.mx-3 ~ * {
        text-align: left !important;
        justify-content: flex-start !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
      
      /* Typography in class notes sections */
      .cx-MuiDivider-root.mx-3 + * .cx-MuiTypography-root,
      .cx-MuiDivider-root.mx-3 ~ * .cx-MuiTypography-root {
        text-align: left !important;
        justify-content: flex-start !important;
        white-space: normal !important; /* Allow wrapping for class notes */
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      
      /* Specific fix for class notes content containers */
      .cx-MuiExpansionPanelDetails-root,
      [class*="cx-MuiExpansionPanelDetails"] {
        max-width: 100% !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        word-wrap: break-word !important;
      }
      
      /* Override ellipsis truncation for class notes */
      .cx-MuiExpansionPanelDetails-root .cx-MuiTypography-root,
      [class*="cx-MuiExpansionPanelDetails"] .cx-MuiTypography-root {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: unset !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
      
      /* Styles for rating elements */
      .polyratings-rating-element {
        display: inline-flex !important;
        align-items: center !important;
        padding: 4px 10px !important; /* Slightly more padding */
        border: 1px solid #7F8A9E !important;
        border-radius: 12px !important;
        font-size: 12px !important;
        color: #090d19 !important;
        background: rgba(255, 255, 255, 0.9) !important;
        text-decoration: none !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
        margin-top: 4px !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      
      /* Smooth animations with better UX */
      
      /* Loading skeleton for better perceived performance */
      .polyratings-loading-skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading-shimmer 1.5s infinite;
        border-radius: 12px;
        height: 24px;
        width: 80px;
    display: inline-block;
        margin: 2px 0;
      }
      
      @keyframes loading-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      /* Gradient-coded stars based on rating */
      .rating-stars-excellent {
        fill: #FFD700 !important; /* Original solid gold color for 3.0+ */
        stroke: #B8860B !important;
        filter: drop-shadow(0 0 3px rgba(255, 215, 0, 0.4));
      }
      
      .rating-stars-high {
        fill: url(#yellowOrangeGradient) !important;
        stroke: #CC6600 !important;
        filter: drop-shadow(0 0 2px rgba(255, 165, 0, 0.3));
      }
      
      .rating-stars-medium {
        fill: url(#orangeGradient) !important;
        stroke: #CC4400 !important;
        filter: drop-shadow(0 0 2px rgba(255, 140, 0, 0.3));
      }
      
      .rating-stars-low {
        fill: url(#redGradient) !important;
        stroke: #CC0000 !important;
        filter: drop-shadow(0 0 2px rgba(255, 107, 0, 0.3));
      }
      
      /* ==========================================================
         === CENTER ALIGN FIRST 5 COLUMNS (header + body) ===
         ========================================================== */

      /* Header buttons: Section, Topic, Unreserved, Reserved, Waitlist */
      [role="row"] .cx-MuiGrid-item:nth-child(1) button,
      [role="row"] .cx-MuiGrid-item:nth-child(2) button,
      [role="row"] .cx-MuiGrid-item:nth-child(3) button,
      [role="row"] .cx-MuiGrid-item:nth-child(4) button,
      [role="row"] .cx-MuiGrid-item:nth-child(5) button {
        justify-content: center !important;
        text-align: center !important;
      }

      [role="row"] .cx-MuiGrid-item:nth-child(1) button .cx-MuiTypography-root,
      [role="row"] .cx-MuiGrid-item:nth-child(2) button .cx-MuiTypography-root,
      [role="row"] .cx-MuiGrid-item:nth-child(3) button .cx-MuiTypography-root,
      [role="row"] .cx-MuiGrid-item:nth-child(4) button .cx-MuiTypography-root,
      [role="row"] .cx-MuiGrid-item:nth-child(5) button .cx-MuiTypography-root {
        text-align: center !important;
      }

      /* Row data alignment for same 5 columns */
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:nth-child(1),
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:nth-child(2),
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:nth-child(3),
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:nth-child(4),
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:nth-child(5) {
        justify-content: center !important;
        text-align: center !important;
      }

      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:nth-child(1) .cx-MuiTypography-root,
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:nth-child(2) .cx-MuiTypography-root,
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:nth-child(3) .cx-MuiTypography-root,
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:nth-child(4) .cx-MuiTypography-root,
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:nth-child(5) .cx-MuiTypography-root {
        text-align: center !important;
      }

      /* ==========================================================
         === NOW: LEFT-ALIGN THE REST (Instructor → Status) ===
         ========================================================== */

      /* Headers: the nested group (Instructor, Days, Start, End, Room) */
      [role="row"] .cx-MuiGrid-grid-xs-5 {
        display: flex !important;
        justify-content: flex-start !important;
        align-items: center !important;
      }
      [role="row"] .cx-MuiGrid-grid-xs-5 button {
        justify-content: flex-start !important;
        text-align: left !important;
      }
      [role="row"] .cx-MuiGrid-grid-xs-5 button .cx-MuiTypography-root {
        text-align: left !important;
      }

      /* Header: Status (last column) */
      [role="row"] .cx-MuiGrid-grid-xs-1:last-child,
      [role="row"] .cx-MuiGrid-item:last-child {
        justify-content: flex-start !important;
      }
      [role="row"] .cx-MuiGrid-item:last-child button,
      [role="row"] .cx-MuiGrid-item:last-child .cx-MuiTypography-root {
        text-align: left !important;
      }

      /* Row cells: Instructor → Days → Start → End → Room */
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-5 .cx-MuiGrid-grid-xs-4 {
        display: flex !important;
        justify-content: flex-start !important;
        text-align: left !important;
        align-items: center !important;
      }
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-5 .cx-MuiGrid-grid-xs-4 .cx-MuiTypography-root {
        text-align: left !important;
      }

      /* Row cells: Status (last column) */
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-1:last-child,
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:last-child {
        justify-content: flex-start !important;
      }
      .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:last-child .cx-MuiTypography-root {
        text-align: left !important;
      }
    `;
  document.documentElement.appendChild(style);
}
prInjectStyles();

// Function to create loading skeleton
function createLoadingSkeleton() {
  const skeleton = document.createElement("div");
  skeleton.className = "polyratings-loading-skeleton";
  skeleton.setAttribute("data-loading", "true");
  return skeleton;
}

// Function to get rating class based on professor rating
function getRatingClass(rating) {
  const numRating = parseFloat(rating);

  if (numRating >= 3.0) {
    return "rating-stars-excellent"; // Gold gradient for 3.0+ (original color)
  } else if (numRating >= 2.0) {
    return "rating-stars-high"; // Yellow-orange gradient for 2.0-2.9
  } else if (numRating >= 1.0) {
    return "rating-stars-medium"; // Orange gradient for 1.0-1.9
  } else {
    return "rating-stars-low"; // Red gradient for <1.0
  }
}

// Function to ensure SVG gradients are available
function ensureSVGGradients() {
  if (document.getElementById("polyratings-gradients")) return;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = "absolute";
  svg.style.width = "0";
  svg.style.height = "0";
  svg.style.visibility = "hidden";
  svg.id = "polyratings-gradients";

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

  // Gold gradient (3.0+) - original color
  const goldGradient = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "linearGradient"
  );
  goldGradient.id = "goldGradient";
  goldGradient.setAttribute("x1", "0%");
  goldGradient.setAttribute("y1", "0%");
  goldGradient.setAttribute("x2", "100%");
  goldGradient.setAttribute("y2", "100%");

  const goldStop1 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "stop"
  );
  goldStop1.setAttribute("offset", "0%");
  goldStop1.setAttribute("stop-color", "#FFD700");
  const goldStop2 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "stop"
  );
  goldStop2.setAttribute("offset", "50%");
  goldStop2.setAttribute("stop-color", "#FFA500");
  const goldStop3 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "stop"
  );
  goldStop3.setAttribute("offset", "100%");
  goldStop3.setAttribute("stop-color", "#FF8C00");

  goldGradient.appendChild(goldStop1);
  goldGradient.appendChild(goldStop2);
  goldGradient.appendChild(goldStop3);

  // Yellow-orange gradient (2.0-2.9)
  const yellowOrangeGradient = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "linearGradient"
  );
  yellowOrangeGradient.id = "yellowOrangeGradient";
  yellowOrangeGradient.setAttribute("x1", "0%");
  yellowOrangeGradient.setAttribute("y1", "0%");
  yellowOrangeGradient.setAttribute("x2", "100%");
  yellowOrangeGradient.setAttribute("y2", "100%");

  const yellowStop1 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "stop"
  );
  yellowStop1.setAttribute("offset", "0%");
  yellowStop1.setAttribute("stop-color", "#FFA500");
  const yellowStop2 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "stop"
  );
  yellowStop2.setAttribute("offset", "50%");
  yellowStop2.setAttribute("stop-color", "#FF8C00");
  const yellowStop3 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "stop"
  );
  yellowStop3.setAttribute("offset", "100%");
  yellowStop3.setAttribute("stop-color", "#FF7F00");

  yellowOrangeGradient.appendChild(yellowStop1);
  yellowOrangeGradient.appendChild(yellowStop2);
  yellowOrangeGradient.appendChild(yellowStop3);

  // Orange gradient (1.0-1.9)
  const orangeGradient = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "linearGradient"
  );
  orangeGradient.id = "orangeGradient";
  orangeGradient.setAttribute("x1", "0%");
  orangeGradient.setAttribute("y1", "0%");
  orangeGradient.setAttribute("x2", "100%");
  orangeGradient.setAttribute("y2", "100%");

  const orangeStop1 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "stop"
  );
  orangeStop1.setAttribute("offset", "0%");
  orangeStop1.setAttribute("stop-color", "#FF8C00");
  const orangeStop2 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "stop"
  );
  orangeStop2.setAttribute("offset", "50%");
  orangeStop2.setAttribute("stop-color", "#FF7F00");
  const orangeStop3 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "stop"
  );
  orangeStop3.setAttribute("offset", "100%");
  orangeStop3.setAttribute("stop-color", "#FF6B00");

  orangeGradient.appendChild(orangeStop1);
  orangeGradient.appendChild(orangeStop2);
  orangeGradient.appendChild(orangeStop3);

  // Red gradient (<1.0)
  const redGradient = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "linearGradient"
  );
  redGradient.id = "redGradient";
  redGradient.setAttribute("x1", "0%");
  redGradient.setAttribute("y1", "0%");
  redGradient.setAttribute("x2", "100%");
  redGradient.setAttribute("y2", "100%");

  const redStop1 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "stop"
  );
  redStop1.setAttribute("offset", "0%");
  redStop1.setAttribute("stop-color", "#FF6B00");
  const redStop2 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "stop"
  );
  redStop2.setAttribute("offset", "50%");
  redStop2.setAttribute("stop-color", "#FF4500");
  const redStop3 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "stop"
  );
  redStop3.setAttribute("offset", "100%");
  redStop3.setAttribute("stop-color", "#FF0000");

  redGradient.appendChild(redStop1);
  redGradient.appendChild(redStop2);
  redGradient.appendChild(redStop3);

  defs.appendChild(goldGradient);
  defs.appendChild(yellowOrangeGradient);
  defs.appendChild(orangeGradient);
  defs.appendChild(redGradient);
  svg.appendChild(defs);
  document.body.appendChild(svg);

  // Wait a bit to ensure gradients are fully loaded
  setTimeout(() => {
    console.log("✅ SVG gradients loaded and ready");
  }, 50);
}

// Function to create rating UI element (SIMPLIFIED - single version only)
function createRatingElement(professor, options = { animate: false }) {
  const ratingContainer = document.createElement("a");
  ratingContainer.href = professor.link;
  ratingContainer.target = "_blank";
  ratingContainer.className = "polyratings-rating-element";
  ratingContainer.style.cssText = `
        display: inline-flex; 
        align-items: center; 
        text-decoration: none;
        padding: 3px 8px; 
        border: 1px solid #7F8A9E; 
        border-radius: 12px;
        font-size: 12px; 
        color: #090d19; 
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        cursor: pointer;
        ${options.animate ? "transform: translateY(8px) scale(0.95);" : ""}
        ${options.animate ? "opacity: 0;" : "opacity: 1;"}
        white-space: nowrap; 
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        margin-left: 0px;
        max-width: calc(100% - 4px);
        overflow: hidden;
        width: fit-content;
    `;
  ratingContainer.title = `View ${professor.name}'s profile on PolyRatings`;

  ratingContainer.addEventListener("click", (e) => e.stopPropagation());
  ratingContainer.addEventListener("mouseenter", () => {
    ratingContainer.style.background = "rgba(21, 71, 52, 0.12)";
    ratingContainer.style.borderColor = "#154734";
  });
  ratingContainer.addEventListener("mouseleave", () => {
    ratingContainer.style.background = "rgba(255, 255, 255, 0.9)";
    ratingContainer.style.borderColor = "#7F8A9E";
  });

  // Add hover tooltip functionality
  addHoverTooltip(ratingContainer, professor);

  const ratingText = document.createElement("span");
  // If rating is 0, show "Add Prof" instead of "0/4"
  if (professor.rating === 0) {
    ratingText.textContent = "Add Prof";
  } else {
    ratingText.textContent = `${professor.rating}/4`;
  }
  ratingText.style.marginRight = "3px";

  // Create star rating based on professor rating (simplified version)
  const stars = document.createElement("span");
  stars.className = "star-rating";
  stars.style.display = "inline-flex";
  stars.style.gap = "1px";

  // Simple star calculation - just show one representative star
  const rating = parseFloat(professor.rating);

  let starsHtml = "";

  // Only show star if rating is greater than 0
  if (professor.rating > 0) {
    // Ensure SVG gradients are available
    ensureSVGGradients();

    // Get the appropriate gradient class for this rating
    const ratingClass = getRatingClass(professor.rating);

    // Create star with gradient class and add retry mechanism
    starsHtml += `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" stroke-width="2" class="${ratingClass}"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;
  }

  stars.innerHTML = starsHtml;

  // Add retry mechanism for star rendering
  if (professor.rating > 0) {
    // Check if star rendered properly after a short delay
    setTimeout(() => {
      const svgElement = stars.querySelector("svg");
      if (!svgElement || !svgElement.querySelector("path")) {
        console.log(`🔄 Retrying star render for ${professor.name}`);
        // Re-render the star
        const ratingClass = getRatingClass(professor.rating);
        stars.innerHTML = `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" stroke-width="2" class="${ratingClass}"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;
      }
    }, 100);

    // Additional check after longer delay
    setTimeout(() => {
      const svgElement = stars.querySelector("svg");
      if (!svgElement || !svgElement.querySelector("path")) {
        console.log(`🔄 Second retry for star render for ${professor.name}`);
        // Force re-render with fallback styling
        const ratingClass = getRatingClass(professor.rating);
        stars.innerHTML = `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" stroke-width="2" class="${ratingClass}"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;
      }
    }, 500);

    // Final fallback with solid colors if gradients still don't work
    setTimeout(() => {
      const svgElement = stars.querySelector("svg");
      if (!svgElement || !svgElement.querySelector("path")) {
        console.log(`🔄 Final fallback for star render for ${professor.name}`);
        // Use solid color fallback
        const rating = parseFloat(professor.rating);
        let fallbackColor = "#FFD700"; // Gold default
        if (rating >= 3.0) fallbackColor = "#FFD700";
        else if (rating >= 2.0) fallbackColor = "#FFA500";
        else if (rating >= 1.0) fallbackColor = "#FF8C00";
        else fallbackColor = "#FF6B00";

        stars.innerHTML = `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" stroke-width="2" fill="${fallbackColor}" stroke="#B8860B"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;
      }
    }, 1000);
  }

  ratingContainer.appendChild(ratingText);
  ratingContainer.appendChild(stars);

  // Add fade-in animation only on first-time injection
  if (options.animate) {
    ratingContainer.classList.add("fade-in");
  }

  return ratingContainer;
}

// Function to add hover tooltip functionality
function addHoverTooltip(element, professor) {
  // Shared tooltip state to prevent duplicates and stickiness
  if (!window.PRTooltipState) {
    window.PRTooltipState = {
      owner: null,
      showTimeout: null,
      hideTimeout: null,
    };
    // Hide on any document scroll to avoid sticky tooltips
    const hideOnScroll = () => hideProfessorTooltip(null, true);
    document.addEventListener("scroll", hideOnScroll, { capture: true });
    window.addEventListener("blur", () => hideProfessorTooltip(null, true));
  }

  element.addEventListener("mouseenter", () => {
    // Clear pending hides and shows
    if (window.PRTooltipState.hideTimeout) {
      clearTimeout(window.PRTooltipState.hideTimeout);
      window.PRTooltipState.hideTimeout = null;
    }
    if (window.PRTooltipState.showTimeout) {
      clearTimeout(window.PRTooltipState.showTimeout);
      window.PRTooltipState.showTimeout = null;
    }

    // If another owner has a tooltip, hide it immediately
    if (
      window.PRTooltipState.owner &&
      window.PRTooltipState.owner !== element
    ) {
      hideProfessorTooltip(window.PRTooltipState.owner, true);
    }

    window.PRTooltipState.owner = element;

    // Show after a short delay to avoid accidental hovers
    window.PRTooltipState.showTimeout = setTimeout(() => {
      showProfessorTooltip(element, professor);
      window.PRTooltipState.showTimeout = null;
    }, 300);
  });

  element.addEventListener("mouseleave", () => {
    // Cancel a pending show if we left early
    if (window.PRTooltipState.showTimeout) {
      clearTimeout(window.PRTooltipState.showTimeout);
      window.PRTooltipState.showTimeout = null;
    }

    // Hide with a tiny delay to allow moving into tooltip, but ensure cleanup
    window.PRTooltipState.hideTimeout = setTimeout(() => {
      hideProfessorTooltip(element, false);
      window.PRTooltipState.hideTimeout = null;
    }, 50);
  });
}

// Function to show professor tooltip
function showProfessorTooltip(element, professor) {
  // Remove any existing tooltip
  hideProfessorTooltip();

  // Create tooltip element
  const tooltip = document.createElement("div");
  tooltip.className = "professor-tooltip";
  tooltip.style.cssText = `
    position: absolute;
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    font-size: 14px;
    font-weight: 500;
    max-width: 300px;
    z-index: 10000;
    opacity: 0;
    transform: scale(0.8) translateY(10px);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none;
    border: 2px solid rgba(255, 255, 255, 0.3);
  `;
  tooltip.setAttribute("data-polyratings", "true");

  // Get professor data and AI analysis for tooltip
  chrome.runtime.sendMessage(
    { type: "getGeminiTooltipAnalysis", profName: professor.name },
    (response) => {
      if (response.status === "success" && response.professor) {
        const prof = response.professor;
        const analysis = response.analysis;

        tooltip.innerHTML = `
          <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">
            ${prof.name}
          </div>
          <div style="margin-bottom: 8px;">
            <span style="background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 6px; font-size: 12px;">
              ⭐ ${prof.rating}/4.0
            </span>
          </div>
          <div style="line-height: 1.4; font-size: 13px;">
            ${analysis}
          </div>
        `;
      } else if (response.status === "ai_analysis") {
        // Professor not found but got AI analysis
        const analysis = response.analysis;

        tooltip.innerHTML = `
          <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">
            ${professor.name}
          </div>
          <div style="margin-bottom: 8px;">
            <span style="background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 6px; font-size: 12px;">
              📝 Not Rated
            </span>
          </div>
          <div style="line-height: 1.4; font-size: 13px;">
            ${analysis}
          </div>
        `;
      } else {
        // Error case - fallback to simple message
        tooltip.innerHTML = `
          <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">
            ${professor.name}
          </div>
          <div style="margin-bottom: 8px;">
            <span style="background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 6px; font-size: 12px;">
              📝 Not Rated
            </span>
          </div>
          <div style="line-height: 1.4; font-size: 13px; color: #666;">
            This professor hasn't been rated yet. Click to add them to PolyRatings!
          </div>
        `;
      }

      // Position tooltip
      positionTooltip(tooltip, element);

      // Add to document
      document.body.appendChild(tooltip);

      // Animate in
      setTimeout(() => {
        tooltip.style.opacity = "1";
        tooltip.style.transform = "scale(1) translateY(0)";
      }, 10);
    }
  );
}

// Function to position tooltip
function positionTooltip(tooltip, element) {
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  // Position above the element by default
  let top = rect.top - tooltipRect.height - 10;
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

  // Adjust if tooltip would go off screen
  if (left < 10) {
    left = 10;
  } else if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }

  if (top < 10) {
    // Position below if no room above
    top = rect.bottom + 10;
  }

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

// Function to hide professor tooltip
function hideProfessorTooltip(owner = null, immediate = false) {
  const existingTooltip = document.querySelector(".professor-tooltip");
  if (existingTooltip) {
    // Only hide if called by current owner, or no owner specified
    if (!owner || window.PRTooltipState?.owner === owner) {
      const removeNow = () => {
        if (existingTooltip && existingTooltip.parentNode) {
          existingTooltip.parentNode.removeChild(existingTooltip);
        }
        if (
          window.PRTooltipState &&
          (!owner || window.PRTooltipState.owner === owner)
        ) {
          window.PRTooltipState.owner = null;
        }
      };
      if (immediate) {
        removeNow();
      } else {
        existingTooltip.style.opacity = "0";
        existingTooltip.style.transform = "scale(0.8) translateY(10px)";
        setTimeout(removeNow, 200);
      }
    }
  }
}

// Function to create "not found" badge
function createNotFoundBadge(professorName) {
  const notFoundContainer = document.createElement("span");
  notFoundContainer.style.cssText = `
        display: inline-flex;
        align-items: center;
        padding: 3px 8px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #7F8A9E;
        border-radius: 12px;
        font-size: 12px;
        color: #090d19;
        text-decoration: none;
        transition: all 0.2s ease;
        cursor: pointer;
        white-space: nowrap;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        margin-left: 0px;
        max-width: calc(100% - 4px);
        overflow: hidden;
        width: fit-content;
        margin-top: 4px;
    `;

  // Create simple text that will shrink with ellipses
  const notFoundText = document.createElement("span");
  notFoundText.textContent = "Add Prof";
  notFoundText.style.cssText = `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  `;

  notFoundContainer.appendChild(notFoundText);

  // Add hover effects
  notFoundContainer.addEventListener("mouseenter", () => {
    notFoundContainer.style.background = "rgba(21, 71, 52, 0.12)";
    notFoundContainer.style.borderColor = "#154734";
  });

  notFoundContainer.addEventListener("mouseleave", () => {
    notFoundContainer.style.background = "rgba(255, 255, 255, 0.9)";
    notFoundContainer.style.borderColor = "#7F8A9E";
  });

  // Add click handler to open the add professor page
  notFoundContainer.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const encodedName = encodeURIComponent(professorName);
    window.open(
      `https://polyratings.dev/new-professor?name=${encodedName}`,
      "_blank"
    );
  });

  notFoundContainer.title = `Add ${professorName} to PolyRatings`;

  // Add hover tooltip functionality for not found professors
  addHoverTooltip(notFoundContainer, { name: professorName, rating: 0 });

  // Smooth entrance animation
  setTimeout(() => {
    notFoundContainer.style.transform = "translateY(0) scale(1)";
    notFoundContainer.style.opacity = "1";
  }, 10);

  return notFoundContainer;
}

// Function to inject rating UI next to professor name (mobile approach)
function injectRatingUI(professorElement, professor, profIndex = 0) {
  const professorName = professor.name;

  // First, remove any existing rating elements for this professor at this index to prevent duplicates
  const existingRatings = professorElement.querySelectorAll(
    `[data-professor="${professorName}"][data-index="${profIndex}"]`
  );
  existingRatings.forEach((rating) => rating.remove());

  console.log(
    `🎨 Injecting mobile rating UI for: ${professorName} at index ${profIndex}`
  );

  // Create the rating element
  const ratingElement = createRatingElement(professor, { animate: true });
  ratingElement.setAttribute("data-professor", professorName);
  ratingElement.setAttribute("data-index", profIndex.toString());
  ratingElement.setAttribute("data-polyratings", "true"); // Mark as PolyRatings element
  ratingElement.setAttribute("data-pr-initialized", "true");

  // Add extra margin for multiple professors (except the first one)
  if (profIndex > 0) {
    ratingElement.style.marginLeft = "12px";
  }

  // Add a small line break and spacing before the rating
  const lineBreak = document.createElement("br");
  lineBreak.setAttribute("data-polyratings", "true");
  professorElement.appendChild(lineBreak);

  // Insert the rating element with proper spacing
  professorElement.appendChild(ratingElement);

  // Smooth entrance animation
  setTimeout(() => {
    ratingElement.style.transform = "translateY(0) scale(1)";
    ratingElement.style.opacity = "1";
  }, 10);

  // Observe the professor element for removals and re-inject without animation
  const localObserver = new MutationObserver(() => {
    const exists = professorElement.querySelector(
      `[data-professor="${CSS.escape(
        professorName
      )}"][data-index="${profIndex}"]`
    );
    if (!exists) {
      // Debounce reinjection to play nicer with virtualization at the bottom
      setTimeout(() => {
        const existsNow = professorElement.querySelector(
          `[data-professor="${CSS.escape(
            professorName
          )}"][data-index="${profIndex}"]`
        );
        if (existsNow) return;
        if (!isElementMostlyVisible(professorElement)) return;
        console.log(
          `🔄 Rating element removed for ${professorName}, re-injecting (debounced)...`
        );
        const reInjected = createRatingElement(professor, { animate: false });
        reInjected.setAttribute("data-professor", professorName);
        reInjected.setAttribute("data-index", profIndex.toString());
        reInjected.setAttribute("data-polyratings", "true");
        reInjected.setAttribute("data-pr-initialized", "true");
        const br = document.createElement("br");
        br.setAttribute("data-polyratings", "true");
        professorElement.appendChild(br);
        professorElement.appendChild(reInjected);
      }, 200);
    }
  });
  try {
    localObserver.observe(professorElement, { childList: true });
    // Stop observing after 30s to avoid long-lived observers
    setTimeout(() => localObserver.disconnect(), 30000);
  } catch (_) {}

  console.log(
    `✅ Successfully injected mobile rating UI for: ${professorName} at index ${profIndex}`
  );
}

function injectDesktopRatingUI(professorNameElement, professor) {
  const professorName = professor.name;

  // First, remove any existing rating elements to prevent duplicates
  const existingRatings = professorNameElement.querySelectorAll(
    ".polyratings-rating, .polyratings-rating-element, .pr-rating-container"
  );
  existingRatings.forEach((rating) => rating.remove());

  // Also clean up any text content that might have been corrupted
  const textNodes = professorNameElement.childNodes;
  for (let i = textNodes.length - 1; i >= 0; i--) {
    const node = textNodes[i];
    if (
      node.nodeType === Node.TEXT_NODE &&
      node.textContent.includes("Add to PolyRatings")
    ) {
      node.remove();
    }
  }

  prInjectStyles();

  const ratingEl = createRatingElement(professor, { animate: true });

  // Simple vertical layout - just add professor name and rating
  const originalText = professorNameElement.textContent.trim();

  // Create a simple container for name and rating
  const container = document.createElement("div");
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: flex-start;
    gap: 2px;
  `;

  // Professor name
  const nameSpan = document.createElement("div");
  nameSpan.textContent = originalText;
  nameSpan.style.cssText = `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    line-height: 1.2;
  `;

  // Rating container
  const ratingContainer = document.createElement("div");
  ratingContainer.style.cssText = `
    width: 100%;
    overflow: hidden;
  `;
  ratingContainer.appendChild(ratingEl);

  container.appendChild(nameSpan);
  container.appendChild(ratingContainer);

  // Replace the content
  professorNameElement.innerHTML = "";
  professorNameElement.appendChild(container);

  // Add hover tooltip to the professor name element
  addHoverTooltip(professorNameElement, professor);

  // Mark the container as PolyRatings element
  container.setAttribute("data-polyratings", "true");

  // Smooth entrance animation
  setTimeout(() => {
    ratingEl.style.transform = "translateY(0) scale(1)";
    ratingEl.style.opacity = "1";
  }, 10);

  // Observe the host element to re-inject if it is replaced/cleared
  const desktopObserver = new MutationObserver(() => {
    if (!document.contains(container)) {
      // Debounce and check visibility before re-injecting
      setTimeout(() => {
        if (document.contains(container)) return;
        if (!isElementMostlyVisible(professorNameElement)) return;
        console.log(
          `🔄 Desktop rating container removed for ${professorName}, re-injecting (debounced)...`
        );
        desktopObserver.disconnect();
        injectDesktopRatingUI(professorNameElement, professor);
      }, 200);
    }
  });
  try {
    desktopObserver.observe(professorNameElement, { childList: true });
    setTimeout(() => desktopObserver.disconnect(), 30000);
  } catch (_) {}

  console.log(
    `✅ Successfully injected desktop rating UI for: ${professorName}`
  );
}

function injectDesktopNotFoundUI(professorNameElement, professorName) {
  // First, remove any existing rating elements to prevent duplicates
  const existingRatings = professorNameElement.querySelectorAll(
    ".polyratings-rating, .polyratings-rating-element, .pr-rating-container"
  );
  existingRatings.forEach((rating) => rating.remove());

  // Also clean up any text content that might have been corrupted
  const textNodes = professorNameElement.childNodes;
  for (let i = textNodes.length - 1; i >= 0; i--) {
    const node = textNodes[i];
    if (
      node.nodeType === Node.TEXT_NODE &&
      node.textContent.includes("Add to PolyRatings")
    ) {
      node.remove();
    }
  }

  prInjectStyles();

  const notFoundEl = createNotFoundBadge(professorName);

  // Simple vertical layout - just add professor name and badge
  const originalText = professorNameElement.textContent.trim();

  // Create a simple container for name and badge
  const container = document.createElement("div");
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: flex-start;
    gap: 2px;
  `;

  // Professor name
  const nameSpan = document.createElement("div");
  nameSpan.textContent = originalText;
  nameSpan.style.cssText = `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    line-height: 1.2;
  `;

  // Badge container
  const badgeContainer = document.createElement("div");
  badgeContainer.style.cssText = `
    width: 100%;
    overflow: hidden;
  `;
  badgeContainer.appendChild(notFoundEl);

  container.appendChild(nameSpan);
  container.appendChild(badgeContainer);

  // Replace the content
  professorNameElement.innerHTML = "";
  professorNameElement.appendChild(container);

  // Add hover tooltip to the professor name element
  addHoverTooltip(professorNameElement, { name: professorName, rating: 0 });

  // Mark the container as PolyRatings element
  container.setAttribute("data-polyratings", "true");

  // Add periodic check to re-inject if element disappears
  const checkInterval = setInterval(() => {
    if (!document.contains(container)) {
      console.log(
        `🔄 Desktop not found container disappeared for ${professorName}, re-injecting...`
      );
      clearInterval(checkInterval);
      // Re-inject the not found UI
      setTimeout(() => {
        injectDesktopNotFoundUI(professorNameElement, professorName);
      }, 100);
    }
  }, 1000);

  // Stop checking after 30 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 30000);

  console.log(
    `✅ Successfully injected desktop not found UI for: ${professorName}`
  );
}

// Function to get a unique path for a DOM element
function getElementPath(element) {
  const path = [];
  let current = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className) {
      const classes = Array.from(current.classList).join(".");
      selector += `.${classes}`;
    }

    // Add position among siblings
    const siblings = Array.from(current.parentNode.children);
    const index = siblings.indexOf(current);
    selector += `:nth-child(${index + 1})`;

    path.unshift(selector);
    current = current.parentNode;
  }

  return path.join(" > ");
}

// Core function to find and process professors (IMPROVED to handle duplicates better)
function findAndLogProfessors() {
  console.log("🔍 Starting professor search in iframe...");

  // Check if we're processing too frequently
  if (window.processingProfessors) {
    console.log("⏭️ Already processing professors, skipping...");
    return;
  }

  window.processingProfessors = true;

  // Set a timeout to reset the processing flag
  setTimeout(() => {
    window.processingProfessors = false;
  }, 50); // Even faster timeout for better responsiveness

  console.log("🚀 Processing professors for current page...");

  // Don't aggressively clear ratings - let individual functions handle duplicates
  console.log("🧹 Letting individual functions handle duplicate prevention");

  // Batch process professors for better performance (debounced render)
  const mobileBatch = [];
  let mobileBatchTimeout;

  // Also clean up any corrupted text content in instructor elements
  const instructorElements = document.querySelectorAll('[role="cell"]');
  instructorElements.forEach((element) => {
    const textNodes = element.childNodes;
    for (let i = textNodes.length - 1; i >= 0; i--) {
      const node = textNodes[i];
      if (
        node.nodeType === Node.TEXT_NODE &&
        node.textContent.includes("Add to PolyRatings")
      ) {
        node.remove();
      }
    }
  });

  // Step 1: Try mobile approach first
  const dtElements = document.querySelectorAll("dt");
  console.log(`📋 Found ${dtElements.length} dt elements in iframe`);

  let professorCount = 0;
  let mobileApproachFound = false;

  dtElements.forEach((dt, index) => {
    const dtText = dt.textContent.trim();
    console.log(`📝 dt[${index}]: "${dtText}"`);

    if (dtText === "Instructor:") {
      console.log(`✅ Found "Instructor:" at index ${index}`);
      mobileApproachFound = true;

      const nextElement = dt.nextElementSibling;
      if (nextElement) {
        const instructorText = nextElement.textContent.trim();
        console.log(`👨‍🏫 Found Instructor text: ${instructorText}`);

        // Split by comma to handle multiple instructors
        const professorNames = instructorText
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name.length > 0);
        console.log(`📋 Parsed professor names:`, professorNames);

        // Collect each professor into a batch for parallel fetch and single render
        professorNames.forEach((professorName, profIndex) => {
          console.log(
            `👨‍🏫 Processing professor ${profIndex + 1}: ${professorName}`
          );

          // Create a unique identifier for this professor in this specific element
          const elementId = getElementPath(nextElement);
          const professorKey = `${professorName}-${elementId}-${profIndex}`;

          // Check if this specific professor already has a rating in this specific element
          const existingProfRating = nextElement.querySelector(
            `[data-professor="${professorName}"][data-index="${profIndex}"]`
          );

          if (existingProfRating) {
            console.log(
              `⏭️ Professor ${professorName} already has rating in this element at index ${profIndex}, skipping`
            );
            return;
          }

          // Check if professor was already processed (prevent re-processing)
          if (isProfessorProcessed(professorName, elementId)) {
            console.log(
              `⏭️ Professor ${professorName} already processed for element ${elementId}, skipping`
            );
            return;
          }

          // Add lightweight skeleton marker (single for the block)
          mobileBatch.push({
            element: nextElement,
            professorName,
            profIndex,
            elementId,
            promise: prMessage("getProfRating", { profName: professorName }),
          });

          professorCount++;
        });
      } else {
        console.log(
          `❌ No next element found for instructor at index ${index}`
        );
      }
    }
  });

  // Render mobile batch after a short debounce window to avoid flicker
  if (mobileBatch.length > 0) {
    // Add a single skeleton per container to reduce layout thrash
    const containerToSkeleton = new Map();
    for (const item of mobileBatch) {
      if (!containerToSkeleton.has(item.element)) {
        const sk = createLoadingSkeleton();
        sk.setAttribute("data-polyratings", "true");
        item.element.appendChild(sk);
        containerToSkeleton.set(item.element, sk);
      }
    }

    clearTimeout(mobileBatchTimeout);
    mobileBatchTimeout = setTimeout(async () => {
      try {
        const results = await Promise.all(
          mobileBatch.map((b) => b.promise.then((res) => ({ res, b })))
        );
        // Remove skeletons in one pass
        for (const sk of containerToSkeleton.values()) {
          if (sk && sk.parentNode) sk.parentNode.removeChild(sk);
        }

        // Inject results in a single pass per batch (only when visible/stable)
        for (const { res, b } of results) {
          const { element, professorName, profIndex, elementId } = b;
          if (!element || !document.contains(element)) continue;

          scheduleStableRender(element, () => {
            // Skip if element already has our node
            const exists = element.querySelector(
              `[data-professor="${CSS.escape(
                professorName
              )}"][data-index="${profIndex}"]`
            );
            if (exists) return;

            if (res.status === "success" && res.professor) {
              injectRatingUI(element, res.professor, profIndex);
              markProfessorProcessed(professorName, elementId);
            } else if (res.status === "not_found") {
              const notFoundBadge = createNotFoundBadge(professorName);
              notFoundBadge.className = "polyratings-rating-element";
              notFoundBadge.setAttribute("data-professor", professorName);
              notFoundBadge.setAttribute("data-index", profIndex.toString());
              const br = document.createElement("br");
              br.setAttribute("data-polyratings", "true");
              element.appendChild(br);
              element.appendChild(notFoundBadge);
              if (profIndex > 0) notFoundBadge.style.marginLeft = "12px";
              markProfessorProcessed(professorName, elementId);
            } else {
              // Silent fail; do not thrash DOM
            }
          });
        }
      } catch (_) {
        // On error, remove any skeletons to avoid stickiness
        for (const sk of containerToSkeleton.values()) {
          if (sk && sk.parentNode) sk.parentNode.removeChild(sk);
        }
      }
    }, 500);
  }

  // Step 2: Only try desktop approach if mobile approach didn't find anything
  if (!mobileApproachFound) {
    console.log(
      "📱 Mobile approach found no professors, trying desktop approach..."
    );

    // Find the outermost grid container
    const mainGridContainers = document.querySelectorAll(
      ".cx-MuiGrid-container.cx-MuiGrid-wrap-xs-nowrap"
    );
    console.log(`🖥️ Found ${mainGridContainers.length} main grid containers`);

    if (mainGridContainers.length > 0) {
      console.log(
        "✅ Successfully found main grid container(s) for desktop approach"
      );

      // Log details about each container for debugging
      mainGridContainers.forEach((container, index) => {
        console.log(`📦 Grid container ${index + 1}:`, {
          className: container.className,
          childCount: container.children.length,
          textContent: container.textContent.substring(0, 100) + "...",
        });

        // Step 2b: Find the professor name grid item within this container
        const detailsGridItems = container.querySelectorAll(
          ".cx-MuiGrid-grid-xs-5"
        );
        console.log(
          `🔍 Found ${
            detailsGridItems.length
          } details grid items (cx-MuiGrid-grid-xs-5) in container ${index + 1}`
        );

        if (detailsGridItems.length > 0) {
          console.log(
            "✅ Successfully found details grid item(s) for professor extraction"
          );

          // Log details about each details grid item
          detailsGridItems.forEach((detailsItem, detailsIndex) => {
            console.log(`📋 Details grid item ${detailsIndex + 1}:`, {
              className: detailsItem.className,
              childCount: detailsItem.children.length,
              textContent: detailsItem.textContent.substring(0, 100) + "...",
            });

            // Step 2c: Navigate to professor name cell within this details grid item
            const professorNameCells = detailsItem.querySelectorAll(
              ".cx-MuiGrid-grid-xs-4"
            );
            console.log(
              `🔍 Found ${
                professorNameCells.length
              } grid-xs-4 cells in details item ${detailsIndex + 1}`
            );

            if (professorNameCells.length > 0) {
              console.log("✅ Successfully found professor name cells");

              // Step 2d: Extract professor name from the first cell
              const firstCell = professorNameCells[0];
              const professorNameElement = firstCell.querySelector(
                ".cx-MuiTypography-body2"
              );

              if (professorNameElement) {
                const professorName = professorNameElement.textContent.trim();
                console.log(`👨‍🏫 Extracted professor name: "${professorName}"`);

                // Validate the extracted name
                if (professorName && professorName.length > 0) {
                  console.log("✅ Professor name validation passed");

                  // Create a unique identifier for this professor in this specific element
                  const elementId = getElementPath(professorNameElement);

                  // Check if this professor already has a rating in this specific element
                  const existingRating = professorNameElement.querySelector(
                    ".polyratings-rating-element, .pr-rating-container"
                  );

                  if (existingRating) {
                    console.log(
                      `⏭️ Professor ${professorName} already has rating in this element, skipping`
                    );
                    return;
                  }

                  // Process the professor for rating lookup (desktop approach)
                  console.log(
                    `👨‍🏫 Processing desktop professor: ${professorName}`
                  );

                  // Send message to background script to get professor rating
                  chrome.runtime.sendMessage(
                    { type: "getProfRating", profName: professorName },
                    (response) => {
                      console.log(
                        "📨 Desktop response from background script:",
                        response
                      );

                      if (response.status === "success" && response.professor) {
                        console.log(
                          "✅ Received desktop professor data:",
                          response.professor
                        );
                        // Inject rating UI for desktop
                        injectDesktopRatingUI(
                          professorNameElement,
                          response.professor
                        );
                      } else if (response.status === "not_found") {
                        console.log(
                          "❌ Desktop professor not found in database"
                        );
                        // Inject "not found" badge for desktop
                        injectDesktopNotFoundUI(
                          professorNameElement,
                          professorName
                        );
                      } else {
                        console.log(
                          "❌ Error getting desktop professor data:",
                          response.message
                        );
                      }
                    }
                  );
                } else {
                  console.log("❌ Professor name is empty or invalid");
                }
              } else {
                console.log(
                  "❌ No .cx-MuiTypography-body2 element found in first cell"
                );
              }
            } else {
              console.log("❌ No professor name cells found in details item");
            }
          });
        } else {
          console.log("❌ No details grid items found in container");
        }
      });
    } else {
      console.log("❌ No main grid containers found for desktop approach");
    }
  } else {
    console.log(
      "📱 Mobile approach successful, skipping desktop approach to prevent duplicates"
    );
  }

  console.log(
    `🎯 Professor search complete. Found ${professorCount} professors.`
  );

  // Reset processing flag
  window.processingProfessors = false;

  // Also try to inject the Ask Agent button
  injectAskAgentButton();
}

// Function to open the agent popup
function openAgentPopup(button) {
  console.log("🤖 Opening agent popup...");

  // Change button to "Active Agent" state
  button.textContent = "Active Agent";
  button.style.background = "linear-gradient(135deg, #4CAF50, #45a049)";
  button.style.color = "#fff";

  // Create popup container
  const popup = document.createElement("div");
  popup.className = "agent-popup";
  popup.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  `;

  // Create chat container
  const chatContainer = document.createElement("div");
  chatContainer.style.cssText = `
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    width: 400px;
    max-width: 90vw;
    height: 500px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    animation: slideUp 0.4s ease-out;
  `;

  // Create header
  const header = document.createElement("div");
  header.style.cssText = `
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000;
    padding: 16px 20px;
    font-weight: 600;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  header.innerHTML = `
    <span>🤖 PolyRatings Agent</span>
    <button class="close-agent-btn" style="
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #000;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">×</button>
  `;

  // Create chat messages area
  const messagesArea = document.createElement("div");
  messagesArea.className = "agent-messages";
  messagesArea.style.cssText = `
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    background: #f8f9fa;
  `;

  // Add welcome message
  const welcomeMessage = document.createElement("div");
  welcomeMessage.style.cssText = `
    background: white;
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-left: 4px solid #FFD700;
  `;
  welcomeMessage.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px; color: #333;">👋 Hi! I'm your PolyRatings Agent</div>
    <div style="color: #666; font-size: 14px; line-height: 1.4;">
      I can help you analyze professor ratings, compare courses, and answer questions about your schedule. 
      <br><br>
      <strong>🎓 I'll be able to select courses for you super soon!</strong> Stay tuned for this exciting feature!
    </div>
  `;
  messagesArea.appendChild(welcomeMessage);

  // Create input area
  const inputArea = document.createElement("div");
  inputArea.style.cssText = `
    padding: 16px 20px;
    background: white;
    border-top: 1px solid #e0e0e0;
    display: flex;
    gap: 12px;
  `;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ask me anything about professors or courses...";
  input.style.cssText = `
    flex: 1;
    padding: 12px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 24px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  `;

  const sendBtn = document.createElement("button");
  sendBtn.textContent = "Send";
  sendBtn.style.cssText = `
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000;
    border: none;
    border-radius: 24px;
    padding: 12px 20px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  `;

  // Add event listeners
  const closeBtn = header.querySelector(".close-agent-btn");
  closeBtn.addEventListener("click", closeAgentPopup);

  sendBtn.addEventListener("click", () => {
    const message = input.value.trim();
    if (message) {
      addUserMessage(messagesArea, message);
      input.value = "";

      // Show typing indicator
      const typingId = addTypingMessage(messagesArea);

      // Send message to background script
      chrome.runtime.sendMessage(
        { type: "chatbotQuery", query: message },
        (response) => {
          // Remove typing indicator
          const typingElement = document.getElementById(typingId);
          if (typingElement) {
            typingElement.remove();
          }

          if (response && response.status === "success") {
            // Professor found with analysis
            addBotMessage(messagesArea, response.professor.analysis);
          } else if (response && response.status === "ai_analysis") {
            // Professor not found but got AI analysis
            addBotMessage(messagesArea, response.professor.analysis);
          } else if (response && response.status === "general_response") {
            // General response
            addBotMessage(messagesArea, response.message);
          } else {
            // Error case
            addBotMessage(
              messagesArea,
              "❌ Sorry, I couldn't process your request. Please try again."
            );
          }
        }
      );
    }
  });

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendBtn.click();
    }
  });

  // Assemble popup
  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);

  chatContainer.appendChild(header);
  chatContainer.appendChild(messagesArea);
  chatContainer.appendChild(inputArea);
  popup.appendChild(chatContainer);

  // Add to document
  document.body.appendChild(popup);

  // Focus input
  setTimeout(() => input.focus(), 100);

  // Add CSS animations
  if (!document.querySelector("#agent-popup-styles")) {
    const style = document.createElement("style");
    style.id = "agent-popup-styles";
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from { 
          opacity: 0;
          transform: translateY(30px) scale(0.95);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .agent-popup input:focus {
        border-color: #FFD700 !important;
      }
      
      .agent-popup button:hover {
        transform: translateY(-1px);
      }
      
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideInLeft {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Function to close the agent popup
function closeAgentPopup() {
  console.log("🤖 Closing agent popup...");

  const popup = document.querySelector(".agent-popup");
  if (popup) {
    popup.remove();
  }

  // Reset button to original state
  const button = document.querySelector(".ask-agent-button");
  if (button) {
    button.textContent = "Ask Agent";
    button.style.background = "linear-gradient(135deg, #FFD700, #FFA500)";
    button.style.color = "#000";
  }
}

// Function to add user message
function addUserMessage(container, message) {
  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000;
    padding: 12px 16px;
    border-radius: 18px 18px 4px 18px;
    margin-bottom: 12px;
    margin-left: 40px;
    font-size: 14px;
    word-wrap: break-word;
    animation: slideInRight 0.3s ease-out;
  `;
  messageDiv.textContent = message;
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

// Function to convert links in text to clickable HTML
function convertLinksToHTML(text) {
  // Return early if no text
  if (!text || typeof text !== "string") {
    return text;
  }

  // First escape any existing HTML to prevent XSS
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  // Convert URLs to clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return escapedText.replace(urlRegex, (url) => {
    // Create a more user-friendly display text
    let displayText = url;
    if (url.includes("polyratings.dev/professor/")) {
      displayText = "View full profile →";
    } else if (url.includes("polyratings.dev/new-professor")) {
      displayText = "Add to PolyRatings →";
    } else if (url.length > 50) {
      displayText = url.substring(0, 47) + "...";
    }

    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="
      color: #1976d2; 
      text-decoration: none; 
      font-weight: 600; 
      background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid #1976d2;
      display: inline-block;
      margin: 2px 0;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(25, 118, 210, 0.2);
    " onmouseover="this.style.background='linear-gradient(135deg, #1976d2, #7b1fa2); this.style.color='white'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 6px rgba(25, 118, 210, 0.4)';" onmouseout="this.style.background='linear-gradient(135deg, #e3f2fd, #f3e5f5)'; this.style.color='#1976d2'; this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(25, 118, 210, 0.2)';">
      ${displayText}
    </a>`;
  });
}

// Function to add bot message
function addBotMessage(container, message) {
  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `
    background: white;
    color: #333;
    padding: 12px 16px;
    border-radius: 18px 18px 18px 4px;
    margin-bottom: 12px;
    margin-right: 40px;
    font-size: 14px;
    word-wrap: break-word;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    animation: slideInLeft 0.3s ease-out;
    line-height: 1.5;
  `;

  // Convert links to clickable HTML
  messageDiv.innerHTML = convertLinksToHTML(message);
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

// Function to preserve existing ratings and prevent duplicates
function preserveExistingRatings() {
  const existingRatings = document.querySelectorAll(
    ".polyratings-rating-element"
  );
  existingRatings.forEach((rating) => {
    // Add a data attribute to mark as preserved
    rating.setAttribute("data-preserved", "true");
  });
}

// Function to restore preserved ratings if they were accidentally removed
function restorePreservedRatings() {
  // This function can be called if ratings disappear
  console.log("🔄 Checking for missing ratings...");
}

// Function to add typing indicator
function addTypingMessage(container) {
  const typingId = "typing-" + Date.now();
  const messageDiv = document.createElement("div");
  messageDiv.id = typingId;
  messageDiv.style.cssText = `
    background: white;
    color: #666;
    padding: 12px 16px;
    border-radius: 18px 18px 18px 4px;
    margin-bottom: 12px;
    margin-right: 40px;
    font-size: 14px;
    font-style: italic;
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  messageDiv.innerHTML = `
    <span>🤖 Agent is typing</span>
    <div class="typing-dots" style="display: flex; gap: 2px;">
      <div style="width: 4px; height: 4px; background: #666; border-radius: 50%; animation: typing 1.4s infinite ease-in-out;"></div>
      <div style="width: 4px; height: 4px; background: #666; border-radius: 50%; animation: typing 1.4s infinite ease-in-out 0.2s;"></div>
      <div style="width: 4px; height: 4px; background: #666; border-radius: 50%; animation: typing 1.4s infinite ease-in-out 0.4s;"></div>
    </div>
  `;

  // Add CSS animation if not already added
  if (!document.querySelector("#typing-animation-styles")) {
    const style = document.createElement("style");
    style.id = "typing-animation-styles";
    style.textContent = `
      @keyframes typing {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-10px); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
  return typingId;
}

// Function to inject the Ask Agent button
function injectAskAgentButton() {
  console.log("🤖 Looking for Cancel/Ok buttons to add Ask Agent button...");

  // Respect class notes disablement at runtime
  if (shouldDisableForClassNotes(document)) {
    console.log(
      "🛑 Skipping Ask Agent button injection due to class notes keywords"
    );
    return;
  }

  // Only on Cal Poly schedule pages that show Select Sections
  if (!shouldEnableAgent(document)) {
    console.log("⏭️ Skipping Ask Agent button: not on eligible Cal Poly page");
    return;
  }

  // Look for common button patterns in Material-UI
  const buttonSelectors = [
    'button[type="button"]',
    ".MuiButton-root",
    "button",
    '[role="button"]',
  ];

  let foundButtons = [];
  buttonSelectors.forEach((selector) => {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach((button) => {
      const text = button.textContent.trim().toLowerCase();
      if (
        text.includes("cancel") ||
        text.includes("ok") ||
        text.includes("submit")
      ) {
        foundButtons.push(button);
      }
    });
  });

  console.log(`🔍 Found ${foundButtons.length} potential action buttons`);

  if (foundButtons.length > 0) {
    // Find the container that holds these buttons
    const buttonContainer =
      foundButtons[0].closest("div") || foundButtons[0].parentElement;

    if (buttonContainer) {
      // Check if we already added the button
      if (document.querySelector(".ask-agent-button")) {
        console.log("⏭️ Ask Agent button already exists, skipping...");
        return;
      }

      // Create the Ask Agent button
      const askAgentButton = document.createElement("button");
      askAgentButton.className = "ask-agent-button";
      askAgentButton.textContent = "Ask Agent";
      askAgentButton.style.cssText = `
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #000;
        border: none;
        border-radius: 8px;
        padding: 10px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        margin-right: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      `;

      // Add hover effect
      askAgentButton.addEventListener("mouseenter", () => {
        askAgentButton.style.transform = "translateY(-1px)";
        askAgentButton.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
      });

      askAgentButton.addEventListener("mouseleave", () => {
        askAgentButton.style.transform = "translateY(0)";
        askAgentButton.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
      });

      // Add click handler
      askAgentButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🤖 Ask Agent button clicked!");

        // Toggle the popup
        if (document.querySelector(".agent-popup")) {
          closeAgentPopup();
        } else {
          openAgentPopup(askAgentButton);
        }
      });

      // Insert the button before the existing buttons
      buttonContainer.insertBefore(askAgentButton, foundButtons[0]);

      console.log("✅ Ask Agent button injected successfully!");
    }
  } else {
    console.log(
      "❌ Could not find Cancel/Ok buttons to place Ask Agent button"
    );
  }
}

// Function to set up button observer (runs more frequently)
function setupButtonObserver() {
  console.log("🔘 Setting up button observer...");

  if (!shouldEnableAgent(document)) {
    console.log("⏭️ Not an eligible Cal Poly page; button observer disabled");
    return;
  }

  // Try to inject button immediately
  injectAskAgentButton();

  // Set up a more frequent check for buttons
  const buttonCheckInterval = setInterval(() => {
    if (document.querySelector(".ask-agent-button")) {
      console.log("✅ Ask Agent button found, stopping button observer");
      clearInterval(buttonCheckInterval);
    } else {
      injectAskAgentButton();
    }
  }, 500); // Check every 500ms for faster response

  // Stop checking after 30 seconds
  setTimeout(() => {
    clearInterval(buttonCheckInterval);
    console.log("⏰ Button observer timeout reached");
  }, 30000);
}

// Function to set up the MutationObserver
function setupMutationObserver() {
  console.log("👀 Setting up MutationObserver in iframe...");

  // Add debouncing to prevent excessive re-runs
  let debounceTimeout;
  let isProcessing = false;

  const observer = new MutationObserver((mutations) => {
    // Ignore mutations caused by our own injected elements
    const isOurNode = (node) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
      const el = node;
      if (el.getAttribute && el.getAttribute("data-polyratings") === "true")
        return true;
      const cls = el.classList || { contains: () => false };
      if (
        cls.contains("polyratings-rating-element") ||
        cls.contains("professor-tooltip") ||
        cls.contains("ask-agent-button")
      )
        return true;
      if (el.id === "polyratings-gradients" || el.id === "pr-style")
        return true;
      // Check descendants
      return (
        el.querySelector &&
        (el.querySelector('[data-polyratings="true"]') ||
          el.querySelector(".polyratings-rating-element") ||
          el.querySelector(".professor-tooltip") ||
          el.querySelector(".ask-agent-button"))
      );
    };

    const onlyOurChanges = mutations.every((mutation) => {
      const nodes = [
        ...Array.from(mutation.addedNodes || []),
        ...Array.from(mutation.removedNodes || []),
      ];
      return nodes.length > 0 && nodes.every((n) => isOurNode(n));
    });

    if (onlyOurChanges) {
      // Skip processing when only our UI changed
      return;
    }
    // Abort entirely if class notes indicate we should disable now
    if (shouldDisableForClassNotes(document)) {
      console.log(
        "🛑 Disabling PolyRatings due to class notes detected after load; disconnecting observer"
      );
      observer.disconnect();
      return;
    }
    // Skip if we're already processing
    if (isProcessing) {
      console.log("⏭️ Already processing, skipping mutation");
      return;
    }

    console.log(
      `🔄 DOM changed in iframe! ${mutations.length} mutation(s) detected`
    );

    // Check if any of the mutations might contain new content
    const hasRelevantChanges = mutations.some((mutation) => {
      // Check for added nodes
      for (let node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if this node or its children contain dt elements (mobile)
          if (node.querySelectorAll) {
            const dtElements = node.querySelectorAll("dt");
            if (dtElements.length > 0) {
              console.log(
                `🎯 Found ${dtElements.length} dt elements in added node`
              );
              return true;
            }
          }
          // Also check if the node itself is a dt element
          if (node.tagName === "DT") {
            console.log(`🎯 Found dt element directly added`);
            return true;
          }

          // Check for desktop grid containers being added
          if (node.querySelectorAll) {
            const gridContainers = node.querySelectorAll(
              ".cx-MuiGrid-container.cx-MuiGrid-wrap-xs-nowrap"
            );
            if (gridContainers.length > 0) {
              console.log(
                `🎯 Found ${gridContainers.length} desktop grid containers in added node`
              );
              return true;
            }
          }
          // Also check if the node itself is a grid container
          if (
            node.classList &&
            node.classList.contains("cx-MuiGrid-container") &&
            node.classList.contains("cx-MuiGrid-wrap-xs-nowrap")
          ) {
            console.log(`🎯 Found desktop grid container directly added`);
            return true;
          }

          // Check for any professor-related content
          if (node.textContent && node.textContent.includes("Instructor")) {
            console.log(`🎯 Found instructor-related content`);
            return true;
          }
        }
      }

      // Also check for attribute changes that might indicate layout switches
      if (mutation.type === "attributes") {
        const target = mutation.target;
        if (
          target.classList &&
          (target.classList.contains("cx-MuiGrid-container") ||
            target.classList.contains("cx-MuiGrid-wrap-xs-nowrap"))
        ) {
          console.log(`🎯 Found attribute change on grid container`);
          return true;
        }
      }

      return false;
    });

    if (hasRelevantChanges) {
      console.log(
        "🚀 Relevant changes detected in iframe, running professor search..."
      );

      // Clear any existing timeout
      clearTimeout(debounceTimeout);

      // Set processing flag
      isProcessing = true;

      // Add a delay to ensure DOM is fully updated and debounce
      debounceTimeout = setTimeout(() => {
        findAndLogProfessors();
        isProcessing = false;
      }, 25); // Minimal delay for maximum responsiveness
    } else {
      console.log(
        "⏭️ No relevant changes detected in iframe, skipping professor search"
      );
    }
  });

  // Configure and start the observer with more comprehensive options
  const config = {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  };

  console.log("🚀 Starting MutationObserver in iframe with config:", config);
  if (shouldDisableForClassNotes(document)) {
    console.log(
      "🛑 Skipping observer start; class notes keywords present on initial check"
    );
    return;
  }
  observer.observe(document.body, config);
  console.log(
    "✅ MutationObserver is now active in iframe and watching for changes"
  );

  // Run once on initial load
  console.log("🚀 Running initial professor search in iframe...");
  if (!shouldDisableForClassNotes(document)) {
    findAndLogProfessors();
  } else {
    console.log(
      "🛑 Skipping initial professor search due to class notes keywords"
    );
  }
}

// Main execution
console.log("🚀 Starting PolyRatings Enhancer...");

// Respect disable flag based on class notes keywords
if (PR_DISABLE_FOR_NOTES) {
  console.log(
    "🛑 PolyRatings disabled on this page due to class notes keywords (e.g., Additional time / Continuous Enroll)"
  );
} else if (window.top === window) {
  console.log("📄 We're in the main document");

  // Pre-load professor data when Schedule Builder page loads
  console.log("🚀 Pre-loading professor data for Schedule Builder...");
  chrome.runtime.sendMessage({ type: "preloadData" }, (response) => {
    console.log("📨 Preload response:", response);
  });

  // Look for the Schedule Builder iframe
  const iframe = document.querySelector('iframe[name="TargetContent"]');
  if (iframe) {
    console.log("🎯 Found Schedule Builder iframe, waiting for it to load...");

    // Wait for iframe to load
    iframe.addEventListener("load", () => {
      console.log("📥 Iframe loaded, checking class notes before setup...");
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && shouldDisableForClassNotes(iframeDoc)) {
          console.log(
            "🛑 PolyRatings disabled inside iframe due to class notes keywords"
          );
          return;
        }
      } catch (e) {}
      setupMutationObserver();
      if (shouldEnableAgent(iframe.contentDocument)) {
        setupButtonObserver();
      }
    });

    // If iframe is already loaded, set up observer immediately
    if (
      iframe.contentDocument &&
      iframe.contentDocument.readyState === "complete"
    ) {
      console.log("📥 Iframe already loaded, checking class notes...");
      const iframeDoc = iframe.contentDocument;
      if (shouldDisableForClassNotes(iframeDoc)) {
        console.log(
          "🛑 PolyRatings disabled inside iframe (already loaded) due to class notes keywords"
        );
      } else {
        setupMutationObserver();
        setupButtonObserver();
      }
    }
  } else {
    console.log(
      "❌ Schedule Builder iframe not found, setting up observer anyway..."
    );
    setupMutationObserver();
    if (shouldEnableAgent(document)) {
      setupButtonObserver();
    }
  }
} else {
  console.log("📄 We're already in an iframe");
  setupMutationObserver();
  if (shouldEnableAgent(document)) {
    setupButtonObserver();
  }
}
