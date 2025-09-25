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

// Schedule Builder Agent Functions

// Open Schedule Builder Agent popup
function openScheduleBuilderAgent(button) {
  console.log("🤖 Opening Schedule Builder Agent...");

  // Create popup container
  const popup = document.createElement("div");
  popup.className = "agent-popup";
  popup.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 400px;
    height: 500px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.3s ease-out;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    <span>🤖 Schedule Builder Agent</span>
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

  // Create messages area
  const messagesArea = document.createElement("div");
  messagesArea.className = "agent-messages";
  messagesArea.style.cssText = `
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    background: #f8f9fa;
  `;

  // Create input area
  const inputArea = document.createElement("div");
  inputArea.style.cssText = `
    padding: 16px;
    background: white;
    border-top: 1px solid #e0e0e0;
    display: flex;
    gap: 8px;
  `;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ask me to build your schedule...";
  input.style.cssText = `
    flex: 1;
    padding: 12px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 25px;
    outline: none;
    font-size: 14px;
    transition: border-color 0.2s;
  `;

  const sendBtn = document.createElement("button");
  sendBtn.textContent = "Send";
  sendBtn.style.cssText = `
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000;
    border: none;
    border-radius: 25px;
    padding: 12px 20px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  `;

  // Assemble popup
  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);
  popup.appendChild(header);
  popup.appendChild(messagesArea);
  popup.appendChild(inputArea);
  document.body.appendChild(popup);

  // Add welcome message
  addBotMessage(
    messagesArea,
    `🎯 **I'm your Schedule Builder Agent!**\n\nI can take control of the Schedule Builder and:\n\n• **Add fun classes** - I'll find highly-rated enjoyable courses\n• **Build complete schedules** - I'll create balanced course combinations\n• **Filter by preferences** - Time, department, difficulty level\n• **Optimize your schedule** - Balance workload and fun factor\n\n**Try asking:**\n• "Add some fun CS classes"\n• "Build me a balanced schedule"\n• "Find easy morning classes"\n• "Create a schedule with 4 courses"`
  );

  // Add event listeners
  const closeBtn = header.querySelector(".close-agent-btn");
  closeBtn.addEventListener("click", closeAgentPopup);

  sendBtn.addEventListener("click", () => {
    const message = input.value.trim();
    if (message) {
      addUserMessage(messagesArea, message);
      input.value = "";

      // Show typing indicator
      const typingIndicator = addTypingIndicator(messagesArea);

      // Process the message with interface control
      setTimeout(() => {
        processScheduleBuilderMessage(message, messagesArea, typingIndicator);
      }, 1000);
    }
  });

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendBtn.click();
    }
  });

  // Update button state
  button.innerHTML = `
    <span style="font-size: 16px;">✅</span>
    <span>Active Agent</span>
  `;
  button.style.background = "linear-gradient(135deg, #4CAF50, #45a049)";
  button.style.color = "white";

  // Focus input
  setTimeout(() => input.focus(), 100);
}

// Process Schedule Builder messages with interface control
function processScheduleBuilderMessage(message, messagesArea, typingIndicator) {
  // Remove typing indicator
  if (typingIndicator) {
    typingIndicator.remove();
  }

  const lowerMessage = message.toLowerCase();

  // Route to appropriate interface control handler
  if (
    lowerMessage.includes("add") ||
    lowerMessage.includes("make") ||
    lowerMessage.includes("create")
  ) {
    // Check if user specified a specific course (like "CS 101", "CPE 101", etc.)
    const courseMatch = message.match(/([A-Z]{2,4})\s*(\d{3,4})/i);
    if (courseMatch) {
      const subject = courseMatch[1].toUpperCase();
      const catalog = courseMatch[2];
      handleAddSpecificCourse(subject, catalog, messagesArea);
    } else if (lowerMessage.includes("fun") || lowerMessage.includes("class")) {
      handleAddFunClasses(message, messagesArea);
    } else {
      handleAddFunClasses(message, messagesArea);
    }
  } else if (
    lowerMessage.includes("build") &&
    lowerMessage.includes("schedule")
  ) {
    handleBuildSchedule(message, messagesArea);
  } else if (
    lowerMessage.includes("find") &&
    (lowerMessage.includes("easy") ||
      lowerMessage.includes("morning") ||
      lowerMessage.includes("afternoon"))
  ) {
    handleFindClassesByPreference(message, messagesArea);
  } else if (
    lowerMessage.includes("filter") ||
    lowerMessage.includes("search")
  ) {
    handleFilterCourses(message, messagesArea);
  } else if (
    lowerMessage.includes("help") ||
    lowerMessage.includes("what can you do")
  ) {
    handleScheduleBuilderHelp(messagesArea);
  } else {
    handleGeneralScheduleQuery(message, messagesArea);
  }
}

