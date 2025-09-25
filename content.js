// PolyRatings Enhancer - Content Script (Complete Fixed Version)
console.log("PolyRatings Enhancer content script loaded!");

// Set to track processed professors to prevent duplicates
const processedProfessors = new Set();
let currentUrl = window.location.href;

// Function to clear cache when URL changes
function clearCacheIfUrlChanged() {
  const newUrl = window.location.href;
  if (newUrl !== currentUrl) {
    console.log("🔄 URL changed, clearing professor cache");
    processedProfessors.clear();
    currentUrl = newUrl;
  }
}

// Monitor URL changes
setInterval(clearCacheIfUrlChanged, 1000);

function prInjectStyles() {
  if (document.getElementById("pr-style")) return;
  const style = document.createElement("style");
  style.id = "pr-style";
  style.textContent = `
      /* --- Make space for instructor column --- */
      .cx-MuiGrid-root.cx-MuiGrid-item.cx-MuiGrid-grid-xs-1:nth-of-type(2), /* Topic Column */
      .cx-MuiGrid-root.cx-MuiGrid-item.cx-MuiGrid-grid-xs-1:nth-of-type(5)  /* Wait List Open Column */
      {
          flex-basis: 6% !important; /* Slightly reduce width to make more space */
          max-width: 6% !important;
      }

      /* Add ellipsis to Topic column for long content */
      .cx-MuiGrid-root.cx-MuiGrid-item.cx-MuiGrid-grid-xs-1:nth-of-type(2) {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      /* Add ellipsis to Wait List Open column to prevent text cutoff */
      .cx-MuiGrid-root.cx-MuiGrid-item.cx-MuiGrid-grid-xs-1:nth-of-type(5) .cx-MuiTypography-noWrap div[aria-hidden="true"] {
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        max-width: 100% !important;
        display: block !important;
      }
      
      /* --- Styles for Vertical Rating Layout (FIXED) --- */
      .pr-wrap { 
        display: flex; 
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 0;
        width: 100%; 
        line-height: 1.2;
        min-height: auto;
        padding: 0;
      }
      
      .pr-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
        font-size: inherit;
        font-weight: inherit;
        color: inherit;
        margin: 0;
        line-height: 1.3;
        height: auto;
      }
      
      .pr-rating-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 4px;
        width: 100%;
        margin-top: 8px;
        margin-bottom: 0;
      }
      
      /* Star rating styles */
      .polyratings-rating-element {
        display: inline-flex;
        align-items: center;
        gap: 1px;
      }
      
      /* Hide extra stars when space is tight */
      .polyratings-rating-element .star-rating {
        display: inline-flex;
        gap: 1px;
      }
      
      /* Compact mode - show only first star */
      .polyratings-rating-element .star-rating.compact-mode svg:not(:first-child) {
        display: none !important;
      }
      
      /* Alternative compact mode selector for debugging */
      .star-rating.compact-mode svg:not(:first-child) {
        display: none !important;
      }
      
      

      /* Ensure proper table cell alignment - don't modify cell height */
      .cx-MuiGrid-grid-xs-4 .pr-wrap {
        height: auto;
        justify-content: flex-start;
        align-items: flex-start;
      }
      
      
      /* Don't modify the base cell height - let it stay natural */
      .cx-MuiGrid-grid-xs-4 {
        height: auto;
        min-height: auto;
      }
      
      /* Mobile approach spacing - add space below content, not to cell height */
      .polyratings-rating-element {
        margin-top: 2px; /* Add small top margin to prevent clipping */
        margin-bottom: 0; /* No bottom margin to avoid pushing headers */
        transition: all 0.3s ease-in-out;
        opacity: 1;
        transform: translateY(0);
      }
      
      /* Smooth fade-in animation for new ratings */
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
      
      /* Ensure the rating doesn't affect table row height */
  .polyratings-rating-element {
    display: inline-block;
    vertical-align: top;
    font-size: 12px !important;
    padding: 3px 8px !important;
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
        margin-left: 4px;
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

  // Create star rating based on professor rating
  const stars = document.createElement("span");
  stars.className = "star-rating";
  stars.style.display = "inline-flex";
  stars.style.gap = "1px";

  // Calculate how many stars to fill based on rating
  const rating = parseFloat(professor.rating);
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  let starsHtml = "";

  // Add full stars
  for (let i = 0; i < fullStars; i++) {
    starsHtml += `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" fill="#FFD700" stroke="#B8860B" stroke-width="2"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;
  }

  // Add half star if needed
  if (hasHalfStar) {
    starsHtml += `<svg viewBox="0 0 51 48" style="width:0.9em; height:0.9em; align-self: flex-start; margin-top: -2px;" fill="#FFD700" stroke="#B8860B" stroke-width="2"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;
  }

  // Add empty stars to make it 4 total
  const emptyStars = 4 - fullStars - (hasHalfStar ? 1 : 0);
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += `<svg viewBox="0 0 51 48" style="width:0.8em; height:0.8em; vertical-align: top;" fill="none" stroke="#B8860B" stroke-width="2"><path d="m25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z"></path></svg>`;
  }

  stars.innerHTML = starsHtml;

  ratingContainer.appendChild(ratingText);
  ratingContainer.appendChild(stars);

  // Always use compact mode (1 star) for simplicity
  stars.classList.add("compact-mode");

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
        margin-left: 4px;
        max-width: calc(100% - 4px);
        overflow: hidden;
        width: fit-content;
    `;

  // Create simple text that will shrink with ellipses
  const notFoundText = document.createElement("span");
  notFoundText.textContent = "Add to PolyRatings";
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

  return notFoundContainer;
}

