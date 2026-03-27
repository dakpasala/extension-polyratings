/* ==================== GROQ CLIENT ==================== */
const GROQ_API_KEY = "" // TODO: Replace

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "gemma-7b-it",
  "llama-3.2-90b-text-preview",
  "llama-3.2-11b-text-preview"
];

let currentModelIndex = 0;

function getNextGroqModel() {
  const model = GROQ_MODELS[currentModelIndex];
  currentModelIndex = (currentModelIndex + 1) % GROQ_MODELS.length;
  return model;
}

async function callGroqAPI(messages, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const model = getNextGroqModel();
    try {
      console.log(`🤖 GROQ ${model} (attempt ${attempt + 1})`);
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.warn(`❌ GROQ ${model} failed:`, error);
        continue;
      }

      const data = await response.json();
      console.log(`✅ GROQ ${model} succeeded`);
      return data.choices[0].message.content;
    } catch (error) {
      console.warn(`❌ GROQ ${model} error:`, error);
      if (attempt === maxRetries - 1) {
        throw new Error("All GROQ models failed");
      }
    }
  }
  throw new Error("All GROQ models failed");
}

/* ==================== ANALYSIS FUNCTIONS ==================== */

async function compareCourses(courseData, userQuery) {
  const prompt = `Compare these Cal Poly courses based on student reviews:

${courseData.map(c => `
${c.course}:
- Average Rating: ${c.avgRating}/4.0
- Number of Reviews: ${c.reviewCount}
- Sample Reviews:
${c.sampleReviews.slice(0, 5).map(r => `  * ${r.professor}: "${r.text.substring(0, 150)}..." (Rating: ${r.rating}/4.0)`).join('\n')}
`).join('\n')}

User asked: "${userQuery}"

Provide a concise comparison (3-4 sentences) highlighting difficulty, workload, and student satisfaction.`;

  return await callGroqAPI([
    { role: "system", content: "You are a helpful Cal Poly academic advisor." },
    { role: "user", content: prompt }
  ]);
}

async function analyzeProfessorForCourse(professorName, courseCode, reviews) {
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  
  const prompt = `Analyze Professor ${professorName}'s ${courseCode} course based on ${reviews.length} student reviews:

Average Rating: ${avgRating.toFixed(2)}/4.0

Sample Reviews:
${reviews.slice(0, 8).map(r => `* Grade: ${r.grade || 'N/A'}, Level: ${r.gradeLevel || 'N/A'}\n  "${r.text.substring(0, 200)}..."`).join('\n\n')}

Provide 3-4 sentences on: teaching style, difficulty, and what types of students succeed.`;

  return await callGroqAPI([
    { role: "system", content: "You are a helpful Cal Poly academic advisor." },
    { role: "user", content: prompt }
  ]);
}