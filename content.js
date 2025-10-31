// PolyRatings Enhancer - Content Script
console.log("PolyRatings Enhancer content script loaded!");

// ==================== CONSTANTS ====================
const SCROLL_THROTTLE_MS = 150;
const URL_CHECK_INTERVAL = 3000;
const VISIBILITY_THRESHOLD = 0.4;
const DEBOUNCE_DELAY = 500;
const OBSERVER_TIMEOUT = 30000;

const DISABLING_PHRASES = [
  "additional time",
  "continuous enroll",
  "continuous enrollment",
];
const CALPOLY_REGEX = /(?:^|\.)calpoly\.edu$/i;

const CSS_CLASSES = {
  RATING_ELEMENT: "polyratings-rating-element",
  LOADING_SKELETON: "polyratings-loading-skeleton",
  ASK_AGENT_BTN: "ask-agent-button",
  AGENT_POPUP: "agent-popup",
  PROFESSOR_TOOLTIP: "professor-tooltip",
  DATA_ATTR: "data-polyratings",
};

const SELECTORS = {
  MOBILE_INSTRUCTOR: "dt",
  DESKTOP_GRID: ".cx-MuiGrid-container.cx-MuiGrid-wrap-xs-nowrap",
  DESKTOP_DETAILS: ".cx-MuiGrid-grid-xs-5",
  DESKTOP_PROF_NAME: ".cx-MuiGrid-grid-xs-4 .cx-MuiTypography-body2",
};

// ==================== STATE ====================
let currentUrl = window.location.href.split("#")[0];
const processedProfessors = new Set();
const PR_DISABLE_FOR_NOTES = shouldDisableForClassNotes();

// ==================== UTILITY FUNCTIONS ====================
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
    return totalArea > 0 && visibleArea / totalArea >= VISIBILITY_THRESHOLD;
  } catch {
    return true;
  }
}

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
    } catch {}
  };
  tryRender();
}

function shouldDisableForClassNotes(rootDoc) {
  try {
    const doc = rootDoc || document;
    const headers = Array.from(
      doc.querySelectorAll("p.cx-MuiTypography-h4, .cx-MuiTypography-h4")
    ).filter(
      (el) => (el.textContent || "").trim().toLowerCase() === "class notes"
    );

    for (const header of headers) {
      let notesContainer = header.parentElement;
      let notesText = "";
      if (header.nextElementSibling) {
        notesText = header.nextElementSibling.textContent || "";
      }
      if (!notesText && notesContainer) {
        const bodyNode = notesContainer.querySelector(
          ".cx-MuiTypography-body1, .cx-MuiTypography-body2, p"
        );
        if (bodyNode) notesText = bodyNode.textContent || "";
      }
      notesText = notesText.toLowerCase();
      if (DISABLING_PHRASES.some((p) => notesText.includes(p))) return true;
    }

    const bodyText = (
      doc.body?.innerText ||
      doc.documentElement?.textContent ||
      ""
    ).toLowerCase();
    if (!bodyText.includes("class notes")) return false;
    return DISABLING_PHRASES.some((phrase) => bodyText.includes(phrase));
  } catch {
    return false;
  }
}

function shouldEnableAgent(rootDoc) {
  const doc = rootDoc || document;
  const host = location?.hostname || "";
  if (!CALPOLY_REGEX.test(host)) return false;
  try {
    const text = (
      doc.body?.innerText ||
      doc.documentElement?.textContent ||
      ""
    ).toLowerCase();
    return text.includes("select sections");
  } catch {
    return false;
  }
}

function markProfessorProcessed(professorName, elementId) {
  processedProfessors.add(`${professorName}-${elementId}`);
}

function isProfessorProcessed(professorName, elementId) {
  return processedProfessors.has(`${professorName}-${elementId}`);
}

function getElementPath(element) {
  const path = [];
  let current = element;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className) {
      selector += `.${Array.from(current.classList).join(".")}`;
    }
    const siblings = Array.from(current.parentNode.children);
    selector += `:nth-child(${siblings.indexOf(current) + 1})`;
    path.unshift(selector);
    current = current.parentNode;
  }
  return path.join(" > ");
}

function clearRatingsIfUrlChanged() {
  if (typeof currentUrl === "undefined") {
    currentUrl = window.location.href.split("#")[0];
  }
  const newUrl = window.location.href.split("#")[0];
  if (newUrl !== currentUrl) {
    document
      .querySelectorAll(`.${CSS_CLASSES.RATING_ELEMENT}`)
      .forEach((r) => r.remove());
    currentUrl = newUrl;
  }
}

// ==================== SCROLL MANAGEMENT ====================
if (!window.prScrollState) {
  window.prScrollState = { busy: false, t: null };
  const onScroll = () => {
    window.prScrollState.busy = true;
    if (window.prScrollState.t) clearTimeout(window.prScrollState.t);
    window.prScrollState.t = setTimeout(() => {
      window.prScrollState.busy = false;
      window.prScrollState.t = null;
    }, SCROLL_THROTTLE_MS);
  };
  document.addEventListener("scroll", onScroll, {
    capture: true,
    passive: true,
  });
}

setInterval(clearRatingsIfUrlChanged, URL_CHECK_INTERVAL);

