const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

/**
 * Calculates a simple mood score based on keywords in a journal entry.
 * Triggered when a new entry is created in Firestore at /users/{userId}/entries/{entryId}.
 */
exports.calculateMoodScore = functions.firestore
    .document("/users/{userId}/entries/{entryId}")
    .onCreate(async (snapshot, context) => {
        const entryData = snapshot.data();
        const content = entryData.content;
        const userId = context.params.userId;
        const entryId = context.params.entryId;

        console.log(`Processing entry: users/${userId}/entries/${entryId}`);
        console.log(`Content: "${content}"`);

        if (!content || typeof content !== 'string') {
            console.log("Entry content is missing or not a string. Skipping.");
            return null;
        }

        // --- Simple Keyword-Based Sentiment Analysis --- 
        const positiveKeywords = ['happy', 'good', 'great', 'love', 'joy', 'awesome', 'excited', 'wonderful', 'pleased', 'blessed'];
        const negativeKeywords = ['sad', 'bad', 'angry', 'hate', 'stress', 'terrible', 'awful', 'worried', 'frustrated', 'lonely'];

        let score = 0;
        const lowerCaseContent = content.toLowerCase();

        positiveKeywords.forEach(keyword => {
            if (lowerCaseContent.includes(keyword)) {
                score++;
            }
        });

        negativeKeywords.forEach(keyword => {
            if (lowerCaseContent.includes(keyword)) {
                score--;
            }
        });

        console.log(`Calculated mood score for entry ${entryId}: ${score}`);

        // --- Update Firestore Document with the Mood Score --- 
        try {
            await snapshot.ref.update({ moodScore: score });
            console.log(`Successfully updated moodScore for entry ${entryId} to ${score}.`);
            return null; // Indicate successful completion
        } catch (error) {
            console.error(`Error updating moodScore for entry ${entryId}:`, error);
            // Optionally, re-throw the error or handle it to prevent retries if appropriate
            return null; // Even on error, we typically return null or a promise unless we want retries.
        }
    }); 