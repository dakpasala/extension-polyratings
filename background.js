console.log("PolyRatings Enhancer background script is active.");
console.log("🚀 Background script loaded at:", new Date().toISOString());
console.log("🚀 Chrome runtime available:", typeof chrome !== "undefined");
console.log(
  "🚀 Chrome runtime onMessage available:",
  typeof chrome.runtime.onMessage !== "undefined"
);

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

// Function to convert CSV data to the expected format - merge ratings and comments
function convertCSVToProfessorData(ratingsData, commentsData) {
  // Start with ratings data (has the overall ratings and star ratings)
  const professorMap = new Map();

  // First pass: Process ratings data (professors_data.csv)
  ratingsData.forEach((row) => {
    const profName = row.fullName; // 4th column in professors_data.csv
    if (!profName) return;

    console.log(`📋 Processing ratings for: "${profName}"`);
    professorMap.set(profName, {
      name: profName,
      rating: parseFloat(row.overallRating) || 0,
      numEvals: parseInt(row.numEvals) || 0,
      link: `https://polyratings.dev/professor/${row.id}`,
      clarity: parseFloat(row.materialClear) || 0, // materialClear column
      helpfulness: parseFloat(row.studentDifficulties) || 0, // studentDifficulties column
      easiness: 0, // Not available in this CSV
      hotness: 0, // Not available in this CSV
      comments: "",
      department: row.department || "",
      courses: row.courses || "",
      allComments: [], // Store all individual comments
      gradeLevels: [], // Track grade levels
      grades: [], // Track actual grades received
    });
  });

  // Second pass: Process comments data and merge (professor_detailed_reviews.csv)
  commentsData.forEach((row) => {
    const profName = row.professor_name; // 2nd column in professor_detailed_reviews.csv
    if (!profName) return;

    console.log(`📝 Processing comments for: "${profName}"`);

    // If professor exists in ratings data, add comments
    if (professorMap.has(profName)) {
      const prof = professorMap.get(profName);
      console.log(`✅ Found existing professor "${profName}", adding comments`);

      // Collect comments
      const comment = row.rating_text || "";
      if (comment && comment.trim()) {
        prof.allComments.push(comment.trim());
      }

      // Track grade levels and grades
      if (row.grade_level && row.grade_level !== "N/A") {
        prof.gradeLevels.push(row.grade_level);
      }
      if (row.grade && row.grade !== "N/A") {
        prof.grades.push(row.grade);
      }
    } else {
      // If professor not in ratings data, create entry with comments only
      console.log(
        `⚠️ Professor "${profName}" not in ratings data, creating comments-only entry`
      );
      professorMap.set(profName, {
        name: profName,
        rating: 0,
        numEvals: 0,
        link: `https://polyratings.dev/professor/${
          row.professor_id || profName.toLowerCase().replace(/\s+/g, "-")
        }`,
        clarity: 0,
        helpfulness: 0,
        easiness: 0,
        hotness: 0,
        comments: "",
        department: row.professor_department || "",
        courses: row.course_code || "",
        allComments: [],
        gradeLevels: [],
        grades: [],
      });

      const prof = professorMap.get(profName);

      // Collect comments
      const comment = row.rating_text || "";
      if (comment && comment.trim()) {
        prof.allComments.push(comment.trim());
      }

      // Track grade levels and grades
      if (row.grade_level && row.grade_level !== "N/A") {
        prof.gradeLevels.push(row.grade_level);
      }
      if (row.grade && row.grade !== "N/A") {
        prof.grades.push(row.grade);
      }
    }
  });

  // Convert map to array - ratings are already calculated, just process comments
  return Array.from(professorMap.values()).map((prof) => {
    // Combine all comments (limit to ~2000 characters as requested)
    prof.comments = prof.allComments.join(" | ").substring(0, 2000);

    // Calculate grade level distribution
    const gradeLevelCounts = {};
    prof.gradeLevels.forEach((level) => {
      gradeLevelCounts[level] = (gradeLevelCounts[level] || 0) + 1;
    });
    prof.gradeLevelDistribution = gradeLevelCounts;

    // Calculate grade distribution
    const gradeCounts = {};
    prof.grades.forEach((grade) => {
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    });
    prof.gradeDistribution = gradeCounts;

    // Clean up temporary arrays
    delete prof.allComments;
    delete prof.gradeLevels;
    delete prof.grades;

    return prof;
  });
}