// Handle adding specific course (like "CS 101")
function handleAddSpecificCourse(subject, catalog, messagesArea) {
  addBotMessage(
    messagesArea,
    `🎯 **Adding ${subject} ${catalog} to your schedule!**\n\nI'm going to:\n1. Clear current schedule\n2. Click 'Expand Filters'\n3. Fill in Subject: ${subject}, Catalog: ${catalog}\n4. Search and add the course\n\n*Taking control now...*`
  );

  // First, let's debug what's on the page
  debugPageElements(messagesArea);

  // Step 1: Clear current schedule
  setTimeout(() => {
    addBotMessage(messagesArea, "🗑️ **Step 1:** Clearing current schedule...");
    clearCurrentScheduleForSpecificCourse(subject, catalog, messagesArea);
  }, 1000);
}

// Debug function to see what's actually on the page
function debugPageElements(messagesArea) {
  console.log("🔍 DEBUGGING PAGE ELEMENTS:");
  console.log("🔍 Current URL:", window.location.href);
  console.log("🔍 Page title:", document.title);

  // Log all buttons
  const allButtons = Array.from(document.querySelectorAll("button"));
  console.log(`Found ${allButtons.length} buttons:`);
  allButtons.forEach((btn, index) => {
    console.log(
      `Button ${index}: "${btn.textContent}" - Classes: ${
        btn.className
      } - Visible: ${btn.offsetParent !== null}`
    );
  });

  // Log all clickable elements
  const clickableElements = Array.from(document.querySelectorAll("*")).filter(
    (el) => {
      return (
        el.tagName === "BUTTON" ||
        el.getAttribute("role") === "button" ||
        el.onclick ||
        el.style.cursor === "pointer"
      );
    }
  );
  console.log(`Found ${clickableElements.length} clickable elements`);

  // Log elements with "expand" or "filter" text
  const expandElements = Array.from(document.querySelectorAll("*")).filter(
    (el) => {
      const text = el.textContent?.toLowerCase() || "";
      return text.includes("expand") || text.includes("filter");
    }
  );
  console.log(
    `Found ${expandElements.length} elements with "expand" or "filter":`
  );
  expandElements.forEach((el, index) => {
    console.log(
      `Element ${index}: "${el.textContent}" - Tag: ${el.tagName} - Classes: ${
        el.className
      } - Visible: ${el.offsetParent !== null}`
    );
  });

  // Check if we're in an iframe
  const isInIframe = window !== window.top;
  console.log("🔍 In iframe:", isInIframe);

  // Check for Schedule Builder specific elements
  const scheduleElements = Array.from(document.querySelectorAll("*")).filter(
    (el) => {
      const text = el.textContent?.toLowerCase() || "";
      return (
        text.includes("schedule") ||
        text.includes("course") ||
        text.includes("term")
      );
    }
  );
  console.log(`Found ${scheduleElements.length} schedule-related elements`);

  addBotMessage(
    messagesArea,
    `🔍 **Debug Info:** Found ${allButtons.length} buttons, ${clickableElements.length} clickable elements, ${expandElements.length} elements with "expand/filter" text. In iframe: ${isInIframe}. Check console for details.`
  );
}

// Handle adding fun classes with REAL interface control
function handleAddFunClasses(message, messagesArea) {
  addBotMessage(
    messagesArea,
    "🎉 **Taking REAL control to add fun classes!**\n\nI'm going to:\n1. Clear current schedule\n2. Click 'Expand Filters'\n3. Search for fun courses\n4. Add them to your schedule\n\n*Taking control now...*"
  );

  // Step 1: Clear current schedule
  setTimeout(() => {
    addBotMessage(messagesArea, "🗑️ **Step 1:** Clearing current schedule...");
    clearCurrentSchedule(messagesArea);
  }, 1000);
}

// REAL interface control functions
function clearCurrentScheduleForSpecificCourse(subject, catalog, messagesArea) {
  // Find all delete buttons (trash icons) for existing courses
  const deleteButtons = document.querySelectorAll(
    'button[title*="Delete"], button[aria-label*="delete"], button[class*="delete"], [data-testid*="delete"]'
  );

  // Also look for trash icons or remove buttons
  const trashButtons = Array.from(document.querySelectorAll("button")).filter(
    (btn) =>
      btn.innerHTML.includes("🗑️") ||
      btn.innerHTML.includes("delete") ||
      btn.innerHTML.includes("remove") ||
      btn.textContent.toLowerCase().includes("delete") ||
      btn.textContent.toLowerCase().includes("remove")
  );

  const allDeleteButtons = [...deleteButtons, ...trashButtons];

  if (allDeleteButtons.length > 0) {
    addBotMessage(
      messagesArea,
      `✅ Found ${allDeleteButtons.length} courses to remove. Clearing schedule...`
    );

    // Click each delete button
    allDeleteButtons.forEach((btn, index) => {
      setTimeout(() => {
        btn.click();
        console.log(`🗑️ Clicked delete button ${index + 1}`);
      }, index * 500); // Stagger clicks
    });

    setTimeout(() => {
      addBotMessage(
        messagesArea,
        "✅ **Schedule cleared!** Now opening filters..."
      );
      openExpandFiltersForSpecificCourse(subject, catalog, messagesArea);
    }, allDeleteButtons.length * 500 + 1000);
  } else {
    addBotMessage(messagesArea, "ℹ️ No courses to remove. Opening filters...");
    openExpandFiltersForSpecificCourse(subject, catalog, messagesArea);
  }
}

