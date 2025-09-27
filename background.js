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

// Function to parse CSV data
function parseCSV(csvText) {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",");
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const values = line.split(",");
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      data.push(row);
    }
  }

  return data;
}

// Function to convert CSV data to the expected format
function convertCSVToProfessorData(csvData) {
  return csvData.map((row) => ({
    name: row.fullName,
    rating: parseFloat(row.overallRating) || 0,
    numEvals: parseInt(row.numEvals) || 0,
    link: `https://polyratings.dev/professor/${row.id}`,
    // Enhanced data for AI analysis
    clarity: parseFloat(row.clarityRating) || 0,
    helpfulness: parseFloat(row.helpfulnessRating) || 0,
    easiness: parseFloat(row.easinessRating) || 0,
    hotness: parseFloat(row.hotnessRating) || 0,
    comments: row.comments || "",
    department: row.department || "",
    courses: row.courses || "",
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
    const response = await fetch(
      "https://raw.githubusercontent.com/sreshtalluri/polyratings-data-collection/refs/heads/main/data/main/professors_data.csv"
    );

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
    console.log(
      `✅ Successfully fetched ${data.length} professors from GitHub CSV`
    );

    // Also store in chrome.storage for persistence
    chrome.storage.local.set({ professorData: data }, () => {
      console.log("💾 Professor data saved to chrome.storage");
    });

    return data;
  } catch (error) {
    console.log("❌ Error fetching professor data from GitHub CSV:", error);
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
    // Convert "First Last" to "Last, First" format for comparison
    const nameParts = normalizedSearchName.split(" ");
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" "); // Handle multi-word last names
      const convertedFormat = `${lastName}, ${firstName}`;

      console.log(
        `🔄 Converted format: "${normalizedSearchName}" -> "${convertedFormat}"`
      );

      if (normalizedCacheName === convertedFormat) {
        console.log(`✅ Format-converted match found: ${professor.name}`);
        return professor;
      }
    }

    // 3. Also try converting database format "Last, First" to "First Last" for comparison
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

        // Try treating the last word of the last name as the actual last name
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

    // 6. Partial match (in case of middle names, titles, etc.)
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

/* -------------------- ADDED: Gemini Analysis -------------------- */

// 🔑 If you keep the key embedded, consider rotating it later.
const GEMINI_API_KEY = "AIzaSyCmwRwQpxuZFifAH9tOTUOGcx7hasCspK8";

async function callGeminiAnalysis(profName, professorData = null) {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    let prompt;

    if (professorData) {
      // Use real professor data for detailed analysis
      const {
        rating,
        numEvals,
        clarity,
        helpfulness,
        easiness,
        hotness,
        comments,
        department,
        courses,
      } = professorData;

      prompt = `You are a helpful Cal Poly student assistant. Analyze this professor's data and provide a concise, helpful summary for students considering their class.

Professor: "${profName}"
Overall Rating: ${rating}/4.0 (${numEvals} evaluations)
Clarity: ${clarity}/4.0
Helpfulness: ${helpfulness}/4.0  
Easiness: ${easiness}/4.0
Hotness: ${hotness}/4.0
Department: ${department}
Courses: ${courses}

Student Comments: "${comments.substring(0, 1000)}${
        comments.length > 1000 ? "..." : ""
      }"

Provide a 2-3 sentence summary that helps students understand:
1. What this professor is known for (teaching style, strengths)
2. What to expect (workload, difficulty, helpfulness)
3. Any notable characteristics from student feedback

Be honest, helpful, and student-friendly. Focus on practical advice for course selection.`;
    } else {
      // Fallback for professors not in database
      prompt = `You are a helpful Cal Poly student assistant. A student is asking about professor "${profName}" who is not found in the PolyRatings database.

Respond with a helpful message that:
1. Acknowledges the professor isn't in the database
2. Suggests they check the official Cal Poly directory or ask other students
3. Offers to help them add the professor to PolyRatings

Keep it friendly and under 2 sentences.`;
    }

    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error(`Gemini API error ${resp.status}`);
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || "AI analysis unavailable.";
  } catch (e) {
    console.log("❌ Gemini call failed:", e);
    return "AI analysis unavailable.";
  }
}

/* ------------------ END ADDED: Gemini Analysis ------------------ */

// Helper function to extract professor name from user query
function extractProfessorNameFromQuery(query) {
  // Common patterns for professor queries
  const patterns = [
    /(?:tell me about|what about|how is|rate|rating for|info on|information about)\s+([a-z\s,]+)/i,
    /(?:professor|prof|dr\.?|dr)\s+([a-z\s,]+)/i,
    /^([a-z\s,]+)$/i, // Direct name input
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      let name = match[1].trim();
      // Clean up common words
      name = name
        .replace(
          /\b(professor|prof|dr|dr\.|about|tell|me|how|is|rate|rating|info|information)\b/gi,
          ""
        )
        .trim();
      if (name.length > 2) {
        return name;
      }
    }
  }

  return null;
}

