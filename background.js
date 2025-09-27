console.log("PolyRatings Enhancer background script is active.");

// Cache for professor data
let professorCache = null;
let isFetching = false;

// Sample data for testing (fallback)
const sampleProfessors = [
    {
        "name": "John Smith",
        "rating": 4.2,
        "link": "https://polyratings.dev/professor/john-smith"
    },
    {
        "name": "Jane Doe",
        "rating": 3.8,
        "link": "https://polyratings.dev/professor/jane-doe"
    },
    {
        "name": "Bob Johnson",
        "rating": 4.5,
        "link": "https://polyratings.dev/professor/bob-johnson"
    }
];

// Function to parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const values = line.split(',');
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }
    
    return data;
}

// Function to convert CSV data to the expected format
function convertCSVToProfessorData(csvData) {
    return csvData.map(row => ({
        name: row.fullName,
        rating: parseFloat(row.overallRating) || 0,
        numEvals: parseInt(row.numEvals) || 0,
        link: `https://polyratings.dev/professor/${row.id}`
    }));
}

// Function to fetch professor data from GitHub CSV
async function fetchProfessorData() {
    if (isFetching) {
        console.log("⏳ Already fetching professor data, waiting...");
        return;
    }
    
    if (professorCache) {
        console.log("✅ Using cached professor data");
        return professorCache;
    }
    
    console.log("🌐 Fetching professor data from GitHub CSV...");
    isFetching = true;
    
    try {
        console.log("📡 Making request to GitHub CSV...");
        const response = await fetch('https://raw.githubusercontent.com/sreshtalluri/polyratings-data-collection/refs/heads/main/data/main/professors_data.csv');
        
        console.log("📊 Response status:", response.status);
        console.log("📊 Response headers:", response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log("📋 Raw CSV data received, length:", csvText.length);
        
        // Parse CSV data
        const csvData = parseCSV(csvText);
        console.log("📋 Parsed CSV data:", csvData.slice(0, 3)); // Log first 3 rows
        
        // Convert to expected format
        const data = convertCSVToProfessorData(csvData);
        console.log("📋 Converted data:", data.slice(0, 3)); // Log first 3 converted rows
        
        if (!Array.isArray(data)) {
            throw new Error("Data is not an array");
        }
        
        professorCache = data;
        console.log(`✅ Successfully fetched ${data.length} professors from GitHub CSV`);
        
        // Also store in chrome.storage for persistence
        chrome.storage.local.set({ 'professorData': data }, () => {
            console.log("💾 Professor data saved to chrome.storage");
        });
        
        return data;
    } catch (error) {
        console.log("❌ Error fetching professor data from GitHub CSV:", error);
        console.log("🔄 Trying to load from chrome.storage as fallback...");
        
        // Try to load from chrome.storage as fallback
        try {
            const result = await chrome.storage.local.get(['professorData']);
            if (result.professorData && Array.isArray(result.professorData)) {
                professorCache = result.professorData;
                console.log(`✅ Loaded ${result.professorData.length} professors from storage`);
                return result.professorData;
            }
        } catch (storageError) {
            console.log("❌ Error loading from storage:", storageError);
        }
        
        // Use sample data as final fallback
        console.log("🔄 Using sample data as final fallback...");
        professorCache = sampleProfessors;
        console.log(`✅ Using ${sampleProfessors.length} sample professors`);
        return sampleProfessors;
    } finally {
        isFetching = false;
    }
}

// Function to pre-load professor data when Schedule Builder is accessed
function preloadProfessorData() {
    console.log("🚀 Pre-loading professor data for Schedule Builder...");
    fetchProfessorData();
}

// Function to search for a professor in the cached data
function findProfessor(profName) {
    if (!professorCache) {
        console.log("❌ No professor cache available");
        return null;
    }
    
    console.log(`🔍 Searching for professor: "${profName}"`);
    console.log(`📋 Available professors:`, professorCache.map(p => p.name));
    
    // Normalize the professor name for better matching
    const normalizedSearchName = profName.toLowerCase().trim();
    
    // Search through the cached data
    for (const professor of professorCache) {
        const normalizedCacheName = professor.name.toLowerCase().trim();
        
        console.log(`🔍 Comparing: "${normalizedSearchName}" with "${normalizedCacheName}"`);
        
        // 1. Exact match
        if (normalizedCacheName === normalizedSearchName) {
            console.log(`✅ Exact match found: ${professor.name}`);
            return professor;
        }
        
        // 2. Handle format difference: "First Last" vs "Last, First"
        // Convert "First Last" to "Last, First" format for comparison
        const nameParts = normalizedSearchName.split(' ');
        if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' '); // Handle multi-word last names
            const convertedFormat = `${lastName}, ${firstName}`;
            
            console.log(`🔄 Converted format: "${normalizedSearchName}" -> "${convertedFormat}"`);
            
            if (normalizedCacheName === convertedFormat) {
                console.log(`✅ Format-converted match found: ${professor.name}`);
                return professor;
            }
        }
        
        // 3. Also try converting database format "Last, First" to "First Last" for comparison
        if (normalizedCacheName.includes(',')) {
            const dbNameParts = normalizedCacheName.split(',');
            if (dbNameParts.length >= 2) {
                const dbLastName = dbNameParts[0].trim();
                const dbFirstName = dbNameParts[1].trim();
                const convertedDbFormat = `${dbFirstName} ${dbLastName}`;
                
                console.log(`🔄 Converted DB format: "${normalizedCacheName}" -> "${convertedDbFormat}"`);
                
                if (normalizedSearchName === convertedDbFormat) {
                    console.log(`✅ DB-format-converted match found: ${professor.name}`);
                    return professor;
                }
            }
        }
        
        // 4. Try treating last word as last name (for multi-word last names)
        if (nameParts.length >= 2) {
            const lastWord = nameParts[nameParts.length - 1];
            const firstWords = nameParts.slice(0, -1).join(' ');
            const lastWordAsLastName = `${lastWord}, ${firstWords}`;
            
            console.log(`🔄 Last-word-as-lastname: "${normalizedSearchName}" -> "${lastWordAsLastName}"`);
            
            if (normalizedCacheName === lastWordAsLastName) {
                console.log(`✅ Last-word-as-lastname match found: ${professor.name}`);
                return professor;
            }
        }
        
        // 5. Try treating first word as first name (reverse of above)
        if (normalizedCacheName.includes(',')) {
            const dbNameParts = normalizedCacheName.split(',');
            if (dbNameParts.length >= 2) {
                const dbLastName = dbNameParts[0].trim();
                const dbFirstName = dbNameParts[1].trim();
                
                // Try treating the last word of the last name as the actual last name
                const dbLastNameParts = dbLastName.split(' ');
                if (dbLastNameParts.length >= 2) {
                    const actualLastName = dbLastNameParts[dbLastNameParts.length - 1];
                    const middlePart = dbLastNameParts.slice(0, -1).join(' ');
                    const reconstructedFormat = `${dbFirstName} ${middlePart} ${actualLastName}`;
                    
                    console.log(`🔄 Reconstructed format: "${normalizedCacheName}" -> "${reconstructedFormat}"`);
                    
                    if (normalizedSearchName === reconstructedFormat) {
                        console.log(`✅ Reconstructed format match found: ${professor.name}`);
                        return professor;
                    }
                }
            }
        }
        
        // 6. Partial match (in case of middle names, titles, etc.)
        if (normalizedCacheName.includes(normalizedSearchName) || 
            normalizedSearchName.includes(normalizedCacheName)) {
            console.log(`✅ Partial match found: ${professor.name}`);
            return professor;
        }
        
        // 7. Try partial matching with format conversion
        if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');
            const convertedFormat = `${lastName}, ${firstName}`;
            
            if (normalizedCacheName.includes(convertedFormat) || 
                convertedFormat.includes(normalizedCacheName)) {
                console.log(`✅ Partial format-converted match found: ${professor.name}`);
                return professor;
            }
        }
    }
    
    console.log(`❌ No match found for: "${profName}"`);
    return null;
}