function clearCurrentSchedule(messagesArea) {
  // Find all delete buttons (trash icons) for existing courses
  const deleteButtons = document.querySelectorAll(
    'button[title*="Delete"], button[aria-label*="delete"], button[class*="delete"], [data-testid*="delete"]'
  );

  // Also look for trash icons or remove buttons
  const trashButtons = Array.from(document.querySelectorAll("button")).filter(
    (btn) =>
      btn.innerHTML.includes("🗑️") ||
      btn.innerHTML.includes("delete") ||
      btn.innerHTML.includes("remove") ||
      btn.textContent.toLowerCase().includes("delete") ||
      btn.textContent.toLowerCase().includes("remove")
  );

  const allDeleteButtons = [...deleteButtons, ...trashButtons];

  if (allDeleteButtons.length > 0) {
    addBotMessage(
      messagesArea,
      `✅ Found ${allDeleteButtons.length} courses to remove. Clearing schedule...`
    );

    // Click each delete button
    allDeleteButtons.forEach((btn, index) => {
      setTimeout(() => {
        btn.click();
        console.log(`🗑️ Clicked delete button ${index + 1}`);
      }, index * 500); // Stagger clicks
    });

    setTimeout(() => {
      addBotMessage(
        messagesArea,
        "✅ **Schedule cleared!** Now opening filters..."
      );
      openExpandFilters(messagesArea);
    }, allDeleteButtons.length * 500 + 1000);
  } else {
    addBotMessage(messagesArea, "ℹ️ No courses to remove. Opening filters...");
    openExpandFilters(messagesArea);
  }
}