// Function to inject rating UI next to professor name (mobile approach)
function injectRatingUI(professorElement, professor, profIndex = 0) {
  const professorName = professor.name;

  // First, remove any existing rating elements for this professor to prevent duplicates
  const existingRatings = professorElement.querySelectorAll(
    `.polyratings-rating-element[data-professor="${professorName}"]`
  );
  existingRatings.forEach((rating) => rating.remove());

  console.log(`🎨 Injecting mobile rating UI for: ${professorName}`);

  // Create the rating element
  const ratingElement = createRatingElement(professor);
  ratingElement.setAttribute("data-professor", professorName);

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
    `✅ Successfully injected mobile rating UI for: ${professorName}`
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

  // Inject with slightly more height while keeping everything aligned
  const originalText = professorNameElement.textContent.trim();

  // Get the parent cell and the expansion panel row to set consistent height
  const parentCell = professorNameElement.closest(".cx-MuiGrid-grid-xs-4");
  const expansionPanel = professorNameElement.closest(
    ".cx-MuiExpansionPanel-root"
  );
  const expansionSummary = professorNameElement.closest(
    ".cx-MuiExpansionPanelSummary-root"
  );

  if (parentCell && expansionPanel && expansionSummary) {
    // Set height for the expansion panel summary (the actual row) - increased height
    expansionSummary.style.minHeight = "80px";
    expansionSummary.style.height = "80px";

    // Set height for the main grid container within the expansion panel
    const mainGrid = expansionSummary.querySelector(
      ".cx-MuiGrid-container.cx-MuiGrid-wrap-xs-nowrap"
    );
    if (mainGrid) {
      mainGrid.style.minHeight = "80px";
      mainGrid.style.height = "80px";
    }

    // Set height for all cells in this row with proper alignment
    const allCells = expansionSummary.querySelectorAll(".cx-MuiGrid-item");
    allCells.forEach((cell) => {
      cell.style.minHeight = "80px";
      cell.style.height = "80px";
      cell.style.display = "flex";
      cell.style.alignItems = "flex-start"; // Changed to flex-start for better alignment
      cell.style.padding = "8px 6px"; // Adjusted padding
    });

    // Special alignment for specific columns that need to match instructor column
    const specificCells = expansionSummary.querySelectorAll(".cx-MuiGrid-item");
    specificCells.forEach((cell, index) => {
      // Target the first few columns (section, topic, unreserved, reserved seats)
      if (index < 4) {
        cell.style.alignItems = "center";
        cell.style.paddingTop = "8px";
        cell.style.paddingBottom = "8px";

        // Target the inner typography elements that have center alignment
        const typographyElements = cell.querySelectorAll(
          ".cx-MuiTypography-alignCenter"
        );
        typographyElements.forEach((typography) => {
          typography.style.display = "flex";
          typography.style.alignItems = "center";
          typography.style.justifyContent = "center";
          typography.style.height = "100%";
        });
      }
    });
  }

  // Create a container that uses the extra height
  const container = document.createElement("div");
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    justify-content: flex-start;
    align-items: flex-start;
  `;

  // Keep the original text with proper ellipsis handling
  const nameSpan = document.createElement("div");
  nameSpan.textContent = originalText;
  nameSpan.style.cssText = `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    max-width: 100%;
    line-height: 1.3;
    margin-bottom: 4px;
    margin-top: 2px;
  `;

  // Add the rating below with more space
  const ratingContainer = document.createElement("div");
  ratingContainer.style.cssText = `
    width: 100%;
    max-width: 100%;
    overflow: visible;
    flex-shrink: 0;
    margin-top: -1px;
    padding-top: 2px;
  `;
  ratingContainer.appendChild(ratingEl);

  container.appendChild(nameSpan);
  container.appendChild(ratingContainer);

  // Replace the content
  professorNameElement.innerHTML = "";
  professorNameElement.appendChild(container);

  console.log(
    `✅ Successfully injected desktop vertical rating UI for: ${professorName}`
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

  // Inject with slightly more height while keeping everything aligned
  const originalText = professorNameElement.textContent.trim();

  // Get the parent cell and the expansion panel row to set consistent height
  const parentCell = professorNameElement.closest(".cx-MuiGrid-grid-xs-4");
  const expansionPanel = professorNameElement.closest(
    ".cx-MuiExpansionPanel-root"
  );
  const expansionSummary = professorNameElement.closest(
    ".cx-MuiExpansionPanelSummary-root"
  );

  if (parentCell && expansionPanel && expansionSummary) {
    // Set height for the expansion panel summary (the actual row) - increased height
    expansionSummary.style.minHeight = "80px";
    expansionSummary.style.height = "80px";

    // Set height for the main grid container within the expansion panel
    const mainGrid = expansionSummary.querySelector(
      ".cx-MuiGrid-container.cx-MuiGrid-wrap-xs-nowrap"
    );
    if (mainGrid) {
      mainGrid.style.minHeight = "80px";
      mainGrid.style.height = "80px";
    }

    // Set height for all cells in this row with proper alignment
    const allCells = expansionSummary.querySelectorAll(".cx-MuiGrid-item");
    allCells.forEach((cell) => {
      cell.style.minHeight = "80px";
      cell.style.height = "80px";
      cell.style.display = "flex";
      cell.style.alignItems = "flex-start"; // Changed to flex-start for better alignment
      cell.style.padding = "8px 6px"; // Adjusted padding
    });

    // Special alignment for specific columns that need to match instructor column
    const specificCells = expansionSummary.querySelectorAll(".cx-MuiGrid-item");
    specificCells.forEach((cell, index) => {
      // Target the first few columns (section, topic, unreserved, reserved seats)
      if (index < 4) {
        cell.style.alignItems = "center";
        cell.style.paddingTop = "8px";
        cell.style.paddingBottom = "8px";

        // Target the inner typography elements that have center alignment
        const typographyElements = cell.querySelectorAll(
          ".cx-MuiTypography-alignCenter"
        );
        typographyElements.forEach((typography) => {
          typography.style.display = "flex";
          typography.style.alignItems = "center";
          typography.style.justifyContent = "center";
          typography.style.height = "100%";
        });
      }
    });
  }

  // Create a container that uses the extra height
  const container = document.createElement("div");
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    justify-content: flex-start;
    align-items: flex-start;
  `;

  // Keep the original text with proper ellipsis handling
  const nameSpan = document.createElement("div");
  nameSpan.textContent = originalText;
  nameSpan.style.cssText = `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    max-width: 100%;
    line-height: 1.3;
    margin-bottom: 4px;
    margin-top: 2px;
  `;

  // Add the not found badge below with more space
  const notFoundContainer = document.createElement("div");
  notFoundContainer.style.cssText = `
    width: 100%;
    max-width: 100%;
    overflow: visible;
    flex-shrink: 0;
    margin-top: -1px;
    padding-top: 2px;
  `;
  notFoundContainer.appendChild(notFoundEl);

  container.appendChild(nameSpan);
  container.appendChild(notFoundContainer);

  // Replace the content
  professorNameElement.innerHTML = "";
  professorNameElement.appendChild(container);

  console.log(
    `✅ Successfully injected desktop vertical not found UI for: ${professorName}`
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

// Core function to find and process professors (FIXED to prevent duplicates)
function findAndLogProfessors() {
  console.log("🔍 Starting professor search in iframe...");

  // Only clean up if we actually need to re-process
  // Check if we already have ratings for current professors
  const currentProfessors = document.querySelectorAll('[role="cell"]');
  const hasExistingRatings =
    document.querySelectorAll(".polyratings-rating-element").length > 0;

  if (hasExistingRatings) {
    console.log(
      "⏭️ Ratings already exist, skipping cleanup to prevent flickering"
    );
    return;
  }

  // First, clean up any existing rating elements to prevent duplicates
  const existingRatings = document.querySelectorAll(
    ".polyratings-rating-element"
  );
  existingRatings.forEach((rating) => rating.remove());
  console.log(
    `🧹 Cleaned up ${existingRatings.length} existing rating elements`
  );

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
                // First remove any existing not found badges for this professor
                const existingNotFound = nextElement.querySelectorAll(
                  `[data-professor="${professorName}"]`
                );
                existingNotFound.forEach((badge) => badge.remove());

                // Inject the "not found" badge
                const notFoundBadge = createNotFoundBadge(professorName);
                notFoundBadge.className = "polyratings-rating-element";
                notFoundBadge.setAttribute("data-professor", professorName);
                if (profIndex > 0) {
                  notFoundBadge.style.marginLeft = "12px";
                }
                nextElement.appendChild(notFoundBadge);
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
      }, 150); // Reduced delay for snappier response
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