// ==================== STYLES ====================
function injectStyles() {
  if (document.getElementById("pr-style")) return;
  const style = document.createElement("style");
  style.id = "pr-style";
  style.textContent = `
    .cx-MuiExpansionPanelSummary-root {
      width: 100% !important;
      max-width: 100% !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .cx-MuiExpansionPanel-root, [class*="cx-MuiExpansionPanel-root"] {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      margin: 0 !important;
    }
    .cx-MuiExpansionPanelSummary-root * {
      max-width: 100% !important;
      box-sizing: border-box !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-container,
    .cx-MuiExpansionPanelSummary-root [class*="cx-MuiGrid-container"] {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }
    .cx-MuiExpansionPanelSummary-root [class*="cx-MuiGrid-grid-xs"],
    .cx-MuiExpansionPanelSummary-root [class*="cx-MuiGrid-item"] {
      max-width: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item {
      overflow: hidden !important;
      padding: 5px 2px !important;
      min-height: 38px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      box-sizing: border-box !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item:first-child {
      justify-content: center !important;
      padding: 5px 2px !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiTypography-root.cx-MuiTypography-body2.cx-MuiTypography-noWrap {
      text-align: left !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-4 {
      justify-content: flex-start !important;
      padding: 5px 2px !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiTypography-root {
      width: 100% !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      line-height: 1.4 !important;
      text-align: center !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-4 .cx-MuiTypography-root {
      text-align: left !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-2 .cx-MuiTypography-root,
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-3 .cx-MuiTypography-root {
      text-align: left !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-1:last-child {
      justify-content: flex-end !important;
      padding: 5px 2px !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-1:last-child .cx-MuiTypography-root {
      text-align: right !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item input[type="checkbox"],
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-item button {
      margin: 0 auto !important;
      display: block !important;
    }
    .cx-MuiDivider-root.mx-3, .cx-MuiDivider-root.mx-3 + *,
    .cx-MuiDivider-root.mx-3 ~ * {
      text-align: left !important;
      justify-content: flex-start !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    .cx-MuiDivider-root.mx-3 + * .cx-MuiTypography-root,
    .cx-MuiDivider-root.mx-3 ~ * .cx-MuiTypography-root {
      text-align: left !important;
      justify-content: flex-start !important;
      white-space: normal !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }
    .cx-MuiExpansionPanelDetails-root, [class*="cx-MuiExpansionPanelDetails"] {
      max-width: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      word-wrap: break-word !important;
    }
    .cx-MuiExpansionPanelDetails-root .cx-MuiTypography-root,
    [class*="cx-MuiExpansionPanelDetails"] .cx-MuiTypography-root {
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: unset !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }
    .${CSS_CLASSES.RATING_ELEMENT} {
      display: inline-flex !important;
      align-items: center !important;
      padding: 4px 10px !important;
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
    .${CSS_CLASSES.LOADING_SKELETON} {
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
    .rating-stars-excellent {
      fill: #FFD700 !important;
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
    [role="row"] .cx-MuiGrid-grid-xs-1:last-child,
    [role="row"] .cx-MuiGrid-item:last-child {
      justify-content: flex-start !important;
    }
    [role="row"] .cx-MuiGrid-item:last-child button,
    [role="row"] .cx-MuiGrid-item:last-child .cx-MuiTypography-root {
      text-align: left !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-5 .cx-MuiGrid-grid-xs-4 {
      display: flex !important;
      justify-content: flex-start !important;
      text-align: left !important;
      align-items: center !important;
    }
    .cx-MuiExpansionPanelSummary-root .cx-MuiGrid-grid-xs-5 .cx-MuiGrid-grid-xs-4 .cx-MuiTypography-root {
      text-align: left !important;
    }
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
injectStyles();

// ==================== RATING UI CREATION ====================
function createLoadingSkeleton() {
  const skeleton = document.createElement("div");
  skeleton.className = CSS_CLASSES.LOADING_SKELETON;
  skeleton.setAttribute("data-loading", "true");
  return skeleton;
}

function getRatingClass(rating) {
  const numRating = parseFloat(rating);
  if (numRating >= 3.0) return "rating-stars-excellent";
  if (numRating >= 2.0) return "rating-stars-high";
  if (numRating >= 1.0) return "rating-stars-medium";
  return "rating-stars-low";
}

function ensureSVGGradients() {
  if (document.getElementById("polyratings-gradients")) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.assign(svg.style, {
    position: "absolute",
    width: "0",
    height: "0",
    visibility: "hidden",
  });
  svg.id = "polyratings-gradients";
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

  const gradients = [
    { id: "goldGradient", colors: ["#FFD700", "#FFA500", "#FF8C00"] },
    { id: "yellowOrangeGradient", colors: ["#FFA500", "#FF8C00", "#FF7F00"] },
    { id: "orangeGradient", colors: ["#FF8C00", "#FF7F00", "#FF6B00"] },
    { id: "redGradient", colors: ["#FF6B00", "#FF4500", "#FF0000"] },
  ];

  gradients.forEach(({ id, colors }) => {
    const grad = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "linearGradient"
    );
    grad.id = id;
    grad.setAttribute("x1", "0%");
    grad.setAttribute("y1", "0%");
    grad.setAttribute("x2", "100%");
    grad.setAttribute("y2", "100%");
    colors.forEach((color, i) => {
      const stop = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "stop"
      );
      stop.setAttribute("offset", `${i * 50}%`);
      stop.setAttribute("stop-color", color);
      grad.appendChild(stop);
    });
    defs.appendChild(grad);
  });

  svg.appendChild(defs);
  document.body.appendChild(svg);
}

function createRatingElement(professor, options = { animate: false }) {
  const ratingContainer = document.createElement("a");
  ratingContainer.href = professor.link;
  ratingContainer.target = "_blank";
  ratingContainer.className = CSS_CLASSES.RATING_ELEMENT;
  ratingContainer.style.cssText = `
    display: inline-flex; align-items: center; text-decoration: none;
    padding: 3px 8px; border: 1px solid #7F8A9E; border-radius: 12px;
    font-size: 12px; color: #090d19; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: pointer; white-space: nowrap; background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 1px 2px rgba(0,0,0,0.1); margin-left: 0px;
    max-width: calc(100% - 4px); overflow: hidden; width: fit-content;
    ${
      options.animate
        ? "transform: translateY(8px) scale(0.95); opacity: 0;"
        : "opacity: 1;"
    }
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
  addHoverTooltip(ratingContainer, professor);

  const ratingText = document.createElement("span");
  ratingText.textContent =
    professor.rating === 0 ? "Add Prof" : `${professor.rating}/4`;
  ratingText.style.marginRight = "3px";

  const stars = document.createElement("span");
  stars.className = "star-rating";
  stars.style.display = "inline-flex";
  stars.style.gap = "1px";

  if (professor.rating > 0) {
    ensureSVGGradients();
    const ratingClass = getRatingClass(professor.rating);
    stars.innerHTML = `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" stroke-width="2" class="${ratingClass}"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;

    // Retry mechanism for star rendering
    [100, 500, 1000].forEach((delay, idx) => {
      setTimeout(() => {
        const svgElement = stars.querySelector("svg");
        if (!svgElement?.querySelector("path")) {
          const fallbackColor =
            idx === 2 ? getRatingClass(professor.rating) : null;
          if (idx === 2) {
            const rating = parseFloat(professor.rating);
            let color = "#FFD700";
            if (rating >= 3.0) color = "#FFD700";
            else if (rating >= 2.0) color = "#FFA500";
            else if (rating >= 1.0) color = "#FF8C00";
            else color = "#FF6B00";
            stars.innerHTML = `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" stroke-width="2" fill="${color}" stroke="#B8860B"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;
          } else {
            const ratingClass = getRatingClass(professor.rating);
            stars.innerHTML = `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" stroke-width="2" class="${ratingClass}"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;
          }
        }
      }, delay);
    });
  }

  ratingContainer.appendChild(ratingText);
  ratingContainer.appendChild(stars);
  if (options.animate) {
    ratingContainer.classList.add("fade-in");
    setTimeout(() => {
      ratingContainer.style.transform = "translateY(0) scale(1)";
      ratingContainer.style.opacity = "1";
    }, 10);
  }
  return ratingContainer;
}

function createNotFoundBadge(professorName) {
  const notFoundContainer = document.createElement("span");
  notFoundContainer.style.cssText = `
    display: inline-flex; align-items: center; padding: 3px 8px;
    background: rgba(255, 255, 255, 0.9); border: 1px solid #7F8A9E;
    border-radius: 12px; font-size: 12px; color: #090d19; text-decoration: none;
    transition: all 0.2s ease; cursor: pointer; white-space: nowrap;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1); margin-left: 0px;
    max-width: calc(100% - 4px); overflow: hidden; width: fit-content; margin-top: 4px;
  `;
  const notFoundText = document.createElement("span");
  notFoundText.textContent = "Add Prof";
  notFoundText.style.cssText =
    "white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;";
  notFoundContainer.appendChild(notFoundText);
  notFoundContainer.addEventListener("mouseenter", () => {
    notFoundContainer.style.background = "rgba(21, 71, 52, 0.12)";
    notFoundContainer.style.borderColor = "#154734";
  });
  notFoundContainer.addEventListener("mouseleave", () => {
    notFoundContainer.style.background = "rgba(255, 255, 255, 0.9)";
    notFoundContainer.style.borderColor = "#7F8A9E";
  });
  notFoundContainer.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(
      `https://polyratings.dev/new-professor?name=${encodeURIComponent(
        professorName
      )}`,
      "_blank"
    );
  });
  notFoundContainer.title = `Add ${professorName} to PolyRatings`;
  addHoverTooltip(notFoundContainer, { name: professorName, rating: 0 });
  return notFoundContainer;
}

// ==================== TOOLTIPS ====================
function initTooltipState() {
  if (!window.PRTooltipState) {
    window.PRTooltipState = {
      owner: null,
      showTimeout: null,
      hideTimeout: null,
    };
    document.addEventListener(
      "scroll",
      () => hideProfessorTooltip(null, true),
      { capture: true }
    );
    window.addEventListener("blur", () => hideProfessorTooltip(null, true));
  }
}

function addHoverTooltip(element, professor) {
  initTooltipState();
  element.addEventListener("mouseenter", () => {
    if (window.PRTooltipState.hideTimeout) {
      clearTimeout(window.PRTooltipState.hideTimeout);
      window.PRTooltipState.hideTimeout = null;
    }
    if (window.PRTooltipState.showTimeout) {
      clearTimeout(window.PRTooltipState.showTimeout);
      window.PRTooltipState.showTimeout = null;
    }
    if (
      window.PRTooltipState.owner &&
      window.PRTooltipState.owner !== element
    ) {
      hideProfessorTooltip(window.PRTooltipState.owner, true);
    }
    window.PRTooltipState.owner = element;
    window.PRTooltipState.showTimeout = setTimeout(() => {
      showProfessorTooltip(element, professor);
      window.PRTooltipState.showTimeout = null;
    }, 300);
  });
  element.addEventListener("mouseleave", () => {
    if (window.PRTooltipState.showTimeout) {
      clearTimeout(window.PRTooltipState.showTimeout);
      window.PRTooltipState.showTimeout = null;
    }
    window.PRTooltipState.hideTimeout = setTimeout(() => {
      hideProfessorTooltip(element, false);
      window.PRTooltipState.hideTimeout = null;
    }, 50);
  });
}

function showProfessorTooltip(element, professor) {
  hideProfessorTooltip();
  const tooltip = document.createElement("div");
  tooltip.className = CSS_CLASSES.PROFESSOR_TOOLTIP;
  tooltip.style.cssText = `
    position: absolute; background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000; padding: 16px 20px; border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); font-size: 14px; font-weight: 500;
    max-width: 300px; z-index: 10000; opacity: 0;
    transform: scale(0.8) translateY(10px);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none; border: 2px solid rgba(255, 255, 255, 0.3);
  `;
  tooltip.setAttribute(CSS_CLASSES.DATA_ATTR, "true");

  chrome.runtime.sendMessage(
    { type: "getGeminiTooltipAnalysis", profName: professor.name },
    (response) => {
      if (response.status === "success" && response.professor) {
        const prof = response.professor;
        tooltip.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">${prof.name}</div>
        <div style="margin-bottom: 8px;">
          <span style="background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 6px; font-size: 12px;">
            ⭐ ${prof.rating}/4.0
          </span>
        </div>
        <div style="line-height: 1.4; font-size: 13px;">${response.analysis}</div>
      `;
      } else if (response.status === "ai_analysis") {
        tooltip.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">${professor.name}</div>
        <div style="margin-bottom: 8px;">
          <span style="background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 6px; font-size: 12px;">
            📝 Not Rated
          </span>
        </div>
        <div style="line-height: 1.4; font-size: 13px;">${response.analysis}</div>
      `;
      } else {
        tooltip.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">${professor.name}</div>
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
      positionTooltip(tooltip, element);
      document.body.appendChild(tooltip);
      setTimeout(() => {
        tooltip.style.opacity = "1";
        tooltip.style.transform = "scale(1) translateY(0)";
      }, 10);
    }
  );
}

function positionTooltip(tooltip, element) {
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  let top = rect.top - tooltipRect.height - 10;
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  if (left < 10) left = 10;
  else if (left + tooltipRect.width > window.innerWidth - 10)
    left = window.innerWidth - tooltipRect.width - 10;
  if (top < 10) top = rect.bottom + 10;
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

function hideProfessorTooltip(owner = null, immediate = false) {
  const existingTooltip = document.querySelector(
    `.${CSS_CLASSES.PROFESSOR_TOOLTIP}`
  );
  if (existingTooltip) {
    if (!owner || window.PRTooltipState?.owner === owner) {
      const removeNow = () => {
        if (existingTooltip?.parentNode)
          existingTooltip.parentNode.removeChild(existingTooltip);
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

// ==================== INJECTION HELPERS ====================
function cleanupCorruptedText(element) {
  const textNodes = Array.from(element.childNodes).filter(
    (n) => n.nodeType === Node.TEXT_NODE
  );
  textNodes.forEach((node) => {
    if (node.textContent.includes("Add to PolyRatings")) node.remove();
  });
}

function injectRatingUI(professorElement, professor, profIndex = 0) {
  const professorName = professor.name;
  const existingRatings = professorElement.querySelectorAll(
    `[data-professor="${professorName}"][data-index="${profIndex}"]`
  );
  existingRatings.forEach((r) => r.remove());

  const ratingElement = createRatingElement(professor, { animate: true });
  ratingElement.setAttribute("data-professor", professorName);
  ratingElement.setAttribute("data-index", profIndex.toString());
  ratingElement.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
  ratingElement.setAttribute("data-pr-initialized", "true");
  if (profIndex > 0) ratingElement.style.marginLeft = "12px";

  const lineBreak = document.createElement("br");
  lineBreak.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
  professorElement.appendChild(lineBreak);
  professorElement.appendChild(ratingElement);

  setTimeout(() => {
    ratingElement.style.transform = "translateY(0) scale(1)";
    ratingElement.style.opacity = "1";
  }, 10);

  const localObserver = new MutationObserver(() => {
    const exists = professorElement.querySelector(
      `[data-professor="${CSS.escape(
        professorName
      )}"][data-index="${profIndex}"]`
    );
    if (!exists) {
      setTimeout(() => {
        if (
          professorElement.querySelector(
            `[data-professor="${CSS.escape(
              professorName
            )}"][data-index="${profIndex}"]`
          )
        )
          return;
        if (!isElementMostlyVisible(professorElement)) return;
        const reInjected = createRatingElement(professor, { animate: false });
        reInjected.setAttribute("data-professor", professorName);
        reInjected.setAttribute("data-index", profIndex.toString());
        reInjected.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
        reInjected.setAttribute("data-pr-initialized", "true");
        const br = document.createElement("br");
        br.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
        professorElement.appendChild(br);
        professorElement.appendChild(reInjected);
      }, 200);
    }
  });
  try {
    localObserver.observe(professorElement, { childList: true });
    setTimeout(() => localObserver.disconnect(), OBSERVER_TIMEOUT);
  } catch {}
}