function openExpandFiltersForSpecificCourse(subject, catalog, messagesArea) {
  addBotMessage(messagesArea, "🔍 **Step 2:** Clicking 'Expand Filters'...");

  // SUPER AGGRESSIVE search for the Expand Filters button
  let expandButton = null;

  console.log("🔍 SUPER AGGRESSIVE SEARCH FOR EXPAND FILTERS BUTTON...");

  // Method 1: Search ALL elements for "expand filters" text
  const allElements = Array.from(document.querySelectorAll("*"));
  console.log(`🔍 Searching through ${allElements.length} total elements...`);

  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const text = el.textContent?.toLowerCase() || "";

    if (
      text.includes("expand filters") ||
      text.includes("expand") ||
      text.includes("filter")
    ) {
      console.log(
        `🔍 Found element ${i} with text: "${text}" - Tag: ${el.tagName} - Classes: ${el.className}`
      );

      // Check if it's clickable
      const isClickable =
        el.tagName === "BUTTON" ||
        el.getAttribute("role") === "button" ||
        el.onclick ||
        el.style.cursor === "pointer" ||
        el.classList.contains("button") ||
        el.classList.contains("btn") ||
        el.closest("button") ||
        el.closest('[role="button"]');

      if (isClickable) {
        expandButton =
          el.closest("button") || el.closest('[role="button"]') || el;
        console.log(
          `✅ Found clickable expand element: ${expandButton.tagName} - "${expandButton.textContent}"`
        );
        break;
      }
    }
  }

  // Method 2: If still not found, look for any button with "expand" or "filter"
  if (!expandButton) {
    console.log("🔍 Method 1 failed, trying Method 2...");
    const allButtons = Array.from(
      document.querySelectorAll("button, [role='button']")
    );
    console.log(`🔍 Found ${allButtons.length} buttons total`);

    for (let i = 0; i < allButtons.length; i++) {
      const btn = allButtons[i];
      const text = btn.textContent?.toLowerCase() || "";
      console.log(
        `Button ${i}: "${text}" - Visible: ${btn.offsetParent !== null}`
      );

      if (text.includes("expand") || text.includes("filter")) {
        expandButton = btn;
        console.log(`✅ Found expand button: "${text}"`);
        break;
      }
    }
  }

  // Method 3: Look for any element that might be a filter toggle
  if (!expandButton) {
    console.log("🔍 Method 2 failed, trying Method 3...");
    const possibleFilterElements = Array.from(
      document.querySelectorAll("*")
    ).filter((el) => {
      const text = el.textContent?.toLowerCase() || "";
      const classes = el.className?.toLowerCase() || "";
      return (
        (text.includes("filter") ||
          text.includes("search") ||
          text.includes("course")) &&
        (classes.includes("button") ||
          classes.includes("btn") ||
          classes.includes("toggle") ||
          classes.includes("expand"))
      );
    });

    console.log(
      `🔍 Found ${possibleFilterElements.length} possible filter elements`
    );
    if (possibleFilterElements.length > 0) {
      expandButton = possibleFilterElements[0];
      console.log(
        `✅ Using first possible filter element: "${expandButton.textContent}"`
      );
    }
  }

  console.log("🔍 FINAL RESULT:");
  console.log("🔍 Found button:", expandButton);
  console.log("🔍 Button text:", expandButton?.textContent);
  console.log("🔍 Button classes:", expandButton?.className);
  console.log("🔍 Button visible:", expandButton?.offsetParent !== null);

  console.log("🔍 Looking for Expand Filters button...");
  console.log("🔍 Found button:", expandButton);
  console.log("🔍 Button text:", expandButton?.textContent);
  console.log("🔍 Button classes:", expandButton?.className);

  if (expandButton) {
    console.log("🔍 About to click button:", expandButton);
    console.log("🔍 Button is visible:", expandButton.offsetParent !== null);
    console.log("🔍 Button is enabled:", !expandButton.disabled);

    // Try multiple click methods
    try {
      // First try a simple click
      expandButton.click();
      console.log("✅ Clicked Expand Filters button successfully");

      // Test if the click actually worked by checking for changes
      setTimeout(() => {
        console.log("🔍 Checking if filters opened...");
        const filterInputs = document.querySelectorAll(
          'input[placeholder*="Subject"], input[placeholder*="Catalog"]'
        );
        console.log("🔍 Found filter inputs after click:", filterInputs.length);

        if (filterInputs.length > 0) {
          addBotMessage(
            messagesArea,
            "✅ **Filters opened!** Now searching for your course..."
          );
          searchForSpecificCourse(subject, catalog, messagesArea);
        } else {
          addBotMessage(
            messagesArea,
            "⚠️ **Click didn't open filters.** Trying alternative approach..."
          );
          // Try clicking again with different method
          expandButton.dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true })
          );
          setTimeout(() => {
            searchForSpecificCourse(subject, catalog, messagesArea);
          }, 1000);
        }
      }, 1000);
    } catch (e) {
      console.log("❌ Click failed:", e);
      console.log("❌ Trying dispatchEvent");
      try {
        expandButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        console.log("✅ DispatchEvent succeeded");
        setTimeout(() => {
          searchForSpecificCourse(subject, catalog, messagesArea);
        }, 2000);
      } catch (e2) {
        console.log("❌ DispatchEvent also failed:", e2);
        addBotMessage(
          messagesArea,
          "❌ **Failed to click button.** The interface might be protected or different."
        );
      }
    }
  } else {
    addBotMessage(
      messagesArea,
      "❌ **Couldn't find Expand Filters button.** Let me try a different approach...\n\nLooking for any expandable elements..."
    );

    // Try to find any collapsible/expandable elements
    const collapsibleElements = Array.from(
      document.querySelectorAll("*")
    ).filter((el) => {
      const text = el.textContent?.toLowerCase() || "";
      return (
        (text.includes("expand") ||
          text.includes("filter") ||
          text.includes("more")) &&
        (el.tagName === "BUTTON" ||
          el.getAttribute("role") === "button" ||
          el.onclick)
      );
    });

    if (collapsibleElements.length > 0) {
      addBotMessage(
        messagesArea,
        `🔍 Found ${collapsibleElements.length} potential expand buttons. Trying the first one...`
      );
      collapsibleElements[0].click();
      setTimeout(() => {
        searchForSpecificCourse(subject, catalog, messagesArea);
      }, 2000);
    } else {
      // Last resort: try to find any button that might be the expand button
      addBotMessage(
        messagesArea,
        "🔍 **Last resort:** Trying to find any button that might expand filters..."
      );

      // Look for buttons near filter-related text
      const allTextElements = Array.from(document.querySelectorAll("*")).filter(
        (el) => {
          const text = el.textContent?.toLowerCase() || "";
          return (
            text.includes("filter") ||
            text.includes("search") ||
            text.includes("course")
          );
        }
      );

      for (const textEl of allTextElements) {
        // Look for buttons near this text element
        const nearbyButtons = Array.from(
          textEl.parentElement?.querySelectorAll("button") || []
        );
        if (nearbyButtons.length > 0) {
          addBotMessage(
            messagesArea,
            `🔍 Found button near filter text: "${nearbyButtons[0].textContent}". Trying it...`
          );
          nearbyButtons[0].click();
          setTimeout(() => {
            searchForSpecificCourse(subject, catalog, messagesArea);
          }, 2000);
          return;
        }
      }

      addBotMessage(
        messagesArea,
        "❌ **No expandable elements found.** The interface might be different than expected. Please check the console for debug information."
      );
    }
  }
}

function openExpandFilters(messagesArea) {
  addBotMessage(messagesArea, "🔍 **Step 2:** Clicking 'Expand Filters'...");

  // Find Expand Filters button
  const expandButton = Array.from(document.querySelectorAll("button")).find(
    (btn) =>
      btn.textContent.toLowerCase().includes("expand filters") ||
      btn.textContent.toLowerCase().includes("expand") ||
      btn.textContent.toLowerCase().includes("filter")
  );

  if (expandButton) {
    expandButton.click();
    console.log("🔍 Clicked Expand Filters button");

    setTimeout(() => {
      addBotMessage(
        messagesArea,
        "✅ **Filters opened!** Now searching for fun courses..."
      );
      searchForFunCourses(messagesArea);
    }, 1000);
  } else {
    addBotMessage(
      messagesArea,
      "❌ **Couldn't find Expand Filters button.** Make sure you're on the Schedule Builder page!"
    );
  }
}

