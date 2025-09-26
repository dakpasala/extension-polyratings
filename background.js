console.log("PolyRatings Enhancer background script is active.");

// Cache for professor data
let professorCache = null;
let isFetching = false;

// Sample data for testing (fallback)
const sampleProfessors = [
  {
    name: "John Smith",
    rating: 4.2,
    link: "https://polyratings.dev/professor/john-smith",
  },
  {
    name: "Jane Doe",
    rating: 3.8,
    link: "https://polyratings.dev/professor/jane-doe",
  },
  {
    name: "Bob Johnson",
    rating: 4.5,
    link: "https://polyratings.dev/professor/bob-johnson",
  },
];

// Function to fetch professor data from GitHub
async function fetchProfessorData() {
  if (isFetching) {
    console.log("⏳ Already fetching professor data, waiting...");
    return;
  }

  if (professorCache) {
    console.log("✅ Using cached professor data");
    return professorCache;
  }

  console.log("🌐 Fetching professor data from GitHub...");
  isFetching = true;

  try {
    console.log("📡 Making request to GitHub...");
    const response = await fetch(
      "https://raw.githubusercontent.com/SahilGoel05/scraper/main/scraper/data/professors.json"
    );

    console.log("📊 Response status:", response.status);
    console.log("📊 Response headers:", response.headers);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📋 Raw data received:", data);

    if (!Array.isArray(data)) {
      throw new Error("Data is not an array");
    }

    professorCache = data;
    console.log(
      `✅ Successfully fetched ${data.length} professors from GitHub`
    );

    // Also store in chrome.storage for persistence
    chrome.storage.local.set({ professorData: data }, () => {
      console.log("💾 Professor data saved to chrome.storage");
    });

    return data;
  } catch (error) {
    console.log("❌ Error fetching professor data from GitHub:", error);
    console.log("🔄 Trying to load from chrome.storage as fallback...");

    // Try to load from chrome.storage as fallback
    try {
      const result = await chrome.storage.local.get(["professorData"]);
      if (result.professorData && Array.isArray(result.professorData)) {
        professorCache = result.professorData;
        console.log(
          `✅ Loaded ${result.professorData.length} professors from storage`
        );
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
  console.log(
    `📋 Available professors:`,
    professorCache.map((p) => p.name)
  );

  // Normalize the professor name for better matching
  const normalizedSearchName = profName.toLowerCase().trim();

  // Search through the cached data
  for (const professor of professorCache) {
    const normalizedCacheName = professor.name.toLowerCase().trim();

    console.log(
      `🔍 Comparing: "${normalizedSearchName}" with "${normalizedCacheName}"`
    );

    // 1. Exact match
    if (normalizedCacheName === normalizedSearchName) {
      console.log(`✅ Exact match found: ${professor.name}`);
      return professor;
    }

    // 2. Handle format difference: "First Last" vs "Last, First"
    const nameParts = normalizedSearchName.split(" ");
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");
      const convertedFormat = `${lastName}, ${firstName}`;

      console.log(
        `🔄 Converted format: "${normalizedSearchName}" -> "${convertedFormat}"`
      );

      if (normalizedCacheName === convertedFormat) {
        console.log(`✅ Format-converted match found: ${professor.name}`);
        return professor;
      }
    }

    // 3. Also try converting database format "Last, First" to "First Last"
    if (normalizedCacheName.includes(",")) {
      const dbNameParts = normalizedCacheName.split(",");
      if (dbNameParts.length >= 2) {
        const dbLastName = dbNameParts[0].trim();
        const dbFirstName = dbNameParts[1].trim();
        const convertedDbFormat = `${dbFirstName} ${dbLastName}`;

        console.log(
          `🔄 Converted DB format: "${normalizedCacheName}" -> "${convertedDbFormat}"`
        );

        if (normalizedSearchName === convertedDbFormat) {
          console.log(`✅ DB-format-converted match found: ${professor.name}`);
          return professor;
        }
      }
    }

    // 4. Try treating last word as last name (for multi-word last names)
    if (nameParts.length >= 2) {
      const lastWord = nameParts[nameParts.length - 1];
      const firstWords = nameParts.slice(0, -1).join(" ");
      const lastWordAsLastName = `${lastWord}, ${firstWords}`;

      console.log(
        `🔄 Last-word-as-lastname: "${normalizedSearchName}" -> "${lastWordAsLastName}"`
      );

      if (normalizedCacheName === lastWordAsLastName) {
        console.log(`✅ Last-word-as-lastname match found: ${professor.name}`);
        return professor;
      }
    }

    // 5. Try treating first word as first name (reverse of above)
    if (normalizedCacheName.includes(",")) {
      const dbNameParts = normalizedCacheName.split(",");
      if (dbNameParts.length >= 2) {
        const dbLastName = dbNameParts[0].trim();
        const dbFirstName = dbNameParts[1].trim();

        const dbLastNameParts = dbLastName.split(" ");
        if (dbLastNameParts.length >= 2) {
          const actualLastName = dbLastNameParts[dbLastNameParts.length - 1];
          const middlePart = dbLastNameParts.slice(0, -1).join(" ");
          const reconstructedFormat = `${dbFirstName} ${middlePart} ${actualLastName}`;

          console.log(
            `🔄 Reconstructed format: "${normalizedCacheName}" -> "${reconstructedFormat}"`
          );

          if (normalizedSearchName === reconstructedFormat) {
            console.log(
              `✅ Reconstructed format match found: ${professor.name}`
            );
            return professor;
          }
        }
      }
    }

    // 6. Partial match
    if (
      normalizedCacheName.includes(normalizedSearchName) ||
      normalizedSearchName.includes(normalizedCacheName)
    ) {
      console.log(`✅ Partial match found: ${professor.name}`);
      return professor;
    }

    // 7. Try partial matching with format conversion
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");
      const convertedFormat = `${lastName}, ${firstName}`;

      if (
        normalizedCacheName.includes(convertedFormat) ||
        convertedFormat.includes(normalizedCacheName)
      ) {
        console.log(
          `✅ Partial format-converted match found: ${professor.name}`
        );
        return professor;
      }
    }
  }

  console.log(`❌ No match found for: "${profName}"`);
  return null;
}

// Gemini API call for professor analysis
async function callGeminiAnalysis(profName, professorData = null) {
  try {
    const apiKey = "AIzaSyCmwRwQpxuZFifAH9tOTUOGcx7hasCspK8"; // 🔑 integrated key

    let prompt;

    if (professorData) {
      // Use actual professor data for analysis
      console.log(
        "🤖 DEBUG: Gemini analyzing professor with data:",
        professorData
      );

      prompt = `Analyze this professor from PolyRatings:

PROFESSOR: ${professorData.name}
RATING: ${professorData.rating}/5.0
PROFILE LINK: ${professorData.link}

Based on this data, provide a helpful student-friendly analysis including:
1. Overall assessment (good/bad professor)
2. Key strengths or concerns
3. Recommendation (should students take this professor?)
4. Grade expectations
5. Teaching style insights

Keep it concise, helpful, and use emojis for readability.`;
    } else {
      // General question or professor not found
      console.log("🤖 DEBUG: Gemini analyzing general question:", profName);
      prompt = `Answer this question: "${profName}"`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini API error ${response.status}`);
    const data = await response.json();
    console.log("🤖 Gemini raw response:", data);

    const analysis =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No analysis returned.";
    return analysis;
  } catch (err) {
    console.error("❌ Gemini API call failed:", err);
    return "AI analysis unavailable.";
  }
}

// Message listener for communication with content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Received message in background script:", message);

  if (message.type === "getProfRating") {
    console.log(
      "👨‍🏫 Processing professor rating request for:",
      message.profName
    );

    (async () => {
      try {
        // Ensure we have the professor data
        const data = await fetchProfessorData();

        if (!data) {
          console.log("❌ No professor data available");
          sendResponse({
            status: "error",
            message: "No professor data available",
          });
          return;
        }

        // Search for the professor
        const professor = findProfessor(message.profName);

        // Debug logging for John Seng
        if (
          message.profName.toLowerCase().includes("john") ||
          message.profName.toLowerCase().includes("seng")
        ) {
          console.log("🔍 DEBUG: Looking for John Seng...");
          console.log("🔍 DEBUG: Professor found:", professor);
          console.log(
            "🔍 DEBUG: Available professors:",
            data.slice(0, 5).map((p) => p.name)
          );
        }

        if (professor) {
          console.log("✅ Found professor data:", professor);
          // Get AI analysis with actual professor data
          const analysis = await callGeminiAnalysis(
            message.profName,
            professor
          );
          sendResponse({
            status: "success",
            professor: professor,
            analysis: analysis,
          });
        } else {
          console.log("❌ Professor not found in database. Calling Gemini AI…");
          const analysis = await callGeminiAnalysis(message.profName);
          sendResponse({
            status: "ai_analysis",
            professor: {
              name: message.profName,
              rating: "N/A",
              link: `https://polyratings.dev/new-professor?name=${encodeURIComponent(
                message.profName
              )}`,
              analysis,
            },
          });
        }
      } catch (error) {
        console.log("❌ Error processing professor rating request:", error);
        sendResponse({
          status: "error",
          message: "Failed to fetch professor rating",
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

  if (message.type === "getGeminiResponse") {
    console.log("🤖 Processing general Gemini request:", message.message);

    (async () => {
      try {
        const analysis = await callGeminiAnalysis(message.message);
        sendResponse({
          status: "success",
          analysis: analysis,
        });
      } catch (error) {
        console.log("❌ Error processing Gemini request:", error);
        sendResponse({
          status: "error",
          message: "Failed to get Gemini response",
        });
      }
    })();

    return true;
  }

  console.log("❌ Unknown message type:", message.type);
  sendResponse({
    status: "error",
    message: "Unknown message type",
  });
});
