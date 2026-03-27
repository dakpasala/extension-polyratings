// ==================== CONSTANTS ====================
const SCROLL_THROTTLE_MS = 150;
const URL_CHECK_INTERVAL = 3000;
const VISIBILITY_THRESHOLD = 0.4;
const DEBOUNCE_DELAY = 200; // Reduced from 500ms for faster initial load
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