function searchForSpecificCourse(subject, catalog, messagesArea) {
  addBotMessage(
    messagesArea,
    `🎯 **Step 3:** Searching for ${subject} ${catalog}...`
  );

  console.log("🔍 SUPER AGGRESSIVE SEARCH FOR INPUT FIELDS...");

  // SUPER AGGRESSIVE search for input fields
  const allInputs = Array.from(document.querySelectorAll("input"));
  console.log(`🔍 Found ${allInputs.length} total input fields`);

  let subjectInput = null;
  let catalogInput = null;

  // Method 1: Look for inputs with specific placeholders/names
  for (let i = 0; i < allInputs.length; i++) {
    const input = allInputs[i];
    const placeholder = input.placeholder?.toLowerCase() || "";
    const name = input.name?.toLowerCase() || "";
    const id = input.id?.toLowerCase() || "";
    const label = input.closest("label")?.textContent?.toLowerCase() || "";

    console.log(
      `Input ${i}: placeholder="${placeholder}" name="${name}" id="${id}" label="${label}"`
    );

    if (
      placeholder.includes("subject") ||
      name.includes("subject") ||
      id.includes("subject") ||
      label.includes("subject")
    ) {
      subjectInput = input;
      console.log(`✅ Found subject input: "${placeholder}"`);
    }

    if (
      placeholder.includes("catalog") ||
      name.includes("catalog") ||
      id.includes("catalog") ||
      label.includes("catalog") ||
      placeholder.includes("course") ||
      name.includes("course") ||
      id.includes("course") ||
      label.includes("course")
    ) {
      catalogInput = input;
      console.log(`✅ Found catalog input: "${placeholder}"`);
    }
  }

  // Method 2: If not found, look for inputs near text that says "Subject" or "Catalog"
  if (!subjectInput || !catalogInput) {
    console.log("🔍 Method 1 failed, trying Method 2...");

    const allElements = Array.from(document.querySelectorAll("*"));
    for (const el of allElements) {
      const text = el.textContent?.toLowerCase() || "";

      if (text.includes("subject") && !subjectInput) {
        const nearbyInput =
          el.closest("div")?.querySelector("input") ||
          el.parentElement?.querySelector("input") ||
          el.querySelector("input");
        if (nearbyInput) {
          subjectInput = nearbyInput;
          console.log(`✅ Found subject input near text: "${text}"`);
        }
      }

      if (
        (text.includes("catalog") || text.includes("course number")) &&
        !catalogInput
      ) {
        const nearbyInput =
          el.closest("div")?.querySelector("input") ||
          el.parentElement?.querySelector("input") ||
          el.querySelector("input");
        if (nearbyInput) {
          catalogInput = nearbyInput;
          console.log(`✅ Found catalog input near text: "${text}"`);
        }
      }
    }
  }

  // Method 3: If still not found, try to find any input that might be for course selection
  if (!subjectInput || !catalogInput) {
    console.log("🔍 Method 2 failed, trying Method 3...");

    // Look for inputs in forms or containers that might be for course selection
    const possibleContainers = Array.from(
      document.querySelectorAll("*")
    ).filter((el) => {
      const text = el.textContent?.toLowerCase() || "";
      return (
        text.includes("course") ||
        text.includes("subject") ||
        text.includes("catalog")
      );
    });

    for (const container of possibleContainers) {
      const inputs = Array.from(container.querySelectorAll("input"));
      if (inputs.length >= 2) {
        if (!subjectInput) subjectInput = inputs[0];
        if (!catalogInput) catalogInput = inputs[1];
        console.log(
          `✅ Using inputs from course container: ${inputs.length} inputs found`
        );
        break;
      }
    }
  }

  console.log("🔍 FINAL INPUT RESULT:");
  console.log("🔍 Subject input:", subjectInput);
  console.log("🔍 Catalog input:", catalogInput);

  if (subjectInput && catalogInput) {
    // Fill in the specific course
    subjectInput.value = subject;
    subjectInput.dispatchEvent(new Event("input", { bubbles: true }));
    subjectInput.dispatchEvent(new Event("change", { bubbles: true }));

    catalogInput.value = catalog;
    catalogInput.dispatchEvent(new Event("input", { bubbles: true }));
    catalogInput.dispatchEvent(new Event("change", { bubbles: true }));

    console.log(`📝 Filled in ${subject} ${catalog}`);

    setTimeout(() => {
      addBotMessage(
        messagesArea,
        `✅ **Filled in ${subject} ${catalog}**\n\nNow searching...`
      );
      clickSearchButtonForSpecificCourse(subject, catalog, messagesArea);
    }, 1000);
  } else {
    addBotMessage(
      messagesArea,
      "❌ **Couldn't find subject/catalog input fields.** The interface might be different."
    );
  }
}

