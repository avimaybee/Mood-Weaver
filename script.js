// --- Firebase Configuration --- 
// IMPORTANT: Replace this with your project's Firebase config object
// };

// --- Initialize Firebase --- 
// firebase.initializeApp(firebaseConfig); // Removed initialization
// const auth = firebase.auth(); // Removed auth initialization
// const db = firebase.firestore(); // Removed db initialization

// Import authentication related functions
import { initializeAuth, getCurrentUser } from './auth.js';
// Import Firestore functions and db instance
import { db, serverTimestamp, collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, doc } from './firebase-config.js';
// Import journal entry management functions and elements
import { journalForm } from './journalEntryManagement.js'; // Only need journalForm here to attach listener
import { handleDeleteEntry } from './journalEntryManagement.js'; // Import handleDeleteEntry separately for clarity
// Import journal entry display functions
import { displayEntries, formatUserFriendlyTimestamp } from './journalEntryDisplay.js';
// Import tagging, filtering, and searching functions and state
import { selectedTags, activeFilterTags, defaultTags, renderSelectedTags, renderAvailableTags, renderFilterTags, toggleFilterTag, addTag, removeTag, initializeTaggingFilteringSearching } from './taggingFilteringSearching.js';

// --- Variables --- 
// currentUser is now managed in auth.js, accessed via getCurrentUser()
let entriesListener = null; // To hold the Firestore listener
// selectedTags, activeFilterTags, defaultTags are now managed in taggingFilteringSearching.js
let loadedEntries = []; // To store the entries fetched from Firestore - Keep loadedEntries here as it's used by the Firestore listener and display logic.