// Message listener for communication with content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📨 Received message in background script:", message);
    
    if (message.type === "getProfRating") {
        console.log("👨‍🏫 Processing professor rating request for:", message.profName);
        
        // Create async function to handle the request
        (async () => {
            try {
                // Ensure we have the professor data
                const data = await fetchProfessorData();
                
                if (!data) {
                    console.log("❌ No professor data available");
                    sendResponse({
                        status: "error",
                        message: "No professor data available"
                    });
                    return;
                }
                
                // Search for the professor
                const professor = findProfessor(message.profName);
                
                if (professor) {
                    console.log("✅ Found professor data:", professor);
                    sendResponse({
                        status: "success",
                        professor: professor
                    });
                } else {
                    console.log("❌ Professor not found in database");
                    sendResponse({
                        status: "not_found",
                        message: "Professor not found in database"
                    });
                }
            } catch (error) {
                console.log("❌ Error processing professor rating request:", error);
                sendResponse({
                    status: "error",
                    message: "Failed to fetch professor rating"
                });
            }
        })();
        
        // Return true to indicate we will send a response asynchronously
        return true;
    }
    
    if (message.type === "preloadData") {
        console.log("🚀 Pre-loading professor data...");
        preloadProfessorData();
        sendResponse({ status: "preloading" });
        return true;
    }
    
    console.log("❌ Unknown message type:", message.type);
    sendResponse({
        status: "error",
        message: "Unknown message type"
    });
}); 