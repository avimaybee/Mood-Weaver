import { initializeAuth, getCurrentUser } from './auth.js';
import { serverTimestamp, collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, doc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { db } from './firebase-config.js';
import { displayEntries, formatUserFriendlyTimestamp, enterEditMode, saveEntryChanges, cancelEditMode } from './journalEntryDisplay.js';
import { selectedTags, activeFilterTags, defaultTags, renderSelectedTags, renderAvailableTags, renderFilterTags, toggleFilterTag, addTag, removeTag, initializeTaggingFilteringSearching } from './taggingFilteringSearching.js';
import { handleDeleteEntry } from './firebaseUtils.js';

// --- Variables --- 
let entriesListener = null;
let loadedEntries = [];
let isListMode = false; // Variable to track list mode

document.addEventListener('DOMContentLoaded', () => {
    const journalForm = document.getElementById('journal-form');
    const journalEntryInput = document.getElementById('journal-entry');
    const entrySuccessMessage = document.getElementById('entry-success');
    const entriesList = document.getElementById('entries-list');
    const saveEntryButton = document.getElementById('save-entry-button');
    const searchInput = document.getElementById('search-input');
    const listModeToggle = document.getElementById('list-mode-toggle');

    const placeholderPhrases = [
        "Start typing your thoughts here...",
        "What's on your mind today?",
        "How are you feeling right now?",
        "Write about your day...",
        "Pour your heart out here...",
        "Capture your mood..."
    ];

    const randomIndex = Math.floor(Math.random() * placeholderPhrases.length);
    journalEntryInput.placeholder = placeholderPhrases[randomIndex];

    // Add event listener for the list mode toggle button
    if (listModeToggle) {
        listModeToggle.addEventListener('click', () => {
            isListMode = !isListMode;
            listModeToggle.classList.toggle('active', isListMode);
            if (isListMode) {
                journalEntryInput.placeholder = "Enter list items, each on a new line...";
            } else {
                 const randomIndex = Math.floor(Math.random() * placeholderPhrases.length);
                 journalEntryInput.placeholder = placeholderPhrases[randomIndex];
            }
            // Optionally, add/remove a class on journalEntryInput or its container for styling
            journalEntryInput.classList.toggle('list-mode-active', isListMode);
        });
    }

    // Initialize authentication state observer from auth.js
    initializeAuth(
        // Callback for user logged in
        (user) => {
            console.log('js/script.js received user logged in:', user.email);
            loadJournalEntries(user);

            // Initialize tagging/filtering/searching after user is logged in
            initializeTaggingFilteringSearching(
                handleTagClick,
                (entries, activeFilters, searchInputElement, deleteCb, editCb, saveCb, cancelCb, displayEntriesCb, dbInst, currentUserObj, getLoadedCb) => {
                    displayEntries(
                        entries,
                        activeFilters,
                        searchInputElement,
                        deleteCb,
                        editCb,
                        saveCb,
                        cancelCb,
                        displayEntriesCb,
                        dbInst,
                        currentUserObj,
                        getLoadedCb,
                        displayEntriesCb
                    );
                },
                searchInput,
                () => loadedEntries,
                (entryId) => handleDeleteEntry(entryId, user, entrySuccessMessage),
                handleEditClick,
                handleSaveClick,
                handleCancelClick,
                db,
                user,
                () => activeFilterTags
            );

            selectedTags.length = 0;
            renderSelectedTags();
        },
        // Callback for user logged out
        () => {
            console.log('js/script.js received user logged out');
            if (entriesListener) {
                entriesListener();
                entriesListener = null;
                console.log('Detached Firestore listener.');
            }
            entriesList.innerHTML = '';
            entrySuccessMessage.textContent = '';
            loadedEntries = [];
            activeFilterTags.length = 0;
            selectedTags.length = 0;
            renderSelectedTags();
            renderFilterTags(
                loadedEntries,
                displayEntries,
                () => loadedEntries,
                (entryId) => handleDeleteEntry(entryId, null, entrySuccessMessage),
                handleEditClick,
                handleSaveClick,
                handleCancelClick,
                db,
                null
            );
            renderAvailableTags(
                loadedEntries,
                handleTagClick,
                displayEntries,
                () => loadedEntries,
                (entryId) => handleDeleteEntry(entryId, null, entrySuccessMessage),
                handleEditClick,
                handleSaveClick,
                handleCancelClick,
                db,
                null
            );
        }
    );

    // --- Journal Logic --- 

    journalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const entryContent = journalEntryInput.value.trim();
        const currentUser = getCurrentUser();

        entrySuccessMessage.textContent = '';
        saveEntryButton.disabled = true;

        if (!entryContent) {
            alert('Please write something in your journal entry.');
            saveEntryButton.disabled = false;
            return;
        }
        if (!currentUser) {
            alert('No user logged in. Please log in to save/update entries.');
            saveEntryButton.disabled = false;
            console.error("Attempted to save/update entry without logged-in user.");
            return;
        }

        entrySuccessMessage.textContent = 'Saving entry...';

        let newEntryData = {
            userId: currentUser.uid,
            timestamp: serverTimestamp(),
            tags: [...selectedTags],
            entryType: isListMode ? 'list' : 'text' // Add entry type field
        };

        let lines = []; // Declare lines in a broader scope

        if (isListMode) {
            // Parse textarea content into list items
            lines = entryContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            newEntryData.listItems = lines.map(line => ({ text: line, completed: false }));
            newEntryData.content = ''; // Clear content for list entries
        } else {
            newEntryData.content = entryContent; // Keep content for text entries
            newEntryData.listItems = []; // Ensure listItems is an empty array for text entries
        }

        let newEntryRef;
        try {
            const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'entries'), newEntryData);
            newEntryRef = docRef;
            console.log('Journal entry initially saved with ID:', docRef.id);
            journalEntryInput.value = '';
            selectedTags.length = 0;
            renderSelectedTags();

            // Prepare content for AI analysis based on entry type
            const contentForAI = isListMode 
                ? lines.map(item => item.text).join('\n') // Join list item text for AI
                : entryContent; // Use original content for text entries

            if (contentForAI) {
                entrySuccessMessage.textContent = isListMode ? 'List saved! Analyzing with AI...' : 'Entry saved! Analyzing with AI...';

                const aiResponse = await fetch('https://mood-weaver-ai-backend.onrender.com/analyze-entry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        entryContent: contentForAI,
                        entryType: isListMode ? 'list' : 'text' // Include entry type
                    })
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
                        entrySuccessMessage.textContent = isListMode ? 'List saved and AI analysis complete!' : 'Entry saved and AI analysis complete!';
                    }
                }
            } else { /* if (contentForAI) is false */
                entrySuccessMessage.textContent = isListMode ? 'Empty list saved.' : 'Empty entry saved.';
            }
        } catch (error) {
            console.error('Error during new entry processing or AI analysis:', error);
            if (!entrySuccessMessage.textContent.includes('failed') && !entrySuccessMessage.textContent.includes('issue')) {
                entrySuccessMessage.textContent = 'Failed to process new entry fully.';
            }
            // Update AI error if newEntryRef exists and the error is not from the AI analysis fetch itself
            if (newEntryRef && !error.toString().includes('AI analysis')) {
                updateDoc(newEntryRef, { 
                    aiError: `Frontend error on new entry: ${error.message}`,
                    aiTimestamp: serverTimestamp()
                }).catch(updateError => console.error("Failed to update new entry with error state:", updateError));
            }
        } finally {
            saveEntryButton.disabled = false;
            journalEntryInput.value = '';
            // Reset list mode toggle and state after saving
            isListMode = false;
            if (listModeToggle) {
                 listModeToggle.classList.remove('active');
            }
            journalEntryInput.classList.remove('list-mode-active');
             const randomIndex = Math.floor(Math.random() * placeholderPhrases.length);
             journalEntryInput.placeholder = placeholderPhrases[randomIndex];

            setTimeout(() => { entrySuccessMessage.textContent = ''; }, 7000);
        }
    });

    function loadJournalEntries(currentUser) { 
        if (!currentUser) return;
        console.log('Loading journal entries for user:', currentUser.uid);

        if (entriesListener) {
            entriesListener();
            console.log('Detached previous Firestore listener.');
        }

        const entriesCollectionRef = collection(db, 'users', currentUser.uid, 'entries');
        const entriesQuery = query(entriesCollectionRef, orderBy('timestamp', 'desc'));

        const postDisplayCallback = (renderedEntries) => {
            console.log('postDisplayCallback executed from onSnapshot or filtering/searching after rendering');
            renderAvailableTags(
                loadedEntries,
                handleTagClick,
                displayEntries,
                () => loadedEntries,
                (entryId) => handleDeleteEntry(entryId, currentUser, entrySuccessMessage),
                handleEditClick,
                handleSaveClick,
                handleCancelClick,
                db,
                currentUser
            );
            renderFilterTags(
                loadedEntries,
                displayEntries,
                () => loadedEntries,
                (entryId) => handleDeleteEntry(entryId, currentUser, entrySuccessMessage),
                handleEditClick,
                handleSaveClick,
                handleCancelClick,
                db,
                currentUser
            );
            renderSelectedTags();
        };

        entriesListener = onSnapshot(entriesQuery, snapshot => {
            console.log(`Received ${snapshot.docs.length} entries from Firestore.`);
            loadedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            displayEntries(
                loadedEntries,
                activeFilterTags,
                searchInput,
                (entryId) => handleDeleteEntry(entryId, currentUser, entrySuccessMessage),
                handleEditClick,
                handleSaveClick,
                handleCancelClick,
                postDisplayCallback,
                db,
                currentUser,
                () => loadedEntries,
                displayEntries
            );

            postDisplayCallback(loadedEntries);
        }, error => {
            console.error('Error fetching entries:', error);
            entriesList.innerHTML = '<p class="error-message">Could not load entries. Please refresh.</p>';
        });
        console.log('Attached Firestore listener for entries.');
    }

    function handleTagClick(tag, entries, dbInst, currentUserObj, getLoadedCb, displayEntriesCb) {
        console.log('handleTagClick called with tag:', tag);
        addTag(tag);
    }

    function handleEditClick(entryId) {
        console.log(`Edit clicked for entry ID: ${entryId}`);
        const currentUser = getCurrentUser();
        const entryElement = document.querySelector(`.entry[data-id="${entryId}"]`);
        const entry = loadedEntries.find(e => e.id === entryId);
        if (entryElement && entry) {
            enterEditMode(entryElement, entry, db, currentUser, () => loadedEntries, (entries, activeFilters, searchInputElement, deleteCb, editCb, saveCb, cancelCb, displayEntriesCb, dbInst, currentUserObj, getLoadedCb) => {
                displayEntries(
                    entries,
                    activeFilters,
                    searchInputElement,
                    deleteCb,
                    editCb,
                    saveCb,
                    cancelCb,
                    displayEntriesCb,
                    dbInst,
                    currentUserObj,
                    getLoadedCb,
                    displayEntriesCb
                );
            }, searchInput, activeFilterTags);
        }
    }

    async function handleSaveClick(entryId) {
        console.log(`Save clicked for entry ID: ${entryId}`);
        const currentUser = getCurrentUser();
        const entryElement = document.querySelector(`.entry[data-id="${entryId}"]`);
        const editModeDiv = entryElement ? entryElement.querySelector('.entry-edit-mode') : null;

        if (entryElement && editModeDiv) {
            const editContentTextarea = editModeDiv.querySelector('.edit-content-textarea');
            const editTitleInput = editModeDiv.querySelector('.edit-title-input');
            const currentEditTagsDiv = editModeDiv.querySelector('.current-edit-tags');
            const updatedContent = editContentTextarea.value.trim();
            const updatedTitle = editTitleInput.value.trim();
            const updatedTags = Array.from(currentEditTagsDiv.querySelectorAll('.tag'))
                .map(tagSpan => tagSpan.textContent.replace(/x$/, '').trim());

            try {
                await saveEntryChanges(
                    entryId,
                    entryElement,
                    db,
                    () => loadedEntries,
                    (entries, activeFilters, searchInputElement, deleteCb, editCb, saveCb, cancelCb, displayEntriesCb, dbInst, currentUserObj, getLoadedCb) => {
                        displayEntries(
                            entries,
                            activeFilters,
                            searchInputElement,
                            deleteCb,
                            editCb,
                            saveCb,
                            cancelCb,
                            displayEntriesCb,
                            dbInst,
                            currentUserObj,
                            getLoadedCb,
                            displayEntriesCb
                        );
                    },
                    searchInput,
                    activeFilterTags,
                    updatedContent,
                    updatedTitle,
                    updatedTags
                );
            } catch (error) {
                console.error('Error in handleSaveClick:', error);
            }
        }
    }

    function handleCancelClick(entryId) {
        console.log(`Cancel clicked for entry ID: ${entryId}`);
        const entryElement = document.querySelector(`.entry[data-id="${entryId}"]`);
        if (entryElement) {
            cancelEditMode(entryElement);
        }
    }
});