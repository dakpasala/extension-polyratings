// PolyRatings Enhancer - Content Script (Complete Fixed Version)
console.log("PolyRatings Enhancer content script loaded!");

// Track current URL for page change detection
// Disable the aggressive clearing (optional)
clearInterval(clearRatingsIfUrlChanged);

// OR make it smarter:
function clearRatingsIfUrlChanged() {
  const newUrl = window.location.href.split('#')[0]; // ignore hash changes
  if (newUrl !== currentUrl) {
    console.log("🔄 Major URL changed, clearing existing ratings");
    document.querySelectorAll(".polyratings-rating-element").forEach(r => r.remove());
    currentUrl = newUrl;
  }
}


// Monitor URL changes
setInterval(clearRatingsIfUrlChanged, 1000);

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
      
      /* Smooth animations */
      .polyratings-rating-element.fade-in {
        animation: fadeIn 0.15s ease-in-out;
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-3px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
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

// Function to create rating UI element (SIMPLIFIED - single version only)
function createRatingElement(professor) {
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
        transition: all 0.2s ease;
        cursor: pointer; 
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

  const ratingText = document.createElement("span");
  ratingText.textContent = `${professor.rating}/4`;
  ratingText.style.marginRight = "3px";

  // Create star rating based on professor rating (simplified version)
  const stars = document.createElement("span");
  stars.className = "star-rating";
  stars.style.display = "inline-flex";
  stars.style.gap = "1px";

  // Simple star calculation - just show one representative star
  const rating = parseFloat(professor.rating);
  
  let starsHtml = "";
  
  // Just show one star that represents the rating
  starsHtml += `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" fill="#FFD700" stroke="#B8860B" stroke-width="2"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;

  stars.innerHTML = starsHtml;

  ratingContainer.appendChild(ratingText);
  ratingContainer.appendChild(stars);

  // Add fade-in animation
  ratingContainer.classList.add("fade-in");

  return ratingContainer;
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

  // Add fade-in animation to match rating elements
  notFoundContainer.classList.add("fade-in");

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

  console.log(`🎨 Injecting mobile rating UI for: ${professorName} at index ${profIndex}`);

  // Create the rating element
  const ratingElement = createRatingElement(professor);
  ratingElement.setAttribute("data-professor", professorName);
  ratingElement.setAttribute("data-index", profIndex.toString());

  // Add extra margin for multiple professors (except the first one)
  if (profIndex > 0) {
    ratingElement.style.marginLeft = "12px";
  }

  // Add a small line break and spacing before the rating
  const lineBreak = document.createElement("br");
  professorElement.appendChild(lineBreak);

  // Insert the rating element with proper spacing
  professorElement.appendChild(ratingElement);

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

  const ratingEl = createRatingElement(professor);

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
  }, 200); // Reduced timeout for faster reprocessing

  console.log("🚀 Processing professors for current page...");

  // Don't aggressively clear ratings - let individual functions handle duplicates
  console.log("🧹 Letting individual functions handle duplicate prevention");

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

        // Process each professor individually
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
            console.log(`⏭️ Professor ${professorName} already has rating in this element at index ${profIndex}, skipping`);
            return;
          }

          // Send message to background script to get professor rating
          chrome.runtime.sendMessage(
            { type: "getProfRating", profName: professorName },
            (response) => {
              console.log("📨 Response from background script:", response);

              if (response.status === "success" && response.professor) {
                console.log("✅ Received professor data:", response.professor);
                injectRatingUI(nextElement, response.professor, profIndex);
              } else if (response.status === "not_found") {
                console.log("❌ Professor not found in database");
                
                // Inject the "not found" badge using the same function as ratings for consistent spacing
                const notFoundBadge = createNotFoundBadge(professorName);
                notFoundBadge.className = "polyratings-rating-element";
                notFoundBadge.setAttribute("data-professor", professorName);
                notFoundBadge.setAttribute("data-index", profIndex.toString());
                
                // Use the same injection method as ratings for consistent spacing
                const lineBreak = document.createElement("br");
                nextElement.appendChild(lineBreak);
                nextElement.appendChild(notFoundBadge);
                
                // Apply same margin logic as ratings
                if (profIndex > 0) {
                  notFoundBadge.style.marginLeft = "12px";
                }
              } else {
                console.log(
                  "❌ Error getting professor data:",
                  response.message
                );
              }
            }
          );

          professorCount++;
        });
      } else {
        console.log(
          `❌ No next element found for instructor at index ${index}`
        );
      }
    }
  });

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
                    console.log(`⏭️ Professor ${professorName} already has rating in this element, skipping`);
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
      <strong>🚧 Building in progress...</strong> More features coming soon!
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

      // Add bot response
      setTimeout(() => {
        addBotMessage(
          messagesArea,
          "🚧 Building in progress... This feature is coming soon!"
        );
      }, 500);
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
  `;
  messageDiv.textContent = message;
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

// Function to inject the Ask Agent button
function injectAskAgentButton() {
  console.log("🤖 Looking for Cancel/Ok buttons to add Ask Agent button...");

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
  }, 1000); // Check every second

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
      }, 100); // Reduced delay for faster response
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
  observer.observe(document.body, config);
  console.log(
    "✅ MutationObserver is now active in iframe and watching for changes"
  );

  // Run once on initial load
  console.log("🚀 Running initial professor search in iframe...");
  findAndLogProfessors();
}

// Main execution
console.log("🚀 Starting PolyRatings Enhancer...");

// Check if we're in the main document or already in an iframe
if (window.top === window) {
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
      console.log("📥 Iframe loaded, setting up observer...");
      setupMutationObserver();
      setupButtonObserver();
    });

    // If iframe is already loaded, set up observer immediately
    if (
      iframe.contentDocument &&
      iframe.contentDocument.readyState === "complete"
    ) {
      console.log(
        "📥 Iframe already loaded, setting up observer immediately..."
      );
      setupMutationObserver();
      setupButtonObserver();
    }
  } else {
    console.log(
      "❌ Schedule Builder iframe not found, setting up observer anyway..."
    );
    setupMutationObserver();
    setupButtonObserver();
  }
} else {
  console.log("📄 We're already in an iframe");
  setupMutationObserver();
  setupButtonObserver();
}