// Function to fetch professor data from both CSVs
async function fetchProfessorData() {
  console.log("🚀 fetchProfessorData() called!");

  if (isFetching) {
    console.log("⏳ Already fetching professor data, waiting...");
    return;
  }

  if (professorCache) {
    console.log("✅ Using cached professor data");
    return professorCache;
  }

  console.log("🌐 Fetching professor data from both CSVs...");
  isFetching = true;

  try {
    // Fetch both CSVs in parallel
    console.log("📡 Making requests to both GitHub CSVs...");
    const [ratingsResponse, commentsResponse] = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/sreshtalluri/polyratings-data-collection/refs/heads/main/data/main/professors_data.csv"
      ),
      fetch(
        "https://raw.githubusercontent.com/sreshtalluri/polyratings-data-collection/refs/heads/main/data/main/professor_detailed_reviews.csv"
      ),
    ]);

    console.log("📊 Ratings response status:", ratingsResponse.status);
    console.log("📊 Comments response status:", commentsResponse.status);

    if (!ratingsResponse.ok || !commentsResponse.ok) {
      throw new Error(
        `HTTP error! ratings: ${ratingsResponse.status}, comments: ${commentsResponse.status}`
      );
    }

    const [ratingsCsvText, commentsCsvText] = await Promise.all([
      ratingsResponse.text(),
      commentsResponse.text(),
    ]);

    console.log("📋 Raw ratings CSV length:", ratingsCsvText.length);
    console.log("📋 Raw comments CSV length:", commentsCsvText.length);
    console.log(
      "📋 First 500 chars of ratings CSV:",
      ratingsCsvText.substring(0, 500)
    );
    console.log(
      "📋 First 500 chars of comments CSV:",
      commentsCsvText.substring(0, 500)
    );

    // Parse both CSV data
    const ratingsData = parseCSV(ratingsCsvText);
    const commentsData = parseCSV(commentsCsvText);

    console.log("📋 Parsed ratings data:", ratingsData.slice(0, 3));
    console.log("📋 Parsed comments data:", commentsData.slice(0, 3));
    console.log(
      "📋 Ratings CSV headers:",
      ratingsData.length > 0 ? Object.keys(ratingsData[0]) : "No data"
    );
    console.log(
      "📋 Comments CSV headers:",
      commentsData.length > 0 ? Object.keys(commentsData[0]) : "No data"
    );

    // Convert to expected format - merge both datasets
    const data = convertCSVToProfessorData(ratingsData, commentsData);
    console.log("📋 Converted data:", data.slice(0, 3));
    console.log(
      "📋 Sample converted professor with comments:",
      data.length > 0
        ? {
            name: data[0].name,
            comments: data[0].comments,
            commentsLength: data[0].comments
              ? data[0].comments.length
              : "undefined",
          }
        : "No data"
    );

    if (!Array.isArray(data)) {
      throw new Error("Data is not an array");
    }

    professorCache = data;
    console.log(
      `✅ Successfully fetched ${data.length} professors from GitHub CSV`
    );
    console.log(
      "📋 Sample professor names:",
      data.slice(0, 5).map((p) => p.name)
    );
    console.log(
      "📋 Sample professor with comments:",
      data.slice(0, 2).map((p) => ({
        name: p.name,
        commentsLength: p.comments ? p.comments.length : 0,
        hasComments: p.comments && p.comments.length > 0,
      }))
    );

    // Debug: Check if specific professors are in the data
    const testNames = ["John Seng", "Andrea Schuman", "John Oliver"];
    testNames.forEach((name) => {
      const found = data.find((p) =>
        p.name.toLowerCase().includes(name.toLowerCase())
      );
      console.log(
        `🔍 Test search for "${name}":`,
        found ? `FOUND - ${found.name}` : "NOT FOUND"
      );
    });

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

  // Normalize the professor name for better matching
  const normalizedSearchName = profName.toLowerCase().trim();

  console.log(
    `📋 Available professors (first 10):`,
    professorCache.slice(0, 10).map((p) => p.name)
  );
  console.log(`📋 Total professors in cache: ${professorCache.length}`);

  // Debug: Check if any professor names contain the search term
  const matchingNames = professorCache.filter(
    (p) =>
      p.name.toLowerCase().includes(normalizedSearchName) ||
      normalizedSearchName.includes(p.name.toLowerCase())
  );
  console.log(
    `🔍 Names containing "${profName}":`,
    matchingNames.map((p) => p.name)
  );

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
        gradeLevelDistribution,
        gradeDistribution,
      } = professorData;

      // Log the student comments being fed to Gemini API
      console.log("📝 Student Comments being sent to Gemini API:");
      console.log("📝 Full comments length:", comments.length);
      console.log(
        "📝 Comments preview (first 1000 chars):",
        comments.substring(0, 1000)
      );
      console.log("📝 Full comments:", comments);

      // Format grade level distribution
      const gradeLevelInfo =
        Object.keys(gradeLevelDistribution).length > 0
          ? `Grade Level Distribution: ${Object.entries(gradeLevelDistribution)
              .map(([level, count]) => `${level} (${count})`)
              .join(", ")}`
          : "Grade Level Distribution: Not available";

      // Format grade distribution
      const gradeInfo =
        Object.keys(gradeDistribution).length > 0
          ? `Grade Distribution: ${Object.entries(gradeDistribution)
              .map(([grade, count]) => `${grade} (${count})`)
              .join(", ")}`
          : "Grade Distribution: Not available";

      prompt = `You are a helpful Cal Poly student assistant. Analyze this professor's data and provide a concise, helpful summary for students considering their class.

Professor: "${profName}"
Overall Rating: ${rating}/4.0 (${numEvals} evaluations)
Material Clear: ${clarity}/4.0
Student Difficulties: ${helpfulness}/4.0
Department: ${department}
Courses: ${courses}

${gradeLevelInfo}
${gradeInfo}

Student Comments: "${comments.substring(0, 2000)}${
        comments.length > 2000 ? "..." : ""
      }"

Provide a 2-3 sentence summary that helps students understand:
1. What this professor is known for (teaching style, strengths), include the rating they have in the beginning, like John Smith (4/4) is known...
2. What to expect (workload, difficulty, helpfulness)
3. Any notable characteristics from student feedback
4. How different grade levels (freshman, sophomore, etc.) typically perform

Be honest, helpful, and student-friendly. Focus on practical advice for course selection. If you notice patterns in the grade level distribution or grade distribution, mention them to help students understand what to expect.`;
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
  console.log("📨 Message type:", message.type);
  console.log("📨 Professor name:", message.profName);
  console.log("📨 Sender:", sender);

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
          console.log("🔍 Professor comments field:", professor.comments);
          console.log("🔍 Comments type:", typeof professor.comments);
          console.log(
            "🔍 Comments length:",
            professor.comments ? professor.comments.length : "undefined"
          );
          // Return professor data WITHOUT Gemini analysis to save API credits
          sendResponse({
            status: "success",
            professor: professor,
          });
        } else {
          // Professor not found in database - return not found status
          console.log("❌ Professor not found in database");
          sendResponse({
            status: "not_found",
            message: "Professor not found in database",
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

  // New message type for getting Gemini analysis only when needed
  if (message.type === "getGeminiAnalysis") {
    console.log("🤖 Getting Gemini analysis for professor:", message.profName);

    // Create async function to handle the Gemini analysis request
    (async () => {
      try {
        // Ensure we have the professor data
        const data = await fetchProfessorData();
        const professor = findProfessor(message.profName);

        if (professor) {
          console.log("✅ Found professor data, calling Gemini...");
          const analysis = await callGeminiAnalysis(
            message.profName,
            professor
          );
          sendResponse({
            status: "success",
            analysis: analysis,
            professor: professor,
          });
        } else {
          console.log("❌ Professor not found, calling Gemini anyway...");
          const analysis = await callGeminiAnalysis(message.profName);
          sendResponse({
            status: "ai_analysis",
            analysis: analysis,
            professor: {
              name: message.profName,
              rating: "N/A",
              link: `https://polyratings.dev/new-professor?name=${encodeURIComponent(
                message.profName
              )}`,
            },
          });
        }
      } catch (error) {
        console.log("❌ Error getting Gemini analysis:", error);
        sendResponse({
          status: "error",
          message: "Failed to get Gemini analysis",
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
