import { initializeAuth, getCurrentUser } from './auth.js';
import { serverTimestamp, collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, doc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { db, storage } from './firebase-config.js';
import { displayEntries, formatUserFriendlyTimestamp, enterEditMode, saveEntryChanges, cancelEditMode } from './journalEntryDisplay.js';
import { selectedTags, activeFilterTags, defaultTags, renderSelectedTags, renderAvailableTags, renderFilterTags, toggleFilterTag, addTag, removeTag, initializeTaggingFilteringSearching } from './taggingFilteringSearching.js';
import { handleDeleteEntry } from './firebaseUtils.js';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js";

// --- Variables --- 
let entriesListener = null;
let loadedEntries = [];
let isListMode = false; // Variable to track list mode

document.addEventListener('DOMContentLoaded', () => {
    const journalForm = document.getElementById('journal-form');
    const journalEntryInput = document.getElementById('entry-content');
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

    if (listModeToggle) {
        listModeToggle.addEventListener('click', () => {
            isListMode = !isListMode;
            listModeToggle.classList.toggle('active', isListMode);
            if (isListMode) {
                journalEntryInput.placeholder = "Enter list items, each on a new line...";
            } else {
                 const newRandomIndex = Math.floor(Math.random() * placeholderPhrases.length);
                 journalEntryInput.placeholder = placeholderPhrases[newRandomIndex];
            }
            journalEntryInput.classList.toggle('list-mode-active', isListMode);
        });
    }

    initializeAuth(
        (user) => {
            console.log('js/script.js received user logged in:', user.email);
            loadJournalEntries(user);
            initializeTaggingFilteringSearching(
                handleTagClick,
                (entries, activeFilters, searchInputElement, deleteCb, editCb, saveCb, cancelCb, displayEntriesCb, dbInst, currentUserObj, getLoadedCb) => {
                    displayEntries(
                        entries, activeFilters, searchInputElement, deleteCb, editCb, saveCb, cancelCb,
                        displayEntriesCb, dbInst, currentUserObj, getLoadedCb, displayEntriesCb
                    );
                },
                searchInput, () => loadedEntries, (entryId) => handleDeleteEntry(entryId, user, entrySuccessMessage),
                handleEditClick, handleSaveClick, handleCancelClick, db, user, () => activeFilterTags
            );
            selectedTags.length = 0;
            renderSelectedTags();
        },
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
                loadedEntries, displayEntries, () => loadedEntries, (entryId) => handleDeleteEntry(entryId, null, entrySuccessMessage),
                handleEditClick, handleSaveClick, handleCancelClick, db, null
            );
            renderAvailableTags(
                loadedEntries, handleTagClick, displayEntries, () => loadedEntries, (entryId) => handleDeleteEntry(entryId, null, entrySuccessMessage),
                handleEditClick, handleSaveClick, handleCancelClick, db, null
            );
        }
    );

    // --- Dark Mode Toggle Logic ---
    const body = document.body;
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const moonIcon = '<i class="fas fa-moon"></i>';
    const sunIcon = '<i class="fas fa-sun"></i>';

    function applyTheme(isDark) {
        if (isDark) {
            body.classList.add('dark-mode');
            if (darkModeToggle) darkModeToggle.innerHTML = sunIcon;
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            if (darkModeToggle) darkModeToggle.innerHTML = moonIcon;
            localStorage.setItem('theme', 'light');
        }
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            applyTheme(!body.classList.contains('dark-mode'));
        });

        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'dark') {
            applyTheme(true);
        } else {
            applyTheme(false); // Default to light
        }
        darkModeToggle.style.visibility = 'visible'; // Make toggle visible after JS setup
    }
    // End of Dark Mode Toggle Logic

    // --- Journal Logic --- 
    journalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const entryContent = journalEntryInput.value.trim();
        const currentUser = getCurrentUser();
        const entryImageInput = document.getElementById('entry-image'); // Get image input element
        const imageFile = entryImageInput.files[0]; // Get the selected file

        entrySuccessMessage.textContent = '';
        saveEntryButton.disabled = true;

        if (!entryContent && !imageFile) { // Check if both content and image are empty
            alert('Please write something or add an image to your journal entry.');
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
            entryType: isListMode ? 'list' : 'text'
            // imageUrl will be added if an image is uploaded
        };

        let lines = []; 

        if (isListMode) {
            if (entryContent) { // Only split if there's content
                lines = entryContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                newEntryData.listItems = lines.map(line => ({ text: line, completed: false }));
            } else {
                newEntryData.listItems = [];
            }
            newEntryData.content = ''; // Clear content for list type
        } else {
            newEntryData.content = entryContent;
            newEntryData.listItems = []; // Clear listItems for text type
        }

        let newEntryRef;
        let imageUrl = null;

        try {
            // 1. Upload image if exists
            if (imageFile) {
                entrySuccessMessage.textContent = 'Uploading image...';
                const storageRef = ref(storage, `users/${currentUser.uid}/images/${Date.now()}_${imageFile.name}`);
                const uploadTask = await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(uploadTask.ref);
                console.log('Image uploaded successfully, URL:', imageUrl);
                newEntryData.imageUrl = imageUrl; // Add image URL to entry data
                entrySuccessMessage.textContent = 'Image uploaded. Saving entry...';
            }

            // 2. Add entry data to Firestore
            const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'entries'), newEntryData);
            newEntryRef = docRef;
            console.log('Journal entry initially saved with ID:', docRef.id);

            // 3. Prepare content for AI analysis (only text/list content, not image)
            const contentForAI = isListMode 
                ? newEntryData.listItems.map(item => item.text).join('\n') // Use processed list items
                : newEntryData.content;

            if (contentForAI) { // Only analyze if there's text/list content
                entrySuccessMessage.textContent = isListMode ? 'List saved! Analyzing with AI...' : 'Entry saved! Analyzing with AI...';
                const aiResponse = await fetch('https://mood-weaver-ai-backend.onrender.com/analyze-entry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        entryContent: contentForAI,
                        entryType: isListMode ? 'list' : 'text'
                    })
                });

                if (!aiResponse.ok) {
                    const errData = await aiResponse.json().catch(() => null);
                    const errorMessage = errData ? (errData.error || JSON.stringify(errData)) : `Server error: ${aiResponse.status}`;
                    console.error('AI analysis error from backend:', errorMessage);
                    entrySuccessMessage.textContent = 'Entry saved. AI analysis failed.';
                    // No need to update doc here, the initial save already happened.
                    // We might want to update with an error field if AI analysis fails,
                    // but that's already handled below.
                } else {
                    const aiData = await aiResponse.json();
                    console.log('AI Analysis successful. Data from backend:', aiData);
                    // Update the entry with AI analysis results
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
            } else if (imageFile && !entryContent && !isListMode) { // Handle case with only image, no text/list
                 entrySuccessMessage.textContent = 'Image entry saved.';
            } else if (imageFile && (entryContent || isListMode)) { // Handle case with image and text/list
                 entrySuccessMessage.textContent = isListMode ? 'List and Image saved!' : 'Entry and Image saved!';
            }
            else { // Handle case with no content and no image (should be caught by initial check)
                 entrySuccessMessage.textContent = 'Empty entry processed.';
            }

        } catch (error) {
            console.error('Error during new entry processing, image upload, or AI analysis:', error);
            let errorMsg = 'Failed to process entry fully.';
            if (error.message.includes('storage')) {
                 errorMsg = 'Error uploading image.';
            } else if (error.message.includes('firestore')) {
                 errorMsg = 'Error saving entry data.';
            } else if (error.message.includes('AI analysis')) {
                 errorMsg = 'Entry saved. AI analysis failed.';
            }

            if (!entrySuccessMessage.textContent.includes('failed') && !entrySuccessMessage.textContent.includes('issue')) {
                entrySuccessMessage.textContent = errorMsg;
            }

            // Attempt to update the doc with an error if the docRef exists and the error wasn't just AI analysis failure
            if (newEntryRef && !error.toString().includes('AI analysis') && !error.message.includes('storage') && !error.message.includes('firestore')) { // Log frontend error not related to upload/save
                 updateDoc(newEntryRef, { 
                     aiError: `Frontend error on new entry processing: ${error.message}`,
                     aiTimestamp: serverTimestamp()
                 }).catch(updateError => console.error("Failed to update new entry with frontend error state:", updateError));
            } else if (newEntryRef && error.message.includes('storage')) {
                 updateDoc(newEntryRef, { 
                     aiError: `Image upload failed: ${error.message}`,
                     aiTimestamp: serverTimestamp()
                 }).catch(updateError => console.error("Failed to update new entry with storage error state:", updateError));
            } else if (newEntryRef && error.message.includes('firestore')) {
                 // Firestore save failed, docRef might not exist or update will fail too.
                 // Log error and rely on initial console.error
            }

        } finally {
            saveEntryButton.disabled = false;
            journalEntryInput.value = ''; // Clear text/textarea input
            entryImageInput.value = ''; // Clear file input
            isListMode = false;
            if (listModeToggle) {
                 listModeToggle.classList.remove('active');
            }
            journalEntryInput.classList.remove('list-mode-active');
            const newRandomIndex = Math.floor(Math.random() * placeholderPhrases.length);
            journalEntryInput.placeholder = placeholderPhrases[newRandomIndex];
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
                loadedEntries, handleTagClick, displayEntries, () => loadedEntries, (entryId) => handleDeleteEntry(entryId, currentUser, entrySuccessMessage),
                handleEditClick, handleSaveClick, handleCancelClick, db, currentUser
            );
            renderFilterTags(
                loadedEntries, displayEntries, () => loadedEntries, (entryId) => handleDeleteEntry(entryId, currentUser, entrySuccessMessage),
                handleEditClick, handleSaveClick, handleCancelClick, db, currentUser
            );
            renderSelectedTags();
        };

        entriesListener = onSnapshot(entriesQuery, snapshot => {
            console.log(`Received ${snapshot.docs.length} entries from Firestore.`);
            loadedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            displayEntries(
                loadedEntries, activeFilterTags, searchInput, (entryId) => handleDeleteEntry(entryId, currentUser, entrySuccessMessage),
                handleEditClick, handleSaveClick, handleCancelClick, postDisplayCallback,
                db, currentUser, () => loadedEntries, displayEntries
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
            enterEditMode(entryElement, entry, db, currentUser, () => loadedEntries, 
            (entries, activeFilters, searchInputElement, deleteCb, editCb, saveCb, cancelCb, displayEntriesCb, dbInst, currentUserObj, getLoadedCb) => {
                displayEntries(
                    entries, activeFilters, searchInputElement, deleteCb, editCb, saveCb, cancelCb, 
                    displayEntriesCb, dbInst, currentUserObj, getLoadedCb, displayEntriesCb
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
                    entryId, entryElement, db, () => loadedEntries, 
                    (entries, activeFilters, searchInputElement, deleteCb, editCb, saveCb, cancelCb, displayEntriesCb, dbInst, currentUserObj, getLoadedCb) => {
                        displayEntries(
                            entries, activeFilters, searchInputElement, deleteCb, editCb, saveCb, cancelCb, 
                            displayEntriesCb, dbInst, currentUserObj, getLoadedCb, displayEntriesCb
                        );
                    }, 
                    searchInput, activeFilterTags, updatedContent, updatedTitle, updatedTags
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