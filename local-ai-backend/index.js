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

    const prompt = `Respond ONLY with a valid JSON object.\n\nYou are a warm, supportive, and deeply insightful AI companion for a personal journal. Your purpose is to help the user reflect on their thoughts and feelings expressed in their journal entry in a way that feels personal, encourages self-discovery, and avoids a templated feel.\n\nRead the following journal entry carefully. Your task is to provide a structured response that truly resonates with the user's writing, acting like a trusted friend who helps them see their own patterns, feelings, and nuances more clearly.\n\nGenerate the following elements based *strictly* on the provided journal entry. Vary your phrasing for greetings and observations slightly across different entries to keep the interaction fresh:\n\n1.  **aiTitle**: string - A concise and evocative title for this entry (max 10 words), reflecting its core theme or feeling.\n2.  **aiGreeting**: string - A brief, friendly, and slightly varied opening greeting that acknowledges the act of writing (e.g., \"Good to see you writing again,\" \"Thanks for sharing this part of your day,\" \"Let's explore what you've written...\").\n3.  **aiObservation1**: string - Your first key observation. Focus on an underlying feeling, challenge, sense of progress, or obstacle mentioned related to the core activity or theme. (e.g., \"It sounds like you were grappling with [challenge] while working on [activity],\" or \"I sense a real feeling of [emotion] as you described [situation].\").\n4.  **aiObservation2**: string - Your second key observation, perhaps offering a different angle, a noted strength, or a subtle nuance. (e.g., \"Despite the frustration, it also seems there was a moment of [positive aspect/strength shown],\" or \"It's interesting how you mentioned both [X] and [Y], perhaps there's a connection there?\"). If only one strong observation is apparent, this can be a shorter, more general supportive comment related to the entry.\n5.  **aiReflectivePrompt**: string - A single, open-ended, non-judgmental, and insightful reflective question. This question should encourage deeper thought about emotions, contradictions, nuances, potential lessons learned, or next steps related *directly* to what the user wrote. (e.g., \"What did that moment of [emotion] teach you about [situation]?\" or \"If you could explore the feeling of [feeling mentioned] a bit more, what might it tell you?\").\n6.  **aiScore**: number - A simple numerical sentiment value from -5 (very challenging/negative) to +5 (very positive/uplifting) that broadly represents the overall emotional tone.\n7.  **aiSentimentNarrative**: string - A short (1-2 sentences) narrative describing the mix of emotions if present, or a more nuanced summary of the overall emotional tone. (e.g., \"This entry seems to hold a mix of excitement about the new project and some apprehension about the upcoming deadline,\" or \"A sense of quiet accomplishment shines through your words today.\")\n\nEnsure your language is empathetic, curious, and directly tied to the content of the journal entry. Avoid generic therapeutic jargon. The goal is to make the user feel seen, understood, and gently prompted to explore their own words further.\n\nJournal Entry:\n---\n${entryContent}\n---\n\nExample of the expected JSON output format:\n\`\`\`json\n{\n  \"aiTitle\": \"Navigating a Busy Week\",\n  \"aiGreeting\": \"Thanks for taking a moment to share your thoughts.\",\n  \"aiObservation1\": \"It sounds like juggling multiple project deadlines has been quite demanding this week.\",\n  \"aiObservation2\": \"Yet, there's also a clear sense of determination in how you're approaching these tasks.\",\n  \"aiReflectivePrompt\": \"When you feel that pressure from deadlines, what's one small thing that helps you stay centered?\",\n  \"aiScore\": 0,\n  \"aiSentimentNarrative\": \"The entry reflects a period of high demand and stress, but also a resilient and proactive mindset.\"\n}\n\`\`\`\n`;

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