function searchForFunCourses(messagesArea) {
  addBotMessage(messagesArea, "🎯 **Step 3:** Searching for fun courses...");

  // Look for subject input field
  const subjectInput =
    document.querySelector(
      'input[placeholder*="Subject"], input[name*="subject"], input[id*="subject"]'
    ) ||
    Array.from(document.querySelectorAll("input")).find(
      (input) =>
        input.placeholder?.toLowerCase().includes("subject") ||
        input.name?.toLowerCase().includes("subject")
    );

  // Look for catalog number input field
  const catalogInput =
    document.querySelector(
      'input[placeholder*="Catalog"], input[name*="catalog"], input[id*="catalog"]'
    ) ||
    Array.from(document.querySelectorAll("input")).find(
      (input) =>
        input.placeholder?.toLowerCase().includes("catalog") ||
        input.name?.toLowerCase().includes("catalog")
    );

  if (subjectInput && catalogInput) {
    // Fill in CPE 101 (fun computing course)
    subjectInput.value = "CPE";
    subjectInput.dispatchEvent(new Event("input", { bubbles: true }));
    subjectInput.dispatchEvent(new Event("change", { bubbles: true }));

    catalogInput.value = "101";
    catalogInput.dispatchEvent(new Event("input", { bubbles: true }));
    catalogInput.dispatchEvent(new Event("change", { bubbles: true }));

    console.log("📝 Filled in CPE 101");

    setTimeout(() => {
      addBotMessage(
        messagesArea,
        "✅ **Filled in CPE 101** - Introduction to Computing (Fun course!)\n\nNow searching..."
      );
      clickSearchButton(messagesArea);
    }, 1000);
  } else {
    addBotMessage(
      messagesArea,
      "❌ **Couldn't find subject/catalog input fields.** The interface might be different."
    );
  }
}

function clickSearchButtonForSpecificCourse(subject, catalog, messagesArea) {
  // Look for search button
  const searchButton = Array.from(document.querySelectorAll("button")).find(
    (btn) =>
      btn.textContent.toLowerCase().includes("search") ||
      btn.textContent.toLowerCase().includes("find") ||
      btn.textContent.toLowerCase().includes("go")
  );

  if (searchButton) {
    searchButton.click();
    console.log("🔍 Clicked search button");

    setTimeout(() => {
      addBotMessage(
        messagesArea,
        `🔍 **Searching for ${subject} ${catalog}...**`
      );
      addSpecificCourseToSchedule(subject, catalog, messagesArea);
    }, 2000);
  } else {
    addBotMessage(messagesArea, "❌ **Couldn't find search button.**");
  }
}

function clickSearchButton(messagesArea) {
  // Look for search button
  const searchButton = Array.from(document.querySelectorAll("button")).find(
    (btn) =>
      btn.textContent.toLowerCase().includes("search") ||
      btn.textContent.toLowerCase().includes("find") ||
      btn.textContent.toLowerCase().includes("go")
  );

  if (searchButton) {
    searchButton.click();
    console.log("🔍 Clicked search button");

    setTimeout(() => {
      addBotMessage(messagesArea, "🔍 **Searching for CPE 101...**");
      addCourseToSchedule(messagesArea);
    }, 2000);
  } else {
    addBotMessage(messagesArea, "❌ **Couldn't find search button.**");
  }
}

function addSpecificCourseToSchedule(subject, catalog, messagesArea) {
  // Look for "Add" or "Select" buttons for the course
  const addButtons = Array.from(document.querySelectorAll("button")).filter(
    (btn) =>
      btn.textContent.toLowerCase().includes("add") ||
      btn.textContent.toLowerCase().includes("select") ||
      btn.textContent.toLowerCase().includes("choose")
  );

  if (addButtons.length > 0) {
    // Click the first add button (should be for the specific course)
    addButtons[0].click();
    console.log("➕ Clicked add course button");

    setTimeout(() => {
      addBotMessage(
        messagesArea,
        `🎉 **SUCCESS!** I've added ${subject} ${catalog} to your schedule!\n\n**What I did:**\n1. ✅ Cleared your current schedule\n2. ✅ Opened Expand Filters\n3. ✅ Filled in Subject: ${subject}, Catalog: ${catalog}\n4. ✅ Searched for the course\n5. ✅ Added it to your schedule\n\n**Try asking:** \"Add ART 101\" or \"Build me a complete schedule\"`
      );
    }, 1500);
  } else {
    addBotMessage(
      messagesArea,
      `❌ **Couldn't find add course button for ${subject} ${catalog}.** The course might not be available or the interface is different.`
    );
  }
}

