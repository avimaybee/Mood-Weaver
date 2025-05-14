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

    const prompt = `Analyze the following journal entry. Based on the text, provide a JSON response with the following keys:
1.  "activities": A brief summary of what the user did.
2.  "achievements": Any accomplishments mentioned.
3.  "happyMoments": Things that made the user happy.
4.  "sadMoments": Things that made the user sad or frustrated.
5.  "improvementSuggestions": Constructive suggestions on how the user might overcome any sadness or enhance their happiness, based on the entry.
6.  "personalInsights": Any personal reflections or discoveries about the user drawn from the text.
7.  "overallMood": A short, descriptive assessment of the user's overall mood (e.g., "Positive and Reflective", "Slightly Down but Hopeful", "Mixed Emotions"). Do not use a numerical score.

Journal Entry:
---
${entryContent}
---

Respond ONLY with a valid JSON object. For example:
{
  "activities": "Went for a walk, worked on a project.",
  "achievements": "Finished a difficult task.",
  "happyMoments": "Enjoyed the sunshine during the walk.",
  "sadMoments": "Felt stressed about a deadline.",
  "improvementSuggestions": "Consider breaking down large tasks to manage stress.",
  "personalInsights": "Realized that spending time outdoors improves mood.",
  "overallMood": "Productive but a bit stressed"
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