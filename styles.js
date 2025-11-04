// ==================== STYLES ====================
function injectStyles() {
  // Double-check: never inject on disabled pages
  if (shouldDisableForClassNotes(document)) return;
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

// Conditionally inject styles based on page type
function manageStyles() {
  const styleElement = document.getElementById("pr-style");
  const isDisabled = shouldDisableForClassNotes(document);
  
  if (isDisabled) {
    // Remove styles on disabled pages
    if (styleElement) {
      styleElement.remove();
    }
  } else if (!isDisabled && !styleElement) {
    // Add styles on enabled pages
    injectStyles();
  }
}

// Immediate check - before anything else
if (shouldDisableForClassNotes(document)) {
  // If we're on a disabled page from the start, don't inject anything
  const existingStyle = document.getElementById("pr-style");
  if (existingStyle) existingStyle.remove();
} else {
  // Initial check for enabled pages
  manageStyles();
}

// Store last URL to detect actual changes
let lastCheckedUrl = window.location.href;
let lastDisabledState = shouldDisableForClassNotes(document);

// Re-check when URL changes OR when disabled state might change
setInterval(() => {
  const currentUrl = window.location.href;
  const currentDisabledState = shouldDisableForClassNotes(document);
  
  if (currentUrl !== lastCheckedUrl || currentDisabledState !== lastDisabledState) {
    lastCheckedUrl = currentUrl;
    lastDisabledState = currentDisabledState;
    manageStyles();
  }
}, 500);