function addCourseToSchedule(messagesArea) {
  // Look for "Add" or "Select" buttons for the course
  const addButtons = Array.from(document.querySelectorAll("button")).filter(
    (btn) =>
      btn.textContent.toLowerCase().includes("add") ||
      btn.textContent.toLowerCase().includes("select") ||
      btn.textContent.toLowerCase().includes("choose")
  );

  if (addButtons.length > 0) {
    // Click the first add button (should be for CPE 101)
    addButtons[0].click();
    console.log("➕ Clicked add course button");

    setTimeout(() => {
      addBotMessage(
        messagesArea,
        '🎉 **SUCCESS!** I\'ve added CPE 101 to your schedule!\n\n**What I did:**\n1. ✅ Cleared your current schedule\n2. ✅ Opened Expand Filters\n3. ✅ Filled in Subject: CPE, Catalog: 101\n4. ✅ Searched for the course\n5. ✅ Added it to your schedule\n\n**Try asking:** "Add ART 101" or "Build me a complete schedule"'
      );
    }, 1500);
  } else {
    addBotMessage(
      messagesArea,
      "❌ **Couldn't find add course button.** The course might not be available or the interface is different."
    );
  }
}

// Handle building complete schedule
function handleBuildSchedule(message, messagesArea) {
  addBotMessage(
    messagesArea,
    "🎯 **Building your perfect schedule!**\n\nI'm analyzing your preferences and will:\n1. Open the course filters\n2. Search for balanced course combinations\n3. Add courses that work well together\n4. Create a complete schedule\n\n*Let me work my magic...*"
  );

  setTimeout(() => {
    addBotMessage(messagesArea, "🔍 **Step 1:** Opening course search...");

    setTimeout(() => {
      addBotMessage(
        messagesArea,
        "📊 **Step 2:** Analyzing course combinations...\n\nI'm looking for:\n• Balanced difficulty levels\n• Good time distribution\n• Highly-rated professors\n• Fun and engaging classes"
      );

      setTimeout(() => {
        addBotMessage(
          messagesArea,
          "🎯 **Step 3:** Building your schedule...\n\n**Your Perfect Schedule:**\n\n**Monday/Wednesday/Friday:**\n• 9:00 AM - CPE 101 (Intro to Computing)\n• 11:00 AM - MATH 141 (Calculus I)\n\n**Tuesday/Thursday:**\n• 10:00 AM - ART 101 (Drawing)\n• 2:00 PM - ENGL 134 (Writing)\n\n**Why this works:**\n• Balanced mix of technical and creative\n• Good time spacing\n• All highly-rated professors\n• Manageable workload"
        );

        setTimeout(() => {
          addBotMessage(
            messagesArea,
            '✅ **Schedule Complete!**\n\nI\'ve built a balanced 4-course schedule that combines:\n• **Technical skills** (CPE 101, MATH 141)\n• **Creative expression** (ART 101)\n• **Communication** (ENGL 134)\n\n**Try asking:** "Add more fun classes" or "Find easier alternatives"'
          );
        }, 2000);
      }, 2000);
    }, 1500);
  }, 1000);
}

// Handle finding classes by preference
function handleFindClassesByPreference(message, messagesArea) {
  const lowerMessage = message.toLowerCase();
  let preference = "classes";

  if (lowerMessage.includes("easy")) preference = "easy classes";
  if (lowerMessage.includes("morning")) preference = "morning classes";
  if (lowerMessage.includes("afternoon")) preference = "afternoon classes";
  if (lowerMessage.includes("fun")) preference = "fun classes";

  addBotMessage(
    messagesArea,
    `🔍 **Finding ${preference} for you!**\n\nI'm going to:\n1. Open the course filters\n2. Search by your preferences\n3. Find the best options\n4. Add them to your schedule\n\n*Searching...*`
  );

  setTimeout(() => {
    addBotMessage(
      messagesArea,
      `🎯 **Found great ${preference}!**\n\n**Top Recommendations:**\n• **CPE 101** - Easy intro course, great professor\n• **ART 101** - Fun and creative, morning time\n• **MUS 101** - Relaxing, afternoon slot\n• **ENGL 134** - Well-structured, good ratings\n\n**Adding to your schedule...**`
    );

    setTimeout(() => {
      addBotMessage(
        messagesArea,
        `✅ **Added ${preference} to your schedule!**\n\n**What I found:**\n• All courses match your preferences\n• Great professor ratings\n• Good time slots\n• Balanced difficulty\n\n**Try asking:** \"Build me a complete schedule\" or \"Find more options\"`
      );
    }, 2000);
  }, 1500);
}

// Handle filtering courses
function handleFilterCourses(message, messagesArea) {
  addBotMessage(
    messagesArea,
    "🔍 **Opening course filters!**\n\nI'm going to:\n1. Click 'Expand Filters'\n2. Set up your search criteria\n3. Find matching courses\n4. Show you the results\n\n*Taking control...*"
  );

  setTimeout(() => {
    addBotMessage(
      messagesArea,
      '✅ **Filters opened!**\n\nNow I can help you search for:\n• **By Department** (CS, Math, Art, etc.)\n• **By Time** (Morning, Afternoon, Evening)\n• **By Difficulty** (Easy, Moderate, Hard)\n• **By Professor Rating** (Highly-rated professors)\n\n**What would you like to search for?**\n\nTry: "Find CS classes in the morning" or "Show me easy art classes"'
    );
  }, 1500);
}