// Helper function to generate general responses for non-professor queries
async function generateGeneralResponse(query) {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `You are a helpful Cal Poly student assistant. A student asked: "${query}"

This doesn't seem to be about a specific professor. Provide a helpful response that:
1. Acknowledges their question
2. Offers to help them find professor information
3. Suggests they can ask about specific professors by name
4. Keeps it friendly and under 3 sentences

If they're asking about general Cal Poly academic advice, provide brief helpful guidance.`;

    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error(`Gemini API error ${resp.status}`);
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return (
      text ||
      "I'm here to help with professor information! Try asking about a specific professor by name."
    );
  } catch (e) {
    console.log("❌ General response generation failed:", e);
    return "I'm here to help with professor information! Try asking about a specific professor by name.";
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

    // Create async function to handle the request
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

        if (professor) {
          console.log("✅ Found professor data:", professor);
          // Generate AI analysis for found professors
          console.log("🤖 Generating AI analysis for found professor...");
          const analysis = await callGeminiAnalysis(
            message.profName,
            professor
          );

          sendResponse({
            status: "success",
            professor: {
              ...professor,
              analysis: analysis,
            },
          });
        } else {
          // Try Gemini analysis for professors not in database
          console.log(
            "❌ Professor not found in database — calling Gemini for AI analysis..."
          );
          const analysis = await callGeminiAnalysis(message.profName);

          if (analysis && analysis !== "AI analysis unavailable.") {
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
          } else {
            // Fallback to your original not_found path
            sendResponse({
              status: "not_found",
              message: "Professor not found in database",
            });
          }
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

  if (message.type === "chatbotQuery") {
    console.log("🤖 Processing chatbot query:", message.query);

    // Create async function to handle the chatbot query
    (async () => {
      try {
        // Extract professor name from the query (simple approach)
        const query = message.query.toLowerCase();
        const professorName = extractProfessorNameFromQuery(query);

        if (professorName) {
          console.log("👨‍🏫 Extracted professor name from query:", professorName);

          // Get professor data and AI analysis
          const data = await fetchProfessorData();
          const professor = findProfessor(professorName);

          if (professor) {
            const analysis = await callGeminiAnalysis(professorName, professor);
            sendResponse({
              status: "success",
              professor: {
                ...professor,
                analysis: analysis,
              },
            });
          } else {
            const analysis = await callGeminiAnalysis(professorName);
            sendResponse({
              status: "ai_analysis",
              professor: {
                name: professorName,
                rating: "N/A",
                link: `https://polyratings.dev/new-professor?name=${encodeURIComponent(
                  professorName
                )}`,
                analysis,
              },
            });
          }
        } else {
          // General query - provide helpful response
          const generalResponse = await generateGeneralResponse(query);
          sendResponse({
            status: "general_response",
            message: generalResponse,
          });
        }
      } catch (error) {
        console.log("❌ Error processing chatbot query:", error);
        sendResponse({
          status: "error",
          message: "Sorry, I couldn't process your query. Please try again.",
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