function injectDesktopRatingUI(professorNameElement, professor) {
  cleanupCorruptedText(professorNameElement);
  const existingRatings = professorNameElement.querySelectorAll(
    `.${CSS_CLASSES.RATING_ELEMENT}, .pr-rating-container`
  );
  existingRatings.forEach((r) => r.remove());

  injectStyles();
  const ratingEl = createRatingElement(professor, { animate: true });
  const originalText = professorNameElement.textContent.trim();

  const container = document.createElement("div");
  container.style.cssText =
    "display: flex; flex-direction: column; width: 100%; align-items: flex-start; gap: 2px;";

  const nameSpan = document.createElement("div");
  nameSpan.textContent = originalText;
  nameSpan.style.cssText =
    "white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; line-height: 1.2;";

  const ratingContainer = document.createElement("div");
  ratingContainer.style.cssText = "width: 100%; overflow: hidden;";
  ratingContainer.appendChild(ratingEl);

  container.appendChild(nameSpan);
  container.appendChild(ratingContainer);
  professorNameElement.innerHTML = "";
  professorNameElement.appendChild(container);
  addHoverTooltip(professorNameElement, professor);
  container.setAttribute(CSS_CLASSES.DATA_ATTR, "true");

  setTimeout(() => {
    ratingEl.style.transform = "translateY(0) scale(1)";
    ratingEl.style.opacity = "1";
  }, 10);

  const desktopObserver = new MutationObserver(() => {
    if (!document.contains(container)) {
      setTimeout(() => {
        if (document.contains(container)) return;
        if (!isElementMostlyVisible(professorNameElement)) return;
        desktopObserver.disconnect();
        injectDesktopRatingUI(professorNameElement, professor);
      }, 200);
    }
  });
  try {
    desktopObserver.observe(professorNameElement, { childList: true });
    setTimeout(() => desktopObserver.disconnect(), OBSERVER_TIMEOUT);
  } catch {}
}

