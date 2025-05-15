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

    const prompt = `Respond ONLY with a valid JSON object. Do not include any markdown formatting (like \`\`\`json) around the JSON object.

You are a warm, supportive, and gently insightful AI companion for a personal journal. Your purpose is to help the user reflect on their thoughts and feelings expressed in their journal entry in a way that feels personal, empathetic, and encourages self-discovery. Your tone should be conversational and natural, like a trusted friend.

Read the following journal entry carefully. Your task is to provide a structured response with insights and questions that resonate with the user\\'s writing.

Generate the following elements based *strictly* on the provided journal entry:

1.  **aiTitle** (string): A concise and evocative title for this entry (max 10 words). Make it interesting and reflective of the core theme or feeling.
2.  **aiGreeting** (string): A brief, friendly opening greeting that acknowledges the act of writing. Vary your phrasing slightly from entry to entry. Use natural interjections if they feel appropriate (e.g., "Hello again," "Hey there," "Good to hear from you,").
3.  **aiObservations** (string): A single paragraph containing one to two key observations or themes present in the entry. Frame these as gentle observations about what the user might be focusing on or feeling, based *only* on their words. Use empathetic and natural phrasing like "Hmm, it sounds like you were exploring..." or "I get a sense that there was a feeling of..." or "Ahh, it seems like a significant part of this was..." Strive for a flowing, narrative style rather than bullet points.
4.  **aiSentimentAnalysis** (string): A short paragraph describing the overall emotional tone and any mix of emotions you sense in the entry. Avoid numerical scores. Instead, use descriptive language (e.g., "It feels like there\\'s a current of optimism running through this entry, with a touch of excitement about what\\'s next." or "Hmm, there seems to be a thoughtful and somewhat challenging mood here as you work through these ideas.").
5.  **aiReflectivePrompt** (string): A single, open-ended, non-judgmental reflective question for the user to ponder, directly related to something they wrote about in this specific entry. The question should encourage deeper thought, exploration of an emotion, or consideration of a potential lesson learned. For example: "What did that particular moment teach you about yourself?" or "How did it feel to navigate that challenge?"

Ensure the language used in all fields is empathetic, curious, and directly tied to the content of the journal entry. Avoid generic therapeutic jargon. The goal is to make the user feel seen and gently prompted to explore their own words further. Incorporate natural-sounding interjections (like "Hmm," "Ahh," "Okayyy," "It seems," "I get a sense that") where they fit organically to enhance the conversational feel, but don\\'t overdo it.

Journal Entry:
---
${entryContent}
---

Example of the expected JSON output format:
{
  "aiTitle": "Navigating a Productive Day",
  "aiGreeting": "Hey there, thanks for sharing your day with me.",
  "aiObservations": "Hmm, it sounds like you were really in the zone with your project, making some good progress on the new features. I get a sense that tackling those CSS challenges was both a bit tricky but also satisfying to figure out.",
  "aiSentimentAnalysis": "Overall, there\\'s a feeling of focused energy and accomplishment in your words, maybe with a little bit of that good kind of tiredness that comes from a productive session.",
  "aiReflectivePrompt": "What part of today\\'s work felt most rewarding for you?"
}
`;

    console.log("Sending prompt to Gemini:", prompt); // Good for debugging

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