document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    // Auth related DOM elements are now accessed directly in auth.js
    const journalEntryInput = document.getElementById('journal-entry');
    const entrySuccessMessage = document.getElementById('entry-success');
    const entriesList = document.getElementById('entries-list'); // Used in loadJournalEntries and passed to displayEntries
    const saveEntryButton = document.getElementById('save-entry-button');
    // Tagging/Filtering/Searching DOM elements are accessed directly in taggingFilteringSearching.js
    const searchInput = document.getElementById('search-input'); // Used here to pass to displayEntries

    // --- Placeholder Phrases --- 
    const placeholderPhrases = [
        "Start typing your thoughts here...",
        "What's on your mind today?",
        "How are you feeling right now?",
        "Write about your day...",
        "Pour your heart out here...",
        "Capture your mood..."
    ];

    // Set random placeholder on page load
    const randomIndex = Math.floor(Math.random() * placeholderPhrases.length);
    journalEntryInput.placeholder = placeholderPhrases[randomIndex];

    // Initialize authentication state observer from auth.js
    initializeAuth(
        // Callback for user logged in
        (user) => {
            console.log('script.js received user logged in:', user.email);
            loadJournalEntries();
             // Re-render tags on login, assuming they might have changed or need clearing
            selectedTags.length = 0; // Clear selected tags array in tagging module
            renderSelectedTags(); // Render the now empty selected tags using the function from the tagging module
        },
        // Callback for user logged out
        () => {
            console.log('script.js received user logged out');
            if (entriesListener) {
                entriesListener(); // Unsubscribe from previous listener
                entriesListener = null;
                console.log('Detached Firestore listener.');
            }
            entriesList.innerHTML = ''; // Clear entries list
            entrySuccessMessage.textContent = ''; // Clear success message
             // Clear any editing state if necessary (editingEntryId and resetFormMode are removed)
            loadedEntries = []; // Clear loaded entries on logout
            activeFilterTags.length = 0; // Clear filter tags array in tagging module
            selectedTags.length = 0; // Clear selected tags array in tagging module
            renderSelectedTags(); // Render empty selected tags
            renderFilterTags(loadedEntries); // Pass loadedEntries
             renderAvailableTags(loadedEntries); // Render empty available tags
        }
    );

    // --- Journal Logic --- 

    // Handle journal entry submission (Create only) - Logic moved to journalEntryManagement.js
    // Attaching the listener here in the main script
    journalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const entryContent = journalEntryInput.value.trim();
        const currentUser = getCurrentUser();

        entrySuccessMessage.textContent = '';
        saveEntryButton.disabled = true; // Disable button immediately

        if (!entryContent) {
            alert('Please write something in your journal entry.');
            saveEntryButton.disabled = false; // Re-enable if validation fails
            return;
        }
        if (!currentUser) {
            alert('No user logged in. Please log in to save/update entries.');
            saveEntryButton.disabled = false; // Re-enable if no user
            console.error("Attempted to save/update entry without logged-in user.");
            return;
        }

        // --- CREATE NEW ENTRY ---
        entrySuccessMessage.textContent = 'Saving entry...';
            const newEntryData = {
            userId: currentUser.uid,
                content: entryContent,
            timestamp: serverTimestamp(),
                // Use the selectedTags from the imported module
                tags: [...selectedTags] // Pass a copy of selectedTags
        };
        let newEntryRef;
            try {
                const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'entries'), newEntryData);
                newEntryRef = docRef;
                console.log('Journal entry initially saved with ID:', docRef.id);
                journalEntryInput.value = '';
                 // Clear selected tags after saving using the function from the tagging module
                selectedTags.length = 0; // Clear the array
                renderSelectedTags(); // Update the UI

                entrySuccessMessage.textContent = 'Entry saved! Analyzing with AI...';

                const aiResponse = await fetch('https://mood-weaver-ai-backend.onrender.com/analyze-entry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entryContent: entryContent })
                });

                if (!aiResponse.ok) {
                    const errData = await aiResponse.json().catch(() => null);
                    const errorMessage = errData ? (errData.error || JSON.stringify(errData)) : `Server error: ${aiResponse.status}`;
                    console.error('AI analysis error from backend:', errorMessage);
                        entrySuccessMessage.textContent = 'Entry saved. AI analysis failed.';
                    if (newEntryRef) {
                       await updateDoc(newEntryRef, {
                           aiError: errorMessage,
                           aiTimestamp: serverTimestamp()
                        });
                    }
                    } else {
                    const aiData = await aiResponse.json();
                    console.log('AI Analysis successful. Data from backend:', aiData);
                    if (newEntryRef) {
                        await updateDoc(newEntryRef, {
                            aiTitle: aiData.aiTitle || "AI Title Placeholder",
                            aiGreeting: aiData.aiGreeting || "Hello!",
                            aiObservations: aiData.aiObservations || "Observations placeholder.",
                            aiSentimentAnalysis: aiData.aiSentimentAnalysis || "Sentiment analysis placeholder.",
                            aiReflectivePrompt: aiData.aiReflectivePrompt || "What are your thoughts?",
                            aiTimestamp: serverTimestamp(),
                            aiError: null
                        });
                        entrySuccessMessage.textContent = 'Entry saved and AI analysis complete!';
                    }
                }
            } catch (error) {
                console.error('Error during new entry processing or AI analysis:', error);
                if (!entrySuccessMessage.textContent.includes('failed') && !entrySuccessMessage.textContent.includes('issue')) {
                     entrySuccessMessage.textContent = 'Failed to process new entry fully.';
                }
                if (newEntryRef && !error.toString().includes('AI analysis')) {
                     updateDoc(newEntryRef, { 
                        aiError: `Frontend error on new entry: ${error.message}`,
                        aiTimestamp: serverTimestamp()
                    }).catch(updateError => console.error("Failed to update new entry with error state:", updateError));
                    }
            } finally {
                saveEntryButton.disabled = false; // Ensure button is re-enabled
                journalEntryInput.value = ''; // Always clear input after save attempt
                // Need a way to trigger rendering of selected tags UI here too.
                setTimeout(() => { entrySuccessMessage.textContent = ''; }, 7000);
            }
    });

    // Load and display journal entries (keep this function in script.js for now)
    function loadJournalEntries() { 
        const currentUser = getCurrentUser(); // Get current user from auth module
        if (!currentUser) return;
        console.log('Loading journal entries for user:', currentUser.uid);

        if (entriesListener) {
            entriesListener();
            console.log('Detached previous Firestore listener.');
        }

        const entriesCollectionRef = collection(db, 'users', currentUser.uid, 'entries');
        const entriesQuery = query(entriesCollectionRef, orderBy('timestamp', 'desc'));

        entriesListener = onSnapshot(entriesQuery, snapshot => {
            console.log(`Received ${snapshot.docs.length} entries from Firestore.`);
            loadedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Update loadedEntries state
            
            // Display entries using the function from journalEntryDisplay.js
            displayEntries(loadedEntries, activeFilterTags, searchInput); // Pass necessary data for filtering/searching

            // Render tags and filters using functions from taggingFilteringSearching.js
            renderAvailableTags(loadedEntries);
            renderFilterTags(loadedEntries);
        }, error => {
            console.error('Error fetching entries:', error);
            entriesList.innerHTML = '<p class="error-message">Could not load entries. Please refresh.</p>';
        });
        console.log('Attached Firestore listener for entries.');
    }

    // Initialize tagging, filtering, and searching event listeners
    initializeTaggingFilteringSearching((entries, activeFilters, searchInput) => {
        displayEntries(entries, activeFilters, searchInput);
    });

}); 