function injectDesktopNotFoundUI(professorNameElement, professorName) {
  cleanupCorruptedText(professorNameElement);
  const existingRatings = professorNameElement.querySelectorAll(
    `.${CSS_CLASSES.RATING_ELEMENT}, .pr-rating-container`
  );
  existingRatings.forEach((r) => r.remove());

  injectStyles();
  const notFoundEl = createNotFoundBadge(professorName);
  const originalText = professorNameElement.textContent.trim();

  const container = document.createElement("div");
  container.style.cssText =
    "display: flex; flex-direction: column; width: 100%; align-items: flex-start; gap: 2px;";

  const nameSpan = document.createElement("div");
  nameSpan.textContent = originalText;
  nameSpan.style.cssText =
    "white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; line-height: 1.2;";

  const badgeContainer = document.createElement("div");
  badgeContainer.style.cssText = "width: 100%; overflow: hidden;";
  badgeContainer.appendChild(notFoundEl);

  container.appendChild(nameSpan);
  container.appendChild(badgeContainer);
  professorNameElement.innerHTML = "";
  professorNameElement.appendChild(container);
  addHoverTooltip(professorNameElement, { name: professorName, rating: 0 });
  container.setAttribute(CSS_CLASSES.DATA_ATTR, "true");

  const checkInterval = setInterval(() => {
    if (!document.contains(container)) {
      clearInterval(checkInterval);
      setTimeout(
        () => injectDesktopNotFoundUI(professorNameElement, professorName),
        100
      );
    }
  }, 1000);
  setTimeout(() => clearInterval(checkInterval), OBSERVER_TIMEOUT);
}

