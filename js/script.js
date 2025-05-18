// --- Firebase Configuration --- 
// IMPORTANT: Replace this with your project's Firebase config object
// };

// --- Initialize Firebase --- 
// firebase.initializeApp(firebaseConfig); // Removed initialization
// const auth = firebase.auth(); // Removed auth initialization
// const db = firebase.firestore(); // Removed db initialization

// Import authentication related functions
import { initializeAuth, getCurrentUser } from './auth.js';
// Import Firestore functions
import { serverTimestamp, collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, doc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
// Import db instance
import { db } from './firebase-config.js';
// Import journal entry display functions
import { displayEntries, formatUserFriendlyTimestamp, enterEditMode, saveEntryChanges, cancelEditMode } from './journalEntryDisplay.js';
// Import tagging, filtering, and searching functions and state
import { selectedTags, activeFilterTags, defaultTags, renderSelectedTags, renderAvailableTags, renderFilterTags, toggleFilterTag, addTag, removeTag, initializeTaggingFilteringSearching } from './taggingFilteringSearching.js';

// --- Variables --- 
// currentUser is now managed in auth.js, accessed via getCurrentUser()
let entriesListener = null; // To hold the Firestore listener
// selectedTags, activeFilterTags, defaultTags are now managed in taggingFilteringSearching.js
let loadedEntries = []; // To store the entries fetched from Firestore - Keep loadedEntries here as it's used by the Firestore listener and display logic.


document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM elements ---
    // Auth related DOM elements are now accessed directly in auth.js
    const journalForm = document.getElementById('journal-form'); // Get journalForm here
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
            console.log('js/script.js received user logged in:', user.email);
            loadJournalEntries();
             // Re-render tags on login, assuming they might have changed or need clearing
            selectedTags.length = 0; // Clear selected tags array in tagging module
            renderSelectedTags(); // Render the now empty selected tags using the function from the tagging module
             // Also render available and filter tags for the logged-in user
             // The actual rendering with entries happens after loadJournalEntries fetches data
        },
        // Callback for user logged out
        () => {
            console.log('js/script.js received user logged out');
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

            // Correct arguments passed to renderFilterTags and renderAvailableTags during logout
            renderFilterTags(
                loadedEntries, // entries (will be empty)
                displayEntries, // displayEntriesCallback
                () => loadedEntries, // getLoadedEntriesCallback
                (entryId) => handleDeleteEntry(entryId, null, entrySuccessMessage, db), // handleDeleteEntryCallback (currentUser is null on logout)
                handleEditClick, // handleEditClickCallback
                handleSaveClick, // handleSaveClickCallback
                handleCancelClick, // handleCancelClickCallback
                db, // dbInstance
                null // currentUserObject (null on logout)
            ); // Pass correct arguments
             renderAvailableTags(
                loadedEntries, // entries (will be empty)
                handleTagClick, // handleTagClickCallback
                displayEntries, // displayEntriesCallback
                () => loadedEntries, // getLoadedEntriesCallback
                (entryId) => handleDeleteEntry(entryId, null, entrySuccessMessage, db), // handleDeleteEntryCallback (currentUser is null on logout)
                handleEditClick, // handleEditClickCallback
                handleSaveClick, // handleSaveClickCallback
                handleCancelClick, // handleCancelClickCallback
                db, // dbInstance
                null // currentUserObject (null on logout)
            ); // Pass correct arguments
        }
    );

    // --- Journal Logic --- 

    // Handle journal entry submission (Create only) - Logic re-integrated into script.js
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

    // Load and display journal entries
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

        // Define the postDisplayCallback here, accessible to the onSnapshot listener
        const postDisplayCallback = (renderedEntries) => {
            console.log('postDisplayCallback executed from onSnapshot or filtering/searching after rendering');
            console.log('postDisplayCallback received renderedEntries (should be the loaded entries):', renderedEntries);
            console.log('--- Inside postDisplayCallback --- Checking calls to tag rendering functions.');

            // Re-initialize tagging/filtering with the newly loaded/rendered entries
            initializeTaggingFilteringSearching(
                handleTagClick, // 1st arg: handleTagClickCallback
                // 2nd arg: displayEntriesCallback (the callback for filtering/searching updates)
                (entriesAfterFilter, activeFiltersAfterFilter, searchInputAfterFilter, deleteCbAfterFilter, dbInstAfterFilter, currentUserObjAfterFilter, getLoadedCbAfterFilter, displayEntriesCbAfterFilter) => { // Ensure all args are accepted and currentUser is obj
                    displayEntries(
                        entriesAfterFilter, // 1st arg: entriesToDisplay
                        activeFiltersAfterFilter, // 2nd arg: activeFilterTags
                        searchInputAfterFilter, // 3rd arg: searchInput element
                        deleteCbAfterFilter, // 4th arg: handleDeleteEntryCallback
                        handleEditClick, // 5th arg: editEntryCallback
                        handleSaveClick, // 6th arg: saveEntryCallback
                        handleCancelClick, // 7th arg: cancelEditCallback
                        postDisplayCallback, // 8th arg: displayEntriesCallback (Pass the outer postDisplayCallback)
                        dbInstAfterFilter, // 9th arg: db
                        currentUserObjAfterFilter, // 10th arg: currentUser object
                        getLoadedCbAfterFilter // 11th arg: getLoadedEntriesCallback
                    );
                },
                searchInput, // 3rd arg: searchInput element
                () => loadedEntries, // 4th arg: getLoadedEntriesCallback
                (entryId) => handleDeleteEntry(entryId, currentUser, entrySuccessMessage, db), // 5th arg: handleDeleteEntryCallback
                handleEditClick, // 6th arg: handleEditClickCallback
                handleSaveClick, // 7th arg: handleSaveClickCallback
                handleCancelClick, // 8th arg: handleCancelClickCallback
                db, // 9th arg: dbInstance
                currentUser // 10th arg: currentUserObject
            );

            // Also re-render available and selected tags with the new data
            console.log('--- postDisplayCallback --- Calling renderAvailableTags.');
            console.log('Calling renderAvailableTags and renderFilterTags with loadedEntries:', loadedEntries);
            // Correct arguments passed to renderAvailableTags and renderFilterTags
            renderAvailableTags(
                loadedEntries, // entries
                handleTagClick, // handleTagClickCallback
                displayEntries, // displayEntriesCallback
                () => loadedEntries, // getLoadedEntriesCallback
                (entryId) => handleDeleteEntry(entryId, currentUser, entrySuccessMessage, db), // handleDeleteEntryCallback
                handleEditClick, // handleEditClickCallback
                handleSaveClick, // handleSaveClickCallback
                handleCancelClick, // handleCancelClickCallback
                db, // dbInstance
                currentUser // currentUserObject
            );
            renderFilterTags(
                loadedEntries, // entries
                displayEntries, // displayEntriesCallback
                () => loadedEntries, // getLoadedEntriesCallback
                (entryId) => handleDeleteEntry(entryId, currentUser, entrySuccessMessage, db), // handleDeleteEntryCallback
                handleEditClick, // handleEditClickCallback
                handleSaveClick, // handleSaveClickCallback
                handleCancelClick, // handleCancelClickCallback
                db, // dbInstance
                currentUser // currentUserObject
            ); // Add call to renderFilterTags and pass correct arguments
            renderSelectedTags(); // Ensure selected tags UI is in sync
        };

        entriesListener = onSnapshot(entriesQuery, snapshot => {
            console.log(`Received ${snapshot.docs.length} entries from Firestore.`);
            loadedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Update loadedEntries state

            // Display entries using the function from journalEntryDisplay.js, passing all necessary callbacks and data
            displayEntries(
                loadedEntries, // 1st arg: entriesToDisplay
                activeFilterTags, // 2nd arg: activeFilterTags
                searchInput, // 3rd arg: searchInput element
                (entryId) => handleDeleteEntry(entryId, getCurrentUser(), entrySuccessMessage, db), // 4th arg: handleDeleteEntryCallback
                handleEditClick, // 5th arg: editEntryCallback
                handleSaveClick, // 6th arg: saveEntryCallback
                handleCancelClick, // 7th arg: cancelEditCallback
                postDisplayCallback, // 8th arg: postDisplayCallback (defined above)
                db, // 9th arg: db
                currentUser, // 10th arg: currentUser object (available in loadJournalEntries scope)
                () => loadedEntries, // 11th arg: getLoadedEntriesCallback
                postDisplayCallback // 12th arg: displayEntriesCallback (Pass postDisplayCallback again)
            );

            postDisplayCallback(loadedEntries); // Call the callback after displayEntries

            // renderAvailableTags and renderFilterTags are now called inside the displayEntries callback above

        }, error => {
            console.error('Error fetching entries:', error);
            entriesList.innerHTML = '<p class="error-message">Could not load entries. Please refresh.</p>';
        });
        console.log('Attached Firestore listener for entries.');
    }

    // Define handler for tag clicks
    function handleTagClick(tag, entries, dbInst, currentUserObj, getLoadedCb, displayEntriesCb) {
        console.log('handleTagClick called with tag:', tag);
        // Logic to add the tag to the currently selected tags for a new entry
        // Call the addTag function from the tagging module
        addTag(
            tag,
            displayEntriesCb, // Pass displayEntriesCallback
            entries, // Pass entries
            getLoadedCb, // Pass getLoadedEntriesCallback
            (entryId) => handleDeleteEntry(entryId, currentUserObj, entrySuccessMessage, dbInst), // Pass handleDeleteEntryCallback
            handleEditClick, // Pass handleEditClickCallback
            handleSaveClick, // Pass handleSaveClickCallback
            handleCancelClick, // Pass handleCancelClickCallback
            dbInst, // Pass dbInstance
            currentUserObj // Pass currentUserObject
        );
    }

    // Re-implement handlers for edit/save/cancel clicks
    function handleEditClick(entryId) {
        console.log(`Edit clicked for entry ID: ${entryId}`);
        const entryElement = document.querySelector(`.entry[data-id="${entryId}"]`);
        const entry = loadedEntries.find(e => e.id === entryId);
        if (entryElement && entry) {
            // Call the new enterEditMode function from journalEntryDisplay.js
            enterEditMode(entryElement, entry, db, getCurrentUser(), () => loadedEntries, postDisplayCallback, searchInput, activeFilterTags);
        }
    }

    async function handleSaveClick(entryId) {
        console.log(`Save clicked for entry ID: ${entryId}`);
        const entryElement = document.querySelector(`.entry[data-id="${entryId}"]`);
        const editModeDiv = entryElement ? entryElement.querySelector('.entry-edit-mode') : null;

        if (entryElement && editModeDiv) {
            const updatedContent = editModeDiv.querySelector('.edit-content-textarea').value.trim();
            const updatedTitle = editModeDiv.querySelector('.edit-title-input').value.trim();
            const currentEditTagsDiv = editModeDiv.querySelector('.current-edit-tags');
            const updatedTags = [];
            if (currentEditTagsDiv) {
                currentEditTagsDiv.querySelectorAll('.tag').forEach(tagSpan => {
                    const tagText = tagSpan.textContent.replace(/x$/, '').trim();
                    if (tagText) {
                        updatedTags.push(tagText);
                    }
                });
            }

            // Call the new saveEntryChanges function from journalEntryDisplay.js
            await saveEntryChanges(entryId, entryElement, db, currentUser, () => loadedEntries, postDisplayCallback, searchInput, activeFilterTags, updatedContent, updatedTitle, updatedTags);
        }
    }

    function handleCancelClick(entryId) {
        console.log(`Cancel clicked for entry ID: ${entryId}`);
        const entryElement = document.querySelector(`.entry[data-id="${entryId}"]`);
        if (entryElement) {
            // Call the new cancelEditMode function from journalEntryDisplay.js
            cancelEditMode(entryElement);
        }
    }

    // Initialize tagging, filtering, and searching event listeners
    // Pass all necessary callbacks and objects to the initialization function
    initializeTaggingFilteringSearching(
        handleTagClick, // handleTagClickCallback
        (entries, activeFilters, searchInputElement, deleteCb, dbInst, currentUserObj, getLoadedCb, displayEntriesCb) => { // displayEntriesCallback
             displayEntries(
                 entries,
                 activeFilters,
                 searchInputElement,
                 deleteCb,
                 handleEditClick, // Pass handleEditClickCallback
                 handleSaveClick, // Pass handleSaveClickCallback
                 handleCancelClick, // Pass handleCancelClickCallback
                 displayEntriesCb, // Pass postDisplayCallback
                 dbInst,
                 currentUserObj,
                 getLoadedCb
             );
         },
        searchInput, // searchInput element
        () => loadedEntries, // getLoadedEntriesCallback
        (entryId) => handleDeleteEntry(entryId, getCurrentUser(), entrySuccessMessage, db), // handleDeleteEntryCallback
        handleEditClick, // handleEditClickCallback
        handleSaveClick, // handleSaveClickCallback
        handleCancelClick, // handleCancelClickCallback
        db, // dbInstance
        getCurrentUser(), // currentUserObject (get current user at init time)
        // Provide the getter callback for activeFilterTags
        () => activeFilterTags // getActiveFilterTagsCallback - Return the activeFilterTags array
    );

}); // Close DOMContentLoaded listener

export async function handleDeleteEntry(entryId, currentUser, entrySuccessMessage, dbInstance) { // Added parameters
    if (!currentUser) return;
    console.log('Attempting to delete entry ID:', entryId);

    if (confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
        entrySuccessMessage.textContent = 'Deleting entry...'; // Provide feedback
        try {
            // Use dbInstance parameter
            await deleteDoc(doc(dbInstance, 'users', currentUser.uid, 'entries', entryId));
            console.log('Journal entry deleted with ID:', entryId);
            entrySuccessMessage.textContent = 'Entry deleted successfully.';
        } catch (error) {
            console.error('Error deleting journal entry:', error);
            alert('Error deleting entry. Please try again.');
            entrySuccessMessage.textContent = 'Failed to delete entry.';
        } finally {
            setTimeout(() => { entrySuccessMessage.textContent = ''; }, 5000);
        }
    }
}

// The following functions are defined and exported in js/taggingFilteringSearching.js and should not be defined here:
// function getAllExistingTags(entries) { ... }
// export function renderAvailableTags(...) { ... }
// export function renderFilterTags(...) { ... }