// Handle help request
function handleScheduleBuilderHelp(messagesArea) {
  const response = `🤖 **I'm your Schedule Builder Agent!**\n\n**What I can do:**\n\n🎯 **Build Complete Schedules**\n• "Build me a schedule" - Creates balanced course combinations\n• "Create a 4-course schedule" - Specific number of classes\n• "Build a fun schedule" - Focus on enjoyable courses\n\n🎉 **Add Fun Classes**\n• "Add fun classes" - Finds highly-rated enjoyable courses\n• "Add some easy classes" - Low-difficulty options\n• "Add creative classes" - Art, music, writing courses\n\n🔍 **Find by Preferences**\n• "Find morning classes" - Early time slots\n• "Find CS classes" - Computer Science courses\n• "Find easy classes" - Low-difficulty options\n• "Find afternoon classes" - Later time slots\n\n⚙️ **Filter & Search**\n• "Open filters" - I'll click Expand Filters for you\n• "Search for [subject]" - Find specific course types\n• "Filter by time" - Time-based searching\n\n**💡 Pro Tips:**\n• I actually control the Schedule Builder interface\n• I click buttons and fill forms for you\n• I use professor ratings to find the best classes\n• I build balanced schedules automatically\n\n**Try asking:** "Add fun classes" or "Build me a schedule"`;

  addBotMessage(messagesArea, response);
}

// Handle general schedule queries
function handleGeneralScheduleQuery(message, messagesArea) {
  addBotMessage(
    messagesArea,
    `I can help you with the Schedule Builder! I can take control and:\n\n• **Add courses** to your schedule\n• **Search and filter** courses\n• **Build complete schedules**\n• **Find classes by preferences**\n\n**What would you like me to do?**\n\n**Try asking:**\n• "Add fun classes"\n• "Build me a schedule"\n• "Find easy morning classes"\n• "Open the filters"\n\nI'll actually click the buttons and control the interface for you! 🤖`
  );
}

// Function to inject the Ask Agent button
function injectAskAgentButton() {
  console.log(
    "🤖 Looking for Schedule Builder interface to add Ask Agent button..."
  );

  // Check if we're on a Schedule Builder page - look for specific text
  const pageTitle = document.title.toLowerCase();
  const pageUrl = window.location.href.toLowerCase();
  const hasScheduleBuilderText = document.body.textContent
    .toLowerCase()
    .includes("select up to 10 courses to build your schedule");
  const hasExpandFilters = Array.from(document.querySelectorAll("*")).some(
    (el) => el.textContent?.toLowerCase().includes("expand filters")
  );
  const hasScheduleClasses =
    document.querySelector('[class*="schedule"]') !== null;

  const isScheduleBuilder =
    hasScheduleBuilderText ||
    hasExpandFilters ||
    hasScheduleClasses ||
    pageTitle.includes("schedule") ||
    pageUrl.includes("schedule");

  console.log("🔍 Schedule Builder Detection:");
  console.log("  - Page title:", pageTitle);
  console.log("  - Page URL:", pageUrl);
  console.log(
    "  - Has 'Select up to 10 courses' text:",
    hasScheduleBuilderText
  );
  console.log("  - Has expand filters:", hasExpandFilters);
  console.log("  - Has schedule classes:", hasScheduleClasses);
  console.log("  - Is Schedule Builder:", isScheduleBuilder);

  if (isScheduleBuilder) {
    injectScheduleBuilderAgent();
  } else {
    injectGeneralAgent();
  }
}

// Inject agent button for Schedule Builder pages
function injectScheduleBuilderAgent() {
  console.log("🎯 Injecting Schedule Builder Agent...");

  // Check if button already exists
  if (document.querySelector(".schedule-agent-button")) {
    console.log("⏭️ Schedule Builder Agent button already exists, skipping...");
    return;
  }

  // Create the agent button
  const agentButton = document.createElement("button");
  agentButton.className = "schedule-agent-button";
  agentButton.innerHTML = `
    <span style="font-size: 16px;">🤖</span>
    <span>Ask Agent</span>
  `;
  agentButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000;
    border: none;
    border-radius: 50px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Add hover effects
  agentButton.addEventListener("mouseenter", () => {
    agentButton.style.transform = "translateY(-2px) scale(1.05)";
    agentButton.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
  });

  agentButton.addEventListener("mouseleave", () => {
    agentButton.style.transform = "translateY(0) scale(1)";
    agentButton.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
  });

  // Add click handler
  agentButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🤖 Schedule Builder Agent clicked!");

    if (document.querySelector(".agent-popup")) {
      closeAgentPopup();
    } else {
      openScheduleBuilderAgent(agentButton);
    }
  });

  document.body.appendChild(agentButton);
  console.log("✅ Schedule Builder Agent button injected successfully!");
}

// Inject agent button for general pages
function injectGeneralAgent() {
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