// ==================== PROFESSOR PROCESSING ====================
function processMobileProfessors() {
  const dtElements = document.querySelectorAll(SELECTORS.MOBILE_INSTRUCTOR);
  const mobileBatch = [];
  let mobileBatchTimeout;

  dtElements.forEach((dt) => {
    if (dt.textContent.trim() === "Instructor:") {
      const nextElement = dt.nextElementSibling;
      if (nextElement) {
        const instructorText = nextElement.textContent.trim();
        const professorNames = instructorText
          .split(",")
          .map((n) => n.trim())
          .filter((n) => n.length > 0);
        professorNames.forEach((professorName, profIndex) => {
          const elementId = getElementPath(nextElement);
          const professorKey = `${professorName}-${elementId}-${profIndex}`;
          const existingProfRating = nextElement.querySelector(
            `[data-professor="${professorName}"][data-index="${profIndex}"]`
          );
          if (
            existingProfRating ||
            isProfessorProcessed(professorName, elementId)
          )
            return;

          mobileBatch.push({
            element: nextElement,
            professorName,
            profIndex,
            elementId,
            promise: prMessage("getProfRating", { profName: professorName }),
          });
        });
      }
    }
  });

  if (mobileBatch.length > 0) {
    const containerToSkeleton = new Map();
    mobileBatch.forEach((item) => {
      if (!containerToSkeleton.has(item.element)) {
        const sk = createLoadingSkeleton();
        sk.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
        item.element.appendChild(sk);
        containerToSkeleton.set(item.element, sk);
      }
    });

    clearTimeout(mobileBatchTimeout);
    mobileBatchTimeout = setTimeout(async () => {
      try {
        const results = await Promise.all(
          mobileBatch.map((b) => b.promise.then((res) => ({ res, b })))
        );
        containerToSkeleton.forEach((sk) => {
          if (sk?.parentNode) sk.parentNode.removeChild(sk);
        });

        results.forEach(({ res, b }) => {
          const { element, professorName, profIndex, elementId } = b;
          if (!element || !document.contains(element)) return;

          scheduleStableRender(element, () => {
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
              notFoundBadge.className = CSS_CLASSES.RATING_ELEMENT;
              notFoundBadge.setAttribute("data-professor", professorName);
              notFoundBadge.setAttribute("data-index", profIndex.toString());
              const br = document.createElement("br");
              br.setAttribute(CSS_CLASSES.DATA_ATTR, "true");
              element.appendChild(br);
              element.appendChild(notFoundBadge);
              if (profIndex > 0) notFoundBadge.style.marginLeft = "12px";
              markProfessorProcessed(professorName, elementId);
            }
          });
        });
      } catch {
        containerToSkeleton.forEach((sk) => {
          if (sk?.parentNode) sk.parentNode.removeChild(sk);
        });
      }
    }, DEBOUNCE_DELAY);
  }

  return mobileBatch.length > 0;
}

