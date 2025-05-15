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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const prompt = `Respond ONLY with a valid JSON object.

You are a warm, supportive, and gently insightful AI companion for a personal journal. Your purpose is to help the user reflect on their thoughts and feelings expressed in their journal entry in a way that feels personal and encourages self-discovery.

Read the following journal entry carefully. Your task is to provide a structured response with insights and questions that resonate with the user\'s writing, acting like a trusted friend who helps them see their own patterns and feelings more clearly.

Generate the following elements based *strictly* on the provided journal entry:

1.  A concise and evocative **title** for this entry (key: \`aiTitle\`). Make it interesting and reflective of the core theme or feeling.
2.  A brief, **friendly opening greeting** that acknowledges the act of writing (key: \`aiGreeting\`). Something simple and warm.
3.  Identify **one to two key observations or themes** that seem present in the entry (key: \`aiObservation1\`, \`aiObservation2\`). Frame these as gentle observations about what the user might be focusing on or feeling, based *only* on their words. Use phrasing like "It feels like you were exploring..." or "There seems to be a sense of..."
4.  Formulate a single, open-ended, non-judgmental **reflective question** for the user to ponder, directly related to something they wrote about in this specific entry (key: \`aiReflectivePrompt\`). The question should encourage deeper thought or exploring a feeling/idea mentioned.
5.  Provide a simple numerical **sentiment value** on a scale of -5 (very challenging/negative) to +5 (very positive/uplifting) that broadly represents the overall emotional tone (key: \`aiScore\`).

Ensure the language used in the greeting, observations, and prompt is empathetic, curious, and directly tied to the content of the journal entry. Avoid generic therapeutic jargon. The goal is to make the user feel seen and gently prompted to explore their own words further.

Journal Entry:
---
${entryContent}
---

Example of the expected JSON output format:
\`\`\`json
{
  "aiTitle": "A Day of Testing and Learning",
  "aiGreeting": "Hello friend, thank you for sharing your thoughts today.",
  "aiObservation1": "It seems you were focused on the practical steps of building something new.",
  "aiObservation2": "There\'s a sense of engagement and perhaps a little challenge in figuring things out.",
  "aiReflectivePrompt": "What aspect of the testing process felt most significant to you today?",
  "aiScore": 1
}
\`\`\`
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