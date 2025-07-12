// PolyRatings Enhancer - Content Script
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

// Function to create rating UI element
function createRatingElement(professor) {
    const ratingContainer = document.createElement('span');
    ratingContainer.style.cssText = `
        display: inline-flex;
        align-items: center;
        margin-left: 8px;
        padding: 2px 6px;
        background: transparent;
        border: 1px solid #7F8A9E;
        border-radius: 12px;
        font-size: 12px;
        color: #090d19;
        text-decoration: none;
        transition: all 0.2s ease;
    `;
    
    // Create star rating - show 4 stars with partial filling using SVG
    const stars = document.createElement('span');
    stars.style.marginRight = '4px';
    
    // Calculate how many full stars and partial star percentage
    const fullStars = Math.floor(professor.rating);
    const partialStarPercentage = (professor.rating % 1) * 100;
    
    // Create SVG container
    const svgContainer = document.createElement('div');
    svgContainer.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 1px;
        vertical-align: middle;
    `;
    
    // Create 4 stars
    for (let i = 0; i < 4; i++) {
        const starContainer = document.createElement('div');
        starContainer.style.cssText = `
            position: relative;
            display: inline-block;
            width: 1.2em;
            height: 1.2em;
            vertical-align: top;
            margin-top: -3px;
        `;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 51 48');
        svg.style.cssText = `
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
        `;
        
        // Determine if this star should be filled, partially filled, or empty
        let fillPercentage = 0;
        if (i < fullStars) {
            fillPercentage = 100; // Fully filled
        } else if (i === fullStars && partialStarPercentage > 0) {
            fillPercentage = partialStarPercentage; // Partially filled
        }
        
        if (fillPercentage > 0) {
            // Create clip-path for partial filling
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            clipPath.setAttribute('id', `starClip${i}_${Date.now()}`);
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', '0');
            rect.setAttribute('y', '0');
            rect.setAttribute('width', `${fillPercentage}%`);
            rect.setAttribute('height', '100%');
            
            clipPath.appendChild(rect);
            defs.appendChild(clipPath);
            svg.appendChild(defs);
            
            // Background (empty) star
            const bgStar = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            bgStar.setAttribute('d', 'm25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z');
            bgStar.setAttribute('fill', '#FFFFFF');
            bgStar.setAttribute('stroke', '#B8860B');
            bgStar.setAttribute('stroke-width', '4');
            svg.appendChild(bgStar);
            
            // Foreground (filled) star with clip-path
            const fgStar = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            fgStar.setAttribute('d', 'm25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z');
            fgStar.setAttribute('fill', '#FFD700');
            fgStar.setAttribute('stroke', '#B8860B');
            fgStar.setAttribute('stroke-width', '4');
            fgStar.setAttribute('clip-path', `url(#starClip${i}_${Date.now()})`);
            svg.appendChild(fgStar);
        } else {
            // Empty star
            const star = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            star.setAttribute('d', 'm25,1 6,17h18l-14,11 5,17-15-10-15,10 5-17-14-11h18z');
            star.setAttribute('fill', '#FFFFFF');
            star.setAttribute('stroke', '#B8860B');
            star.setAttribute('stroke-width', '4');
            svg.appendChild(star);
        }
        
        starContainer.appendChild(svg);
        svgContainer.appendChild(starContainer);
    }
    
    stars.appendChild(svgContainer);
    
    // Create rating text
    const ratingText = document.createElement('span');
    ratingText.textContent = `${professor.rating}/4`;
    ratingText.style.marginRight = '6px';
    
    ratingContainer.appendChild(ratingText);
    ratingContainer.appendChild(stars);
    
    // Make it a link
    ratingContainer.style.cursor = 'pointer';
    ratingContainer.title = `View ${professor.name}'s profile on PolyRatings`;
    
    // Add hover effects
    ratingContainer.addEventListener('mouseenter', () => {
        ratingContainer.style.background = 'rgba(21, 71, 52, 0.12)';
        ratingContainer.style.borderColor = '#154734';
    });
    
    ratingContainer.addEventListener('mouseleave', () => {
        ratingContainer.style.background = 'transparent';
        ratingContainer.style.borderColor = '#7F8A9E';
    });
    
    // Add click handler to open the professor's profile
    ratingContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(professor.link, '_blank');
    });
    
    return ratingContainer;
}