function processDesktopProfessors() {
  const mainGridContainers = document.querySelectorAll(SELECTORS.DESKTOP_GRID);
  if (mainGridContainers.length === 0) return;

  mainGridContainers.forEach((container) => {
    const detailsGridItems = container.querySelectorAll(
      SELECTORS.DESKTOP_DETAILS
    );
    detailsGridItems.forEach((detailsItem) => {
      const professorNameCells = detailsItem.querySelectorAll(
        SELECTORS.DESKTOP_PROF_NAME.split(" ")[0]
      );
      if (professorNameCells.length === 0) return;

      const firstCell = professorNameCells[0];
      const professorNameElement = firstCell.querySelector(
        ".cx-MuiTypography-body2"
      );
      if (!professorNameElement) return;

      const professorName = professorNameElement.textContent.trim();
      if (!professorName) return;

      const elementId = getElementPath(professorNameElement);
      const existingRating = professorNameElement.querySelector(
        `.${CSS_CLASSES.RATING_ELEMENT}, .pr-rating-container`
      );
      if (existingRating) return;

      chrome.runtime.sendMessage(
        { type: "getProfRating", profName: professorName },
        (response) => {
          if (response.status === "success" && response.professor) {
            injectDesktopRatingUI(professorNameElement, response.professor);
          } else if (response.status === "not_found") {
            injectDesktopNotFoundUI(professorNameElement, professorName);
          }
        }
      );
    });
  });
}

function findAndLogProfessors() {
  if (window.processingProfessors) return;
  window.processingProfessors = true;
  setTimeout(() => {
    window.processingProfessors = false;
  }, 50);

  cleanupCorruptedText(
    document.querySelector('[role="cell"]') || document.body
  );
  const mobileFound = processMobileProfessors();
  if (!mobileFound) processDesktopProfessors();
  injectAskAgentButton();
}

