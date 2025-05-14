require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Import the cors package
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3000; // Or any port you prefer

// Access your API key from the .env file
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error("Google API Key not found. Please ensure you have a .env file in the local-ai-backend directory with GOOGLE_API_KEY set.");
  process.exit(1); // Exit if the API key is not found
}

const genAI = new GoogleGenerativeAI(API_KEY);

app.use(cors()); // Use cors middleware
app.use(express.json()); // Middleware to parse JSON request bodies

// Endpoint to receive journal entry and return AI analysis
app.post('/analyze-entry', async (req, res) => {
  const { entryContent } = req.body;

  if (!entryContent) {
    return res.status(400).json({ error: 'Journal entry content is required.' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" }); // Using the flash-lite model as discussed

    const prompt = `Analyze the following journal entry. Respond ONLY with a valid JSON object.
The JSON object should have the following keys:
- "keySentimentSummary": A 1-2 sentence concise summary of the dominant feeling(s) expressed in the entry.
- "dominantThemes": An array of 2-3 main topics or areas the entry focused on (e.g., ["Work projects", "Weekend plans", "Personal challenge"]).
- "highlight": A specific positive moment, a small win, or a key insightful sentence extracted directly from the text.
- "reflectivePrompt": A single reflective question for the user to consider later, based specifically on the content of the entry.
- "simpleScore": A single number score on a scale of -5 (very negative) to +5 (very positive), representing the overall sentiment.

Journal Entry:
---
${entryContent}
---

Example of the expected JSON output format:
{
  "keySentimentSummary": "The entry reflects a sense of accomplishment and relief after completing a difficult project, though there's also a feeling of tiredness.",
  "dominantThemes": ["Project completion", "Work stress", "Need for rest"],
  "highlight": "Finally finished the report I\'ve been dreading all week!",
  "reflectivePrompt": "How can you ensure you get adequate rest this weekend to recharge?",
  "simpleScore": 3
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("AI Response Text:", text);

    let aiInsights;
    try {
      // Attempt to parse the response as JSON
      // The model might sometimes include ```json ... ``` markdown, so we'll try to strip it.
      const cleanedText = text.replace(/^```json\n?|\n?```$/g, "").trim();
      aiInsights = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Error parsing AI response as JSON:", parseError);
      console.error("Raw AI response that failed parsing:", text);
      // Return a structured error response instead of crashing
      aiInsights = {
        error: "Failed to parse AI response. The raw response may be in the backend logs.",
        rawResponse: text, // Storing raw response for debugging
        overallMood: "Analysis Incomplete"
      };
    }

    console.log("Parsed AI Insights:", aiInsights);

    res.json(aiInsights); // Send the AI insights back to the frontend

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: 'An error occurred during AI analysis.', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Local AI backend listening on port ${port}`);
}); 