// Function to create "not found" badge
function createNotFoundBadge(professorName) {
    const notFoundContainer = document.createElement('span');
    notFoundContainer.style.cssText = `
        display: inline-flex;
        align-items: center;
        margin-left: 8px;
        padding: 2px 6px;
        background: transparent;
        border: 1px solid #7F8A9E;
        border-radius: 12px;
        font-size: 12px;
        color: #090d19;
        text-decoration: none;
        transition: all 0.2s ease;
        cursor: pointer;
    `;
    
    // Create the text
    const notFoundText = document.createElement('span');
    notFoundText.textContent = 'Add to PolyRatings';
    
    notFoundContainer.appendChild(notFoundText);
    
    // Add hover effects
    notFoundContainer.addEventListener('mouseenter', () => {
        notFoundContainer.style.background = 'rgba(21, 71, 52, 0.12)';
        notFoundContainer.style.borderColor = '#154734';
    });
    
    notFoundContainer.addEventListener('mouseleave', () => {
        notFoundContainer.style.background = 'transparent';
        notFoundContainer.style.borderColor = '#7F8A9E';
    });
    
    // Add click handler to open the add professor page
    notFoundContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const encodedName = encodeURIComponent(professorName);
        window.open(`https://polyratings.dev/new-professor?name=${encodedName}`, '_blank');
    });
    
    notFoundContainer.title = `Add ${professorName} to PolyRatings`;
    
    return notFoundContainer;
}

// Function to inject rating UI next to professor name (mobile approach)
function injectRatingUI(professorElement, professor, profIndex = 0) {
    // Check if we've already processed this professor
    const professorName = professor.name;
    
    // Create a unique cache key for this specific DOM element instance
    const currentUrl = window.location.href;
    const elementText = professorElement.textContent.trim();
    const elementPath = getElementPath(professorElement);
    const cacheKey = `${professorName}-${currentUrl}-${elementPath}-${profIndex}`;
    
    if (processedProfessors.has(cacheKey)) {
        console.log(`⏭️ Already processed professor: ${professorName} at this specific location`);
        return;
    }
    
    // Check if rating element already exists for this professor in this specific element
    const existingRating = professorElement.querySelector(`.polyratings-rating[data-professor="${professorName}"]`);
    if (existingRating) {
        console.log(`⏭️ Rating already exists for: ${professorName} in this element`);
        return;
    }
    
    console.log(`🎨 Injecting rating UI for: ${professorName}`);
    
    // Create the rating element
    const ratingElement = createRatingElement(professor);
    ratingElement.className = 'polyratings-rating';
    ratingElement.setAttribute('data-professor', professorName);
    
    // Add extra margin for multiple professors (except the first one)
    if (profIndex > 0) {
        ratingElement.style.marginLeft = '12px';
    }
    
    // Insert the rating element directly after the professor name text
    professorElement.appendChild(ratingElement);
    
    // Mark as processed
    processedProfessors.add(cacheKey);
    
    console.log(`✅ Successfully injected rating UI for: ${professorName}`);
}

// Function to inject rating UI for desktop approach
function injectDesktopRatingUI(professorNameElement, professor) {
    // Check if we've already processed this professor
    const professorName = professor.name;
    
    // Create a unique cache key for desktop approach
    const currentUrl = window.location.href;
    const elementPath = getElementPath(professorNameElement);
    const cacheKey = `desktop-${professorName}-${currentUrl}-${elementPath}`;
    
    if (processedProfessors.has(cacheKey)) {
        console.log(`⏭️ Already processed desktop professor: ${professorName} at this specific location`);
        return;
    }
    
    // Check if rating element already exists for this professor in this specific element
    const existingRating = professorNameElement.querySelector(`.polyratings-rating[data-professor="${professorName}"]`);
    if (existingRating) {
        console.log(`⏭️ Desktop rating already exists for: ${professorName} in this element`);
        return;
    }
    
    console.log(`🎨 Injecting desktop rating UI for: ${professorName}`);
    
    // Create the rating element (reuse existing function)
    const ratingElement = createRatingElement(professor);
    ratingElement.className = 'polyratings-rating';
    ratingElement.setAttribute('data-professor', professorName);
    
    // Fix the container to accommodate the rating within grid constraints
    // Keep the noWrap class but adjust the container to show both name and rating
    professorNameElement.style.cssText += `
        display: flex;
        align-items: center;
        flex-wrap: nowrap;
        min-width: 0;
        overflow: visible;
        white-space: nowrap;
    `;
    
    // Also adjust the parent grid cell to accommodate the rating
    const parentGridCell = professorNameElement.closest('.cx-MuiGrid-grid-xs-4');
    if (parentGridCell) {
        parentGridCell.style.cssText += `
            min-width: 0;
            overflow: visible;
            flex-shrink: 0;
        `;
    }
    
    // Insert the rating element directly after the professor name text
    professorNameElement.appendChild(ratingElement);
    
    // Mark as processed
    processedProfessors.add(cacheKey);
    
    console.log(`✅ Successfully injected desktop rating UI for: ${professorName}`);
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
            const classes = Array.from(current.classList).join('.');
            selector += `.${classes}`;
        }
        
        // Add position among siblings
        const siblings = Array.from(current.parentNode.children);
        const index = siblings.indexOf(current);
        selector += `:nth-child(${index + 1})`;
        
        path.unshift(selector);
        current = current.parentNode;
    }
    
    return path.join(' > ');
}