// ==================== AGENT POPUP ====================
function openAgentPopup(button) {
  button.textContent = "Active Agent";
  button.style.background = "linear-gradient(135deg, #4CAF50, #45a049)";
  button.style.color = "#fff";

  const popup = document.createElement("div");
  popup.className = CSS_CLASSES.AGENT_POPUP;
  popup.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.5); z-index: 10000; display: flex;
    align-items: center; justify-content: center; animation: fadeIn 0.3s ease-out;
  `;

  const chatContainer = document.createElement("div");
  chatContainer.style.cssText = `
    background: white; border-radius: 16px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    width: 400px; max-width: 90vw; height: 500px; max-height: 80vh;
    display: flex; flex-direction: column; overflow: hidden; position: relative;
    animation: slideUp 0.4s ease-out;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    background: linear-gradient(135deg, #FFD700, #FFA500); color: #000;
    padding: 16px 20px; font-weight: 600; font-size: 16px;
    display: flex; align-items: center; justify-content: space-between;
  `;
  header.innerHTML = `
    <span>🤖 PolyRatings Agent</span>
    <button class="close-agent-btn" style="
      background: none; border: none; font-size: 20px; cursor: pointer;
      color: #000; padding: 0; width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
    ">×</button>
  `;

  const messagesArea = document.createElement("div");
  messagesArea.className = "agent-messages";
  messagesArea.style.cssText =
    "flex: 1; padding: 20px; overflow-y: auto; background: #f8f9fa;";

  const welcomeMessage = document.createElement("div");
  welcomeMessage.style.cssText = `
    background: white; padding: 16px; border-radius: 12px;
    margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

  const inputArea = document.createElement("div");
  inputArea.style.cssText =
    "padding: 16px 20px; background: white; border-top: 1px solid #e0e0e0; display: flex; gap: 12px;";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ask me anything about professors or courses...";
  input.style.cssText = `
    flex: 1; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 24px;
    font-size: 14px; outline: none; transition: border-color 0.2s;
  `;

  const sendBtn = document.createElement("button");
  sendBtn.textContent = "Send";
  sendBtn.style.cssText = `
    background: linear-gradient(135deg, #FFD700, #FFA500); color: #000;
    border: none; border-radius: 24px; padding: 12px 20px;
    font-weight: 600; cursor: pointer; transition: transform 0.2s;
  `;

  header
    .querySelector(".close-agent-btn")
    .addEventListener("click", closeAgentPopup);
  sendBtn.addEventListener("click", () => {
    const message = input.value.trim();
    if (message) {
      addUserMessage(messagesArea, message);
      input.value = "";
      const typingId = addTypingMessage(messagesArea);
      chrome.runtime.sendMessage(
        { type: "chatbotQuery", query: message },
        (response) => {
          const typingElement = document.getElementById(typingId);
          if (typingElement) typingElement.remove();

          if (response?.status === "success") {
            addBotMessage(messagesArea, response.professor.analysis);
          } else if (response?.status === "ai_analysis") {
            addBotMessage(messagesArea, response.professor.analysis);
          } else if (response?.status === "general_response") {
            addBotMessage(messagesArea, response.message);
          } else {
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
    if (e.key === "Enter") sendBtn.click();
  });

  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);
  chatContainer.appendChild(header);
  chatContainer.appendChild(messagesArea);
  chatContainer.appendChild(inputArea);
  popup.appendChild(chatContainer);
  document.body.appendChild(popup);
  setTimeout(() => input.focus(), 100);

  if (!document.querySelector("#agent-popup-styles")) {
    const style = document.createElement("style");
    style.id = "agent-popup-styles";
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .agent-popup input:focus { border-color: #FFD700 !important; }
      .agent-popup button:hover { transform: translateY(-1px); }
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }
}

function closeAgentPopup() {
  const popup = document.querySelector(`.${CSS_CLASSES.AGENT_POPUP}`);
  if (popup) popup.remove();
  const button = document.querySelector(`.${CSS_CLASSES.ASK_AGENT_BTN}`);
  if (button) {
    button.textContent = "Ask Agent";
    button.style.background = "linear-gradient(135deg, #FFD700, #FFA500)";
    button.style.color = "#000";
  }
}

function addUserMessage(container, message) {
  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `
    background: linear-gradient(135deg, #FFD700, #FFA500); color: #000;
    padding: 12px 16px; border-radius: 18px 18px 4px 18px;
    margin-bottom: 12px; margin-left: 40px; font-size: 14px;
    word-wrap: break-word; animation: slideInRight 0.3s ease-out;
  `;
  messageDiv.textContent = message;
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

function convertLinksToHTML(text) {
  if (!text || typeof text !== "string") return text;
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return escapedText.replace(urlRegex, (url) => {
    let displayText = url;
    if (url.includes("polyratings.dev/professor/"))
      displayText = "View full profile →";
    else if (url.includes("polyratings.dev/new-professor"))
      displayText = "Add to PolyRatings →";
    else if (url.length > 50) displayText = url.substring(0, 47) + "...";
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="
      color: #1976d2; text-decoration: none; font-weight: 600;
      background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
      padding: 4px 8px; border-radius: 6px; border: 1px solid #1976d2;
      display: inline-block; margin: 2px 0; transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(25, 118, 210, 0.2);
    " onmouseover="this.style.background='linear-gradient(135deg, #1976d2, #7b1fa2)'; this.style.color='white'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 6px rgba(25, 118, 210, 0.4)';" onmouseout="this.style.background='linear-gradient(135deg, #e3f2fd, #f3e5f5)'; this.style.color='#1976d2'; this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(25, 118, 210, 0.2)';">
      ${displayText}
    </a>`;
  });
}

function addBotMessage(container, message) {
  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `
    background: white; color: #333; padding: 12px 16px;
    border-radius: 18px 18px 18px 4px; margin-bottom: 12px;
    margin-right: 40px; font-size: 14px; word-wrap: break-word;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    animation: slideInLeft 0.3s ease-out; line-height: 1.5;
  `;
  messageDiv.innerHTML = convertLinksToHTML(message);
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

function addTypingMessage(container) {
  const typingId = "typing-" + Date.now();
  const messageDiv = document.createElement("div");
  messageDiv.id = typingId;
  messageDiv.style.cssText = `
    background: white; color: #666; padding: 12px 16px;
    border-radius: 18px 18px 18px 4px; margin-bottom: 12px;
    margin-right: 40px; font-size: 14px; font-style: italic;
    display: flex; align-items: center; gap: 8px;
  `;
  messageDiv.innerHTML = `
    <span>🤖 Agent is typing</span>
    <div class="typing-dots" style="display: flex; gap: 2px;">
      <div style="width: 4px; height: 4px; background: #666; border-radius: 50%; animation: typing 1.4s infinite ease-in-out;"></div>
      <div style="width: 4px; height: 4px; background: #666; border-radius: 50%; animation: typing 1.4s infinite ease-in-out 0.2s;"></div>
      <div style="width: 4px; height: 4px; background: #666; border-radius: 50%; animation: typing 1.4s infinite ease-in-out 0.4s;"></div>
    </div>
  `;
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

function injectAskAgentButton() {
  if (shouldDisableForClassNotes(document) || !shouldEnableAgent(document))
    return;
  if (document.querySelector(`.${CSS_CLASSES.ASK_AGENT_BTN}`)) return;

  const buttonSelectors = [
    'button[type="button"]',
    ".MuiButton-root",
    "button",
    '[role="button"]',
  ];
  let foundButtons = [];
  buttonSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((button) => {
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

  if (foundButtons.length > 0) {
    const buttonContainer =
      foundButtons[0].closest("div") || foundButtons[0].parentElement;
    if (buttonContainer) {
      const askAgentButton = document.createElement("button");
      askAgentButton.className = CSS_CLASSES.ASK_AGENT_BTN;
      askAgentButton.textContent = "Ask Agent";
      askAgentButton.style.cssText = `
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #000; border: none; border-radius: 8px;
        padding: 10px 20px; font-size: 14px; font-weight: 600;
        cursor: pointer; margin-right: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.2s ease; display: inline-flex;
        align-items: center; gap: 6px;
      `;
      askAgentButton.addEventListener("mouseenter", () => {
        askAgentButton.style.transform = "translateY(-1px)";
        askAgentButton.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
      });
      askAgentButton.addEventListener("mouseleave", () => {
        askAgentButton.style.transform = "translateY(0)";
        askAgentButton.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
      });
      askAgentButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (document.querySelector(`.${CSS_CLASSES.AGENT_POPUP}`)) {
          closeAgentPopup();
        } else {
          openAgentPopup(askAgentButton);
        }
      });
      buttonContainer.insertBefore(askAgentButton, foundButtons[0]);
    }
  }
}

function setupButtonObserver() {
  if (!shouldEnableAgent(document)) return;
  injectAskAgentButton();
  const buttonCheckInterval = setInterval(() => {
    if (document.querySelector(`.${CSS_CLASSES.ASK_AGENT_BTN}`)) {
      clearInterval(buttonCheckInterval);
    } else {
      injectAskAgentButton();
    }
  }, 500);
  setTimeout(() => clearInterval(buttonCheckInterval), OBSERVER_TIMEOUT);
}

// ==================== MUTATION OBSERVER ====================
function isOurNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node;
  if (el.getAttribute?.(CSS_CLASSES.DATA_ATTR) === "true") return true;
  const cls = el.classList || { contains: () => false };
  if (
    cls.contains(CSS_CLASSES.RATING_ELEMENT) ||
    cls.contains(CSS_CLASSES.PROFESSOR_TOOLTIP) ||
    cls.contains(CSS_CLASSES.ASK_AGENT_BTN)
  )
    return true;
  if (el.id === "polyratings-gradients" || el.id === "pr-style") return true;
  return (
    el.querySelector?.(`[${CSS_CLASSES.DATA_ATTR}="true"]`) ||
    el.querySelector?.(`.${CSS_CLASSES.RATING_ELEMENT}`) ||
    el.querySelector?.(`.${CSS_CLASSES.PROFESSOR_TOOLTIP}`) ||
    el.querySelector?.(`.${CSS_CLASSES.ASK_AGENT_BTN}`)
  );
}

function hasRelevantChanges(mutations) {
  return mutations.some((mutation) => {
    for (let node of mutation.addedNodes || []) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.querySelectorAll?.(SELECTORS.MOBILE_INSTRUCTOR)?.length > 0)
          return true;
        if (node.tagName === "DT") return true;
        if (node.querySelectorAll?.(SELECTORS.DESKTOP_GRID)?.length > 0)
          return true;
        if (
          node.classList?.contains("cx-MuiGrid-container") &&
          node.classList?.contains("cx-MuiGrid-wrap-xs-nowrap")
        )
          return true;
        if (node.textContent?.includes("Instructor")) return true;
      }
    }
    if (mutation.type === "attributes") {
      const target = mutation.target;
      if (
        target.classList?.contains("cx-MuiGrid-container") ||
        target.classList?.contains("cx-MuiGrid-wrap-xs-nowrap")
      )
        return true;
    }
    return false;
  });
}

function setupMutationObserver() {
  let debounceTimeout;
  let isProcessing = false;

  const observer = new MutationObserver((mutations) => {
    const onlyOurChanges = mutations.every((mutation) => {
      const nodes = [
        ...Array.from(mutation.addedNodes || []),
        ...Array.from(mutation.removedNodes || []),
      ];
      return nodes.length > 0 && nodes.every((n) => isOurNode(n));
    });

    if (onlyOurChanges) return;
    if (shouldDisableForClassNotes(document)) {
      observer.disconnect();
      return;
    }
    if (isProcessing) return;

    if (hasRelevantChanges(mutations)) {
      clearTimeout(debounceTimeout);
      isProcessing = true;
      debounceTimeout = setTimeout(() => {
        findAndLogProfessors();
        isProcessing = false;
      }, 25);
    }
  });

  if (shouldDisableForClassNotes(document)) return;
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
  if (!shouldDisableForClassNotes(document)) findAndLogProfessors();
}

// ==================== INITIALIZATION ====================
if (PR_DISABLE_FOR_NOTES) {
  console.log(
    "🛑 PolyRatings disabled on this page due to class notes keywords"
  );
} else if (window.top === window) {
  chrome.runtime.sendMessage({ type: "preloadData" }, () => {});
  const iframe = document.querySelector('iframe[name="TargetContent"]');
  if (iframe) {
    iframe.addEventListener("load", () => {
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && shouldDisableForClassNotes(iframeDoc)) return;
      } catch {}
      setupMutationObserver();
      if (shouldEnableAgent(iframe.contentDocument)) setupButtonObserver();
    });
    if (iframe.contentDocument?.readyState === "complete") {
      const iframeDoc = iframe.contentDocument;
      if (!shouldDisableForClassNotes(iframeDoc)) {
        setupMutationObserver();
        setupButtonObserver();
      }
    }
  } else {
    setupMutationObserver();
    if (shouldEnableAgent(document)) setupButtonObserver();
  }
} else {
  setupMutationObserver();
  if (shouldEnableAgent(document)) setupButtonObserver();
}