// Core function to find and process professors
function findAndLogProfessors() {
    console.log("🔍 Starting professor search in iframe...");
    
    // Step 1: Try mobile approach first
    const dtElements = document.querySelectorAll('dt');
    console.log(`📋 Found ${dtElements.length} dt elements in iframe`);
    
    let professorCount = 0;
    let mobileApproachFound = false;
    
    dtElements.forEach((dt, index) => {
        const dtText = dt.textContent.trim();
        console.log(`📝 dt[${index}]: "${dtText}"`);
        
        if (dtText === 'Instructor:') {
            console.log(`✅ Found "Instructor:" at index ${index}`);
            mobileApproachFound = true;
            
            const nextElement = dt.nextElementSibling;
            if (nextElement) {
                const instructorText = nextElement.textContent.trim();
                console.log(`👨‍🏫 Found Instructor text: ${instructorText}`);
                
                // Split by comma to handle multiple instructors
                const professorNames = instructorText.split(',').map(name => name.trim()).filter(name => name.length > 0);
                console.log(`📋 Parsed professor names:`, professorNames);
                
                // Process each professor individually
                professorNames.forEach((professorName, profIndex) => {
                    console.log(`👨‍🏫 Processing professor ${profIndex + 1}: ${professorName}`);
                    
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
                                // Inject the "not found" badge
                                const notFoundBadge = createNotFoundBadge(professorName);
                                nextElement.appendChild(notFoundBadge);
                            } else {
                                console.log("❌ Error getting professor data:", response.message);
                            }
                        }
                    );
                    
                    professorCount++;
                });
            } else {
                console.log(`❌ No next element found for instructor at index ${index}`);
            }
        }
    });
    
    // Step 2a: If mobile approach didn't find anything, try desktop approach
    if (!mobileApproachFound) {
        console.log("📱 Mobile approach found no professors, trying desktop approach...");
        
        // Find the outermost grid container
        const mainGridContainers = document.querySelectorAll('.cx-MuiGrid-container.cx-MuiGrid-wrap-xs-nowrap');
        console.log(`🖥️ Found ${mainGridContainers.length} main grid containers`);
        
        if (mainGridContainers.length > 0) {
            console.log("✅ Successfully found main grid container(s) for desktop approach");
            
            // Log details about each container for debugging
            mainGridContainers.forEach((container, index) => {
                console.log(`📦 Grid container ${index + 1}:`, {
                    className: container.className,
                    childCount: container.children.length,
                    textContent: container.textContent.substring(0, 100) + '...'
                });
                
                // Step 2b: Find the professor name grid item within this container
                const detailsGridItems = container.querySelectorAll('.cx-MuiGrid-grid-xs-5');
                console.log(`🔍 Found ${detailsGridItems.length} details grid items (cx-MuiGrid-grid-xs-5) in container ${index + 1}`);
                
                if (detailsGridItems.length > 0) {
                    console.log("✅ Successfully found details grid item(s) for professor extraction");
                    
                    // Log details about each details grid item
                    detailsGridItems.forEach((detailsItem, detailsIndex) => {
                        console.log(`📋 Details grid item ${detailsIndex + 1}:`, {
                            className: detailsItem.className,
                            childCount: detailsItem.children.length,
                            textContent: detailsItem.textContent.substring(0, 100) + '...'
                        });
                        
                        // Step 2c: Navigate to professor name cell within this details grid item
                        const professorNameCells = detailsItem.querySelectorAll('.cx-MuiGrid-grid-xs-4');
                        console.log(`🔍 Found ${professorNameCells.length} grid-xs-4 cells in details item ${detailsIndex + 1}`);
                        
                        if (professorNameCells.length > 0) {
                            console.log("✅ Successfully found professor name cells");
                            
                            // Step 2d: Extract professor name from the first cell
                            const firstCell = professorNameCells[0];
                            const professorNameElement = firstCell.querySelector('.cx-MuiTypography-body2');
                            
                            if (professorNameElement) {
                                const professorName = professorNameElement.textContent.trim();
                                console.log(`👨‍🏫 Extracted professor name: "${professorName}"`);
                                
                                // Validate the extracted name
                                if (professorName && professorName.length > 0) {
                                    console.log("✅ Professor name validation passed");
                                    console.log(`📊 Professor name details:`, {
                                        name: professorName,
                                        length: professorName.length,
                                        hasLetters: /[a-zA-Z]/.test(professorName),
                                        isNotTime: !/\d{1,2}:\d{2}/.test(professorName),
                                        isNotLocation: !/Building|Room|Hall|Center/.test(professorName)
                                    });
                                    
                                    // Process the professor for rating lookup (desktop approach)
                                    console.log(`👨‍🏫 Processing desktop professor: ${professorName}`);
                                    
                                    // Send message to background script to get professor rating
                                    chrome.runtime.sendMessage(
                                        { type: "getProfRating", profName: professorName },
                                        (response) => {
                                            console.log("📨 Desktop response from background script:", response);
                                            
                                            if (response.status === "success" && response.professor) {
                                                console.log("✅ Received desktop professor data:", response.professor);
                                                // Inject rating UI for desktop
                                                injectDesktopRatingUI(professorNameElement, response.professor);
                                            } else if (response.status === "not_found") {
                                                console.log("❌ Desktop professor not found in database");
                                                // Inject "not found" badge for desktop
                                                const notFoundBadge = createNotFoundBadge(professorName);
                                                professorNameElement.appendChild(notFoundBadge);
                                            } else {
                                                console.log("❌ Error getting desktop professor data:", response.message);
                                            }
                                        }
                                    );
                                } else {
                                    console.log("❌ Professor name is empty or invalid");
                                }
                            } else {
                                console.log("❌ No .cx-MuiTypography-body2 element found in first cell");
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
        console.log("📱 Mobile approach successful, skipping desktop approach");
    }
    
    console.log(`🎯 Professor search complete. Found ${professorCount} professors via mobile approach.`);
}

// Function to set up the MutationObserver
function setupMutationObserver() {
    console.log("👀 Setting up MutationObserver in iframe...");
    const observer = new MutationObserver((mutations) => {
        console.log(`🔄 DOM changed in iframe! ${mutations.length} mutation(s) detected`);
        
        // Log details about each mutation for debugging
        /*
        mutations.forEach((mutation, index) => {
            console.log(`📊 Mutation ${index + 1}:`, {
                type: mutation.type,
                target: mutation.target,
                addedNodes: mutation.addedNodes.length,
                removedNodes: mutation.removedNodes.length,
                attributeName: mutation.attributeName
            });
        });
        */
        
                                // Check if any of the mutations might contain new content
                        const hasRelevantChanges = mutations.some(mutation => {
                            // Check for added nodes
                            for (let node of mutation.addedNodes) {
                                if (node.nodeType === Node.ELEMENT_NODE) {
                                    // Check if this node or its children contain dt elements (mobile)
                                    if (node.querySelectorAll) {
                                        const dtElements = node.querySelectorAll('dt');
                                        if (dtElements.length > 0) {
                                            console.log(`🎯 Found ${dtElements.length} dt elements in added node`);
                                            return true;
                                        }
                                    }
                                    // Also check if the node itself is a dt element
                                    if (node.tagName === 'DT') {
                                        console.log(`🎯 Found dt element directly added`);
                                        return true;
                                    }
                                    
                                    // Check for desktop grid containers being added
                                    if (node.querySelectorAll) {
                                        const gridContainers = node.querySelectorAll('.cx-MuiGrid-container.cx-MuiGrid-wrap-xs-nowrap');
                                        if (gridContainers.length > 0) {
                                            console.log(`🎯 Found ${gridContainers.length} desktop grid containers in added node`);
                                            return true;
                                        }
                                    }
                                    // Also check if the node itself is a grid container
                                    if (node.classList && node.classList.contains('cx-MuiGrid-container') && node.classList.contains('cx-MuiGrid-wrap-xs-nowrap')) {
                                        console.log(`🎯 Found desktop grid container directly added`);
                                        return true;
                                    }
                                }
                            }
                            
                            // Also check for attribute changes that might indicate layout switches
                            if (mutation.type === 'attributes') {
                                const target = mutation.target;
                                if (target.classList && (target.classList.contains('cx-MuiGrid-container') || target.classList.contains('cx-MuiGrid-wrap-xs-nowrap'))) {
                                    console.log(`🎯 Found attribute change on grid container`);
                                    return true;
                                }
                            }
                            
                            return false;
                        });
        
        if (hasRelevantChanges) {
            console.log("🚀 Relevant changes detected in iframe, running professor search...");
            // Add a small delay to ensure DOM is fully updated
            setTimeout(findAndLogProfessors, 100);
        } else {
            console.log("⏭️ No relevant changes detected in iframe, skipping professor search");
        }
    });

    // Configure and start the observer with more comprehensive options
    const config = {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
    };

    console.log("🚀 Starting MutationObserver in iframe with config:", config);
    observer.observe(document.body, config);
    console.log("✅ MutationObserver is now active in iframe and watching for changes");

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
        iframe.addEventListener('load', () => {
            console.log("📥 Iframe loaded, injecting script via scripting API...");
            injectIntoIframe(iframe);
        });
        
        // If iframe is already loaded, inject immediately
        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
            console.log("📥 Iframe already loaded, injecting immediately...");
            injectIntoIframe(iframe);
        }
    } else {
        console.log("❌ Schedule Builder iframe not found");
    }
} else {
    console.log("📄 We're already in an iframe");
    setupMutationObserver();
}

// Function to inject our script into an iframe using the scripting API
function injectIntoIframe(iframe) {
    try {
        console.log("🎯 Injecting into iframe:", iframe.src);
        
        // Use the scripting API to inject our code directly
        chrome.scripting.executeScript({
            target: { tabId: null, frameIds: [iframe.contentWindow.frameId] },
            func: () => {
                // PolyRatings Enhancer - Injected into iframe
                console.log("PolyRatings Enhancer injected into iframe!");
                
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

                // Function to create rating UI element
                function createRatingElement(professor) {
                    const ratingContainer = document.createElement('span');
                    ratingContainer.style.cssText = `
                        display: inline-flex;
                        align-items: center;
                        margin-left: 8px;
                        padding: 2px 6px;
                        background: #f8f9fa;
                        border: 1px solid #dee2e6;
                        border-radius: 12px;
                        font-size: 12px;
                        color: #495057;
                        text-decoration: none;
                        transition: all 0.2s ease;
                    `;
                    
                    // Create star rating
                    const stars = document.createElement('span');
                    stars.innerHTML = '⭐'.repeat(Math.floor(professor.rating)) + 
                                     (professor.rating % 1 >= 0.5 ? '⭐' : '') +
                                     '☆'.repeat(4 - Math.ceil(professor.rating));
                    stars.style.marginRight = '4px';
                    
                    // Create rating text
                    const ratingText = document.createElement('span');
                    ratingText.textContent = `${professor.rating}/4`;
                    
                    ratingContainer.appendChild(stars);
                    ratingContainer.appendChild(ratingText);
                    
                    // Make it a link
                    ratingContainer.style.cursor = 'pointer';
                    ratingContainer.title = `View ${professor.name}'s profile on PolyRatings`;
                    
                    // Add hover effects
                    ratingContainer.addEventListener('mouseenter', () => {
                        ratingContainer.style.background = '#e9ecef';
                        ratingContainer.style.borderColor = '#adb5bd';
                    });
                    
                    ratingContainer.addEventListener('mouseleave', () => {
                        ratingContainer.style.background = '#f8f9fa';
                        ratingContainer.style.borderColor = '#dee2e6';
                    });
                    
                    // Add click handler to open the professor's profile
                    ratingContainer.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(professor.link, '_blank');
                    });
                    
                    return ratingContainer;
                }

                // Function to create "not found" badge
                function createNotFoundBadge(professorName) {
                    const notFoundContainer = document.createElement('span');
                    notFoundContainer.style.cssText = `
                        display: inline-flex;
                        align-items: center;
                        margin-left: 8px;
                        padding: 2px 6px;
                        background: #f8f9fa;
                        border: 1px solid #dee2e6;
                        border-radius: 12px;
                        font-size: 12px;
                        color: #6c757d;
                        text-decoration: none;
                        transition: all 0.2s ease;
                        cursor: pointer;
                    `;
                    
                    // Create the text
                    const notFoundText = document.createElement('span');
                    notFoundText.textContent = 'Add to PolyRatings';
                    
                    notFoundContainer.appendChild(notFoundText);
                    
                    // Add hover effects
                    notFoundContainer.addEventListener('mouseenter', () => {
                        notFoundContainer.style.background = '#e9ecef';
                        notFoundContainer.style.borderColor = '#adb5bd';
                    });
                    
                    notFoundContainer.addEventListener('mouseleave', () => {
                        notFoundContainer.style.background = '#f8f9fa';
                        notFoundContainer.style.borderColor = '#dee2e6';
                    });
                    
                    // Add click handler to open the add professor page
                    notFoundContainer.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const encodedName = encodeURIComponent(professorName);
                        window.open(`https://polyratings.dev/new-professor?name=${encodedName}`, '_blank');
                    });
                    
                    notFoundContainer.title = `Add ${professorName} to PolyRatings`;
                    
                    return notFoundContainer;
                }

                // Function to inject rating UI next to professor name
                function injectRatingUI(professorElement, professor, profIndex = 0) {
                    // Check if we've already processed this professor
                    const professorName = professor.name;
                    
                    // Create a unique cache key for this specific DOM element instance
                    const currentUrl = window.location.href;
                    const elementText = professorElement.textContent.trim();
                    const elementPath = getElementPath(professorElement);
                    const cacheKey = `${professorName}-${currentUrl}-${elementPath}-${profIndex}`;
                    
                    if (processedProfessors.has(cacheKey)) {
                        console.log(`⏭️ Already processed professor: ${professorName} at this specific location`);
                        return;
                    }
                    
                    // Check if rating element already exists for this professor in this specific element
                    const existingRating = professorElement.querySelector(`.polyratings-rating[data-professor="${professorName}"]`);
                    if (existingRating) {
                        console.log(`⏭️ Rating already exists for: ${professorName} in this element`);
                        return;
                    }
                    
                    console.log(`🎨 Injecting rating UI for: ${professorName}`);
                    
                    // Create the rating element
                    const ratingElement = createRatingElement(professor);
                    ratingElement.className = 'polyratings-rating';
                    ratingElement.setAttribute('data-professor', professorName);
                    
                    // Add extra margin for multiple professors (except the first one)
                    if (profIndex > 0) {
                        ratingElement.style.marginLeft = '12px';
                    }
                    
                    // Insert the rating element directly after the professor name text
                    professorElement.appendChild(ratingElement);
                    
                    // Mark as processed
                    processedProfessors.add(cacheKey);
                    
                    console.log(`✅ Successfully injected rating UI for: ${professorName}`);
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
                            const classes = Array.from(current.classList).join('.');
                            selector += `.${classes}`;
                        }
                        
                        // Add position among siblings
                        const siblings = Array.from(current.parentNode.children);
                        const index = siblings.indexOf(current);
                        selector += `:nth-child(${index + 1})`;
                        
                        path.unshift(selector);
                        current = current.parentNode;
                    }
                    
                    return path.join(' > ');
                }

                // Core function to find and process professors
                function findAndLogProfessors() {
                    console.log("🔍 Starting professor search in iframe...");
                    
                    const dtElements = document.querySelectorAll('dt');
                    console.log(`📋 Found ${dtElements.length} dt elements in iframe`);
                    
                    let professorCount = 0;
                    
                    dtElements.forEach((dt, index) => {
                        const dtText = dt.textContent.trim();
                        console.log(`📝 dt[${index}]: "${dtText}"`);
                        
                        if (dtText === 'Instructor:') {
                            console.log(`✅ Found "Instructor:" at index ${index}`);
                            
                            const nextElement = dt.nextElementSibling;
                            if (nextElement) {
                                const instructorText = nextElement.textContent.trim();
                                console.log(`👨‍🏫 Found Instructor text: ${instructorText}`);
                                
                                // Split by comma to handle multiple instructors
                                const professorNames = instructorText.split(',').map(name => name.trim()).filter(name => name.length > 0);
                                console.log(`📋 Parsed professor names:`, professorNames);
                                
                                // Process each professor individually
                                professorNames.forEach((professorName, profIndex) => {
                                    console.log(`👨‍🏫 Processing professor ${profIndex + 1}: ${professorName}`);
                                    
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
                                                                                         // Inject the "not found" badge
                                                 const notFoundBadge = createNotFoundBadge(professorName);
                                                 nextElement.appendChild(notFoundBadge);
                                            } else {
                                                console.log("❌ Error getting professor data:", response.message);
                                            }
                                        }
                                    );
                                    
                                    professorCount++;
                                });
                            } else {
                                console.log(`❌ No next element found for instructor at index ${index}`);
                            }
                        }
                    });
                    
                    console.log(`🎯 Professor search complete. Found ${professorCount} professors.`);
                }

                // Function to set up the MutationObserver
                function setupMutationObserver() {
                    console.log("👀 Setting up MutationObserver in iframe...");
                    const observer = new MutationObserver((mutations) => {
                        console.log(`🔄 DOM changed in iframe! ${mutations.length} mutation(s) detected`);
                        
                        // Log details about each mutation for debugging
                        /*
                        mutations.forEach((mutation, index) => {
                            console.log(`📊 Mutation ${index + 1}:`, {
                                type: mutation.type,
                                target: mutation.target,
                                addedNodes: mutation.addedNodes.length,
                                removedNodes: mutation.removedNodes.length,
                                attributeName: mutation.attributeName
                            });
                        });
                        */
                        
                        // Check if any of the mutations might contain new content
                        const hasRelevantChanges = mutations.some(mutation => {
                            // Check for added nodes
                            for (let node of mutation.addedNodes) {
                                if (node.nodeType === Node.ELEMENT_NODE) {
                                    // Check if this node or its children contain dt elements (mobile)
                                    if (node.querySelectorAll) {
                                        const dtElements = node.querySelectorAll('dt');
                                        if (dtElements.length > 0) {
                                            console.log(`🎯 Found ${dtElements.length} dt elements in added node`);
                                            return true;
                                        }
                                    }
                                    // Also check if the node itself is a dt element
                                    if (node.tagName === 'DT') {
                                        console.log(`🎯 Found dt element directly added`);
                                        return true;
                                    }
                                    
                                    // Check for desktop grid containers being added
                                    if (node.querySelectorAll) {
                                        const gridContainers = node.querySelectorAll('.cx-MuiGrid-container.cx-MuiGrid-wrap-xs-nowrap');
                                        if (gridContainers.length > 0) {
                                            console.log(`🎯 Found ${gridContainers.length} desktop grid containers in added node`);
                                            return true;
                                        }
                                    }
                                    // Also check if the node itself is a grid container
                                    if (node.classList && node.classList.contains('cx-MuiGrid-container') && node.classList.contains('cx-MuiGrid-wrap-xs-nowrap')) {
                                        console.log(`🎯 Found desktop grid container directly added`);
                                        return true;
                                    }
                                }
                            }
                            
                            // Also check for attribute changes that might indicate layout switches
                            if (mutation.type === 'attributes') {
                                const target = mutation.target;
                                if (target.classList && (target.classList.contains('cx-MuiGrid-container') || target.classList.contains('cx-MuiGrid-wrap-xs-nowrap'))) {
                                    console.log(`🎯 Found attribute change on grid container`);
                                    return true;
                                }
                            }
                            
                            return false;
                        });
                        
                        if (hasRelevantChanges) {
                            console.log("🚀 Relevant changes detected in iframe, running professor search...");
                            // Add a small delay to ensure DOM is fully updated
                            setTimeout(findAndLogProfessors, 100);
                        } else {
                            console.log("⏭️ No relevant changes detected in iframe, skipping professor search");
                        }
                    });

                    // Configure and start the observer with more comprehensive options
                    const config = {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        characterData: true
                    };

                    console.log("🚀 Starting MutationObserver in iframe with config:", config);
                    observer.observe(document.body, config);
                    console.log("✅ MutationObserver is now active in iframe and watching for changes");

                    // Run once on initial load
                    console.log("🚀 Running initial professor search in iframe...");
                    findAndLogProfessors();
                }

                // Set up the observer immediately
                setupMutationObserver();
            }
        }).then(() => {
            console.log("✅ Successfully injected script into iframe via scripting API");
        }).catch((error) => {
            console.log("❌ Error injecting via scripting API:", error);
        });
    } catch (error) {
        console.log("❌ Error with scripting API:", error);
    }
} 