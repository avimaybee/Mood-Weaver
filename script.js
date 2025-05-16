// --- Firebase Configuration --- 
// IMPORTANT: Replace this with your project's Firebase config object
const firebaseConfig = {
    apiKey: "AIzaSyCMoWvMzpxWW8Ji2GkS8izkW_MP0E8dGwI",
    authDomain: "mood-weaver-avi.firebaseapp.com",
    projectId: "mood-weaver-avi",
    storageBucket: "mood-weaver-avi.appspot.com",
    messagingSenderId: "1096682270009",
    appId: "1:1096682270009:web:ca1163b2d2a79136040ce8",
    measurementId: "G-YHG9KN5GY1"
};

// --- Initialize Firebase --- 
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- DOM Elements --- 
const authContainer = document.getElementById('auth-container');
const journalContainer = document.getElementById('journal-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const signupButton = document.getElementById('signup-button');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const authError = document.getElementById('auth-error');

const userInfo = document.getElementById('user-info');
const userEmailDisplay = document.getElementById('user-email-display');
const userEmailParagraph = userInfo.querySelector('p');
const logoutButton = document.getElementById('logout-button');
const journalForm = document.getElementById('journal-form');
const journalEntryInput = document.getElementById('journal-entry');
const entrySuccessMessage = document.getElementById('entry-success');
const entriesList = document.getElementById('entries-list');
const saveEntryButton = document.getElementById('save-entry-button'); // Get the save/update button
const cancelEditButton = document.getElementById('cancel-edit-button'); // Get the cancel edit button

// --- Placeholder Phrases --- 
const placeholderPhrases = [
    "Start typing your thoughts here...",
    "What's on your mind today?",
    "How are you feeling right now?",
    "Write about your day...",
    "Pour your heart out here...",
    "Capture your mood..."
];

// --- Variables --- 
let currentUser = null;
let entriesListener = null; // To hold the Firestore listener
let editingEntryId = null; // To store the ID of the entry being edited
let selectedTags = []; // To hold tags for the current entry being created/edited
const defaultTags = ['art', 'project', 'ideas', 'grocery', 'thoughts', 'poetry', 'remember']; // Default tags
let loadedEntries = []; // To store the entries fetched from Firestore
let activeFilterTags = []; // To store tags currently selected for filtering

// --- Authentication Logic --- 

// Toggle between Login and Sign Up forms
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    authError.textContent = ''; // Clear errors
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
    authError.textContent = ''; // Clear errors
});

// Sign Up
signupButton.addEventListener('click', (e) => {
    e.preventDefault();
    const email = signupEmailInput.value;
    const password = signupPasswordInput.value;
    authError.textContent = ''; // Clear previous errors

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Signed up successfully:', userCredential.user);
            // No need to manually switch UI, onAuthStateChanged will handle it
            signupForm.reset();
        })
        .catch((error) => {
            console.error('Sign up error:', error);
            let userMessage = 'An unexpected error occurred during sign up.';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    userMessage = 'The email address is already in use.';
                    break;
                case 'auth/invalid-email':
                    userMessage = 'The email address is not valid.';
                    break;
                case 'auth/weak-password':
                    userMessage = 'The password is too weak. Please use at least 6 characters.';
                    break;
                case 'auth/operation-not-allowed':
                    userMessage = 'Email/password sign-up is not enabled. Please contact support.';
                    break;
                default:
                    // Fallback for other errors, maybe use error.message if it's not the raw JSON
                     userMessage = error.message.startsWith('{') ? 'Sign up failed. Please check your details.' : error.message;
                    break;
            }
            authError.textContent = userMessage;
        });
});

// Login
loginButton.addEventListener('click', (e) => {
    e.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    authError.textContent = ''; // Clear previous errors

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Logged in successfully:', userCredential.user);
            // No need to manually switch UI, onAuthStateChanged will handle it
            loginForm.reset();
        })
        .catch((error) => {
            console.error('Login error:', error);
            let userMessage = 'An unexpected error occurred during login.';
             switch (error.code) {
                case 'auth/invalid-credential':
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    userMessage = 'Invalid email or password.';
                    break;
                case 'auth/user-disabled':
                    userMessage = 'Your account has been disabled.';
                    break;
                 case 'auth/invalid-email':
                     userMessage = 'The email address is not valid.';
                     break;
                default:
                     // Fallback for other errors
                     userMessage = error.message.startsWith('{') ? 'Login failed. Please check your details.' : error.message;
                    break;
            }
            authError.textContent = userMessage;
        });
});

// Logout
logoutButton.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            console.log('Logged out successfully');
            // No need to manually switch UI, onAuthStateChanged will handle it
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
});

// --- Auth State Change Handler --- 
auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in
        console.log('Auth state changed: Logged in as', user.email);
        currentUser = user;
        // Revert to displaying full email
        userEmailParagraph.innerHTML = '<i class="fas fa-user-circle"></i> Logged in as: <span id="user-email-display">' + user.email + '</span>';
        authContainer.style.display = 'none';
        journalContainer.style.display = 'block';
        loadJournalEntries(); // Load entries when user logs in
    } else {
        // User is logged out
        console.log('Auth state changed: Logged out');
        currentUser = null;
        if (entriesListener) {
            entriesListener(); // Unsubscribe from previous listener
            entriesListener = null;
            console.log('Detached Firestore listener.');
        }
        entriesList.innerHTML = ''; // Clear entries list
        authContainer.style.display = 'block';
        journalContainer.style.display = 'none';
        authError.textContent = ''; // Clear any lingering errors
        entrySuccessMessage.textContent = ''; // Clear success message
    }
});

// Initial check for authenticated user on page load
if (auth.currentUser) {
    console.log('Initial check: User already logged in as', auth.currentUser.email);
    currentUser = auth.currentUser;
    // Revert to displaying full email for initial display
    userEmailDisplay.textContent = currentUser.email;
    authContainer.style.display = 'none';
    journalContainer.style.display = 'block';
    loadJournalEntries();
}

// --- Journal Logic --- 

// Set random placeholder on page load
document.addEventListener('DOMContentLoaded', () => {
    const randomIndex = Math.floor(Math.random() * placeholderPhrases.length);
    journalEntryInput.placeholder = placeholderPhrases[randomIndex];
});

function formatUserFriendlyTimestamp(firestoreTimestamp) {
    if (!firestoreTimestamp || !firestoreTimestamp.toDate) {
        return 'Date not available'; 
    }

    const date = firestoreTimestamp.toDate();
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
    const timeString = date.toLocaleTimeString('en-US', timeOptions); 

    const entryDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (entryDateOnly.getTime() === today.getTime()) {
        return `Today, ${timeString}`;
    } else if (entryDateOnly.getTime() === yesterday.getTime()) {
        return `Yesterday, ${timeString}`;
    } else if (entryDateOnly.getTime() > sevenDaysAgo.getTime()) { // Check if the entry date is AFTER sevenDaysAgo (i.e., within the last 7 days)
        const diffTime = Math.abs(today.getTime() - entryDateOnly.getTime()); 
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} days ago, ${timeString}`;
    } else {
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = date.toLocaleDateString('en-US', dateOptions); 
        return `${dateString}, ${timeString}`;
    }
}

// Function to set the form to edit mode
function setEditMode(entry) {
    editingEntryId = entry.id;
    journalEntryInput.value = entry.content;
    selectedTags = entry.tags || [];
    renderSelectedTags();
    saveEntryButton.innerHTML = '<i class="fas fa-save"></i> Update Entry'; // Change button text and icon for Update
    cancelEditButton.style.display = 'inline-block'; // Show cancel button
    journalForm.classList.add('edit-mode'); // Add class for styling
    entrySuccessMessage.textContent = ''; // Clear any success message
}

// Function to reset the form from edit mode
function resetFormMode() {
    editingEntryId = null;
    journalEntryInput.value = '';
    selectedTags = [];
    renderSelectedTags();
    saveEntryButton.innerHTML = '<i class="fas fa-save"></i> Save Entry'; // Revert button text and icon
    cancelEditButton.style.display = 'none'; // Hide cancel button
    journalForm.classList.remove('edit-mode'); // Remove class
    entrySuccessMessage.textContent = ''; // Clear any success message
    const randomIndex = Math.floor(Math.random() * placeholderPhrases.length);
    journalEntryInput.placeholder = placeholderPhrases[randomIndex];
}

// Event listener for the Cancel Edit button
cancelEditButton.addEventListener('click', () => {
    resetFormMode();
});

// Function to render selected tags in the UI
function renderSelectedTags() {
    const selectedTagsDiv = document.getElementById('selected-tags');
    selectedTagsDiv.innerHTML = '';
    selectedTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag');
        tagSpan.textContent = tag;
        const removeTagSpan = document.createElement('span');
        removeTagSpan.classList.add('remove-tag');
        removeTagSpan.textContent = 'x';
        removeTagSpan.onclick = () => removeTag(tag);
        tagSpan.appendChild(removeTagSpan);
        selectedTagsDiv.appendChild(tagSpan);
    });
}

// Function to add a tag
function addTag(tag) {
    const lowerCaseTag = tag.toLowerCase().trim();
    if (lowerCaseTag && !selectedTags.includes(lowerCaseTag)) {
        selectedTags.push(lowerCaseTag);
        renderSelectedTags();
    }
    document.getElementById('tag-input').value = ''; // Clear input after adding
}

// Function to remove a tag
function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderSelectedTags();
}

// Event listener for tag input
document.getElementById('tag-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission
        const tagInput = document.getElementById('tag-input');
        addTag(tagInput.value);
    }
});

// Event listener for the add tag button
document.getElementById('add-tag-button').addEventListener('click', () => {
    const tagInput = document.getElementById('tag-input');
    addTag(tagInput.value);
});

// Handle journal entry submission (Create or Update)
journalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const entryContent = journalEntryInput.value.trim();
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

    if (editingEntryId) {
        // --- UPDATE EXISTING ENTRY ---
        entrySuccessMessage.textContent = 'Updating entry...';
        const entryRef = db.collection('users').doc(currentUser.uid).collection('entries').doc(editingEntryId);
        
        try {
            await entryRef.update({
                content: entryContent,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                tags: selectedTags
            });
            console.log('Journal entry updated in Firestore with ID:', editingEntryId);
            entrySuccessMessage.textContent = 'Entry updated! Re-analyzing with AI...';

            // Trigger re-analysis
            const aiResponse = await fetch('https://mood-weaver-ai-backend.onrender.com/analyze-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entryContent: entryContent })
            });

            if (!aiResponse.ok) {
                const errData = await aiResponse.json().catch(() => null);
                const errorMessage = errData ? (errData.error || JSON.stringify(errData)) : `Server error: ${aiResponse.status}`;
                console.error('AI re-analysis error from backend:', errorMessage);
                entrySuccessMessage.textContent = 'Entry updated. AI re-analysis failed.';
                await entryRef.update({ 
                    aiError: `Update successful, but re-analysis failed: ${errorMessage}`,
                    aiTimestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                const aiData = await aiResponse.json();
                console.log('AI Re-analysis successful. Data from backend:', aiData);
                await entryRef.update({
                    aiTitle: aiData.aiTitle || "AI Title Placeholder",
                    aiGreeting: aiData.aiGreeting || "Hello!",
                    aiObservations: aiData.aiObservations || "Observations placeholder.",
                    aiSentimentAnalysis: aiData.aiSentimentAnalysis || "Sentiment analysis placeholder.",
                    aiReflectivePrompt: aiData.aiReflectivePrompt || "What are your thoughts?",
                    aiTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    aiError: null 
                });
                entrySuccessMessage.textContent = 'Entry updated and AI re-analysis complete!';
            }
        } catch (error) {
            console.error('Error updating journal entry or during AI re-analysis:', error);
            entrySuccessMessage.textContent = 'Failed to update entry or AI re-analysis error.';
            // Optionally update Firestore with a general update error if needed
        } finally {
            saveEntryButton.disabled = false; // Ensure button is re-enabled
            setTimeout(() => { entrySuccessMessage.textContent = ''; }, 7000);
            resetFormMode(); // Always reset form state
        }

    } else {
        // --- CREATE NEW ENTRY --- (existing logic, slightly adapted)
    entrySuccessMessage.textContent = 'Saving entry...';
        const newEntryData = {
        userId: currentUser.uid,
            content: entryContent,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            tags: selectedTags
    };
    let newEntryRef;
        try {
            const docRef = await db.collection('users').doc(currentUser.uid).collection('entries').add(newEntryData);
            newEntryRef = docRef;
            console.log('Journal entry initially saved with ID:', docRef.id);
            journalEntryInput.value = ''; 
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
                   await newEntryRef.update({ 
                       aiError: errorMessage,
                       aiTimestamp: firebase.firestore.FieldValue.serverTimestamp() 
                    });
                }
                } else {
                const aiData = await aiResponse.json();
                console.log('AI Analysis successful. Data from backend:', aiData);
                if (newEntryRef) {
                    await newEntryRef.update({
                        aiTitle: aiData.aiTitle || "AI Title Placeholder",
                        aiGreeting: aiData.aiGreeting || "Hello!",
                        aiObservations: aiData.aiObservations || "Observations placeholder.",
                        aiSentimentAnalysis: aiData.aiSentimentAnalysis || "Sentiment analysis placeholder.",
                        aiReflectivePrompt: aiData.aiReflectivePrompt || "What are your thoughts?",
                        aiTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
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
                newEntryRef.update({ 
                    aiError: `Frontend error on new entry: ${error.message}`,
                    aiTimestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(updateError => console.error("Failed to update new entry with error state:", updateError));
                }
        } finally {
            saveEntryButton.disabled = false; // Ensure button is re-enabled
            journalEntryInput.value = ''; // Always clear input after save attempt
            setTimeout(() => { entrySuccessMessage.textContent = ''; }, 7000);
            resetFormMode(); // Always reset form state
        }
    }
});

// Function to handle Edit button click
async function handleEditEntry(entryId) {
    if (!currentUser) return;
    console.log('Attempting to edit entry ID:', entryId);
    try {
        const entryRef = db.collection('users').doc(currentUser.uid).collection('entries').doc(entryId);
        const doc = await entryRef.get();
        if (doc.exists) {
            setEditMode({ id: doc.id, ...doc.data() });
        } else {
            console.error('No such document to edit!');
            alert('Error: Could not find the entry to edit.');
        }
    } catch (error) {
        console.error('Error fetching entry for edit:', error);
        alert('Error fetching entry. Please try again.');
    }
}

// Function to handle Delete button click
async function handleDeleteEntry(entryId) {
    if (!currentUser) return;
    console.log('Attempting to delete entry ID:', entryId);

    if (confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
        entrySuccessMessage.textContent = 'Deleting entry...'; // Provide feedback
        try {
            await db.collection('users').doc(currentUser.uid).collection('entries').doc(entryId).delete();
            console.log('Journal entry deleted with ID:', entryId);
            entrySuccessMessage.textContent = 'Entry deleted successfully.';
             if (editingEntryId === entryId) { // If the deleted entry was being edited
                resetFormMode();
            }
        } catch (error) {
            console.error('Error deleting journal entry:', error);
            alert('Error deleting entry. Please try again.');
            entrySuccessMessage.textContent = 'Failed to delete entry.';
        } finally {
            setTimeout(() => { entrySuccessMessage.textContent = ''; }, 5000);
        }
    }
}

// Load and display journal entries
function loadJournalEntries() {
    if (!currentUser) return;
    console.log('Loading journal entries for user:', currentUser.uid);

    if (entriesListener) {
        entriesListener();
        console.log('Detached previous Firestore listener.');
    }

    const entriesQuery = db.collection('users').doc(currentUser.uid).collection('entries')
        .orderBy('timestamp', 'desc');

    entriesListener = entriesQuery.onSnapshot(snapshot => {
        console.log(`Received ${snapshot.docs.length} entries from Firestore.`);
        const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadedEntries = entries; // Store entries and display them
        displayEntries(loadedEntries); // Display all loaded entries initially
        renderFilterTags(); // Render filter tags after loading entries
    }, error => {
        console.error('Error fetching entries:', error);
        entriesList.innerHTML = '<p class="error-message">Could not load entries. Please refresh.</p>';
        if (editingEntryId) resetFormMode(); // Also reset form on general fetch error if editing
    });
    console.log('Attached Firestore listener for entries.');
}

function displayEntries(entriesToDisplay) {
    entriesList.innerHTML = ''; // Clear current list

    // Filter entries based on activeFilterTags
    const filteredEntries = entriesToDisplay.filter(entry => {
        if (activeFilterTags.length === 0) {
            return true; // Show all entries if no filter is active
        }
        // Check if entry has ALL activeFilterTags
        return activeFilterTags.every(filterTag => 
            entry.tags && entry.tags.includes(filterTag)
        );
    });

    if (filteredEntries.length === 0) {
        entriesList.innerHTML = '<p>No entries found matching the selected tags.</p>';
        return;
    }

    filteredEntries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.classList.add('entry');
        entryElement.dataset.id = entry.id;

        if (entry.aiTitle) {
            const titleH3 = document.createElement('h3');
            titleH3.classList.add('entry-ai-title');
            titleH3.textContent = entry.aiTitle;
            entryElement.appendChild(titleH3);
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('entry-content');
        contentDiv.innerHTML = entry.content.replace(/\n/g, '<br>'); // Use innerHTML to preserve line breaks
        entryElement.appendChild(contentDiv);

        // Timestamp for the entry itself
        const entryTimestampSpan = document.createElement('span');
        entryTimestampSpan.classList.add('timestamp');
        // Use the new formatting function for the entry timestamp
        entryTimestampSpan.textContent = `Saved: ${entry.timestamp ? formatUserFriendlyTimestamp(entry.timestamp) : 'Saving...'}`;
        entryElement.appendChild(entryTimestampSpan);

        // Display tags
        let tagsDiv = null; // Initialize tagsDiv to null
        if (entry.tags && entry.tags.length > 0) {
            tagsDiv = document.createElement('div');
            tagsDiv.classList.add('entry-tags');
            tagsDiv.innerHTML = entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
            // No longer appending tagsDiv directly here
        }
        
        entryElement.appendChild(document.createElement('hr')); // Visual separator

        // AI Insights Section
        const aiInsightsDiv = document.createElement('div');
        aiInsightsDiv.classList.add('ai-insights');

        if (entry.aiError) {
            aiInsightsDiv.innerHTML = `<p class="ai-error"><strong>AI Analysis:</strong> Error - ${entry.aiError}</p>`;
        } else if (entry.aiTitle || entry.aiGreeting) {
            let insightsHtml = '';
            if (entry.aiGreeting) {
                insightsHtml += `<p class="ai-greeting"><em>${entry.aiGreeting}</em></p>`;
                }
            if (entry.aiObservations) {
                insightsHtml += `<p class="ai-observation"><strong>Observations:</strong> ${entry.aiObservations}</p>`;
                }
            if (entry.aiSentimentAnalysis) {
                insightsHtml += `<p class="ai-sentiment-analysis"><strong>Sentiment:</strong> ${entry.aiSentimentAnalysis}</p>`;
                }
            if (entry.aiReflectivePrompt) {
                insightsHtml += `<p class="ai-reflective-prompt"><strong>Reflect:</strong> ${entry.aiReflectivePrompt}</p>`;
                }
            insightsHtml += '<p class="ai-timestamp">' + (entry.aiTimestamp ? `Analyzed: ${formatUserFriendlyTimestamp(entry.aiTimestamp)}` : 'Analyzing...') + '</p>';
            aiInsightsDiv.innerHTML = insightsHtml;
        } else if (entry.timestamp) { // Check if there's at least a timestamp to indicate processing
             aiInsightsDiv.innerHTML = '<p class="ai-processing">Processing AI analysis...</p>';
        } else {
            aiInsightsDiv.innerHTML = '<p class="ai-unavailable">AI analysis not yet available.</p>';
        }

        entryElement.appendChild(aiInsightsDiv);

        const controlsDiv = document.createElement('div');
        controlsDiv.classList.add('entry-controls');

        const editButton = document.createElement('button');
        editButton.classList.add('edit-entry-button');
        editButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Edit';
        editButton.dataset.id = entry.id;
        editButton.addEventListener('click', () => handleEditEntry(entry.id)); // Attach listener

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-entry-button');
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
        deleteButton.dataset.id = entry.id;
        deleteButton.addEventListener('click', () => handleDeleteEntry(entry.id)); // Attach listener

        controlsDiv.appendChild(editButton);
        controlsDiv.appendChild(deleteButton);

        // Create a container for tags and controls
        const bottomRowDiv = document.createElement('div');
        bottomRowDiv.classList.add('entry-bottom-row');

        // Append tagsDiv if it was created
        if (tagsDiv) {
            bottomRowDiv.appendChild(tagsDiv);
        }

        // Append controlsDiv
        bottomRowDiv.appendChild(controlsDiv);

        // Append the bottomRowDiv to the main entry element
        entryElement.appendChild(bottomRowDiv);

        entriesList.appendChild(entryElement);
    });
    
    // If the currently edited entry is no longer in the snapshot (e.g., deleted by another client), reset form.
    if (editingEntryId && !entriesToDisplay.find(entry => entry.id === editingEntryId)) {
        console.log(`Edited entry ${editingEntryId} no longer found. Resetting form.`);
        resetFormMode();
    }

    // After displaying entries, update the available tags list
    renderAvailableTags();
}

// Helper function to get all unique tags from currently displayed entries
function getAllExistingTags() {
    const existingTags = [];
    loadedEntries.forEach(entry => {
        if (entry.tags && Array.isArray(entry.tags)) {
            entry.tags.forEach(tag => {
                if (!existingTags.includes(tag)) {
                    existingTags.push(tag);
                }
            });
        }
    });
    return existingTags;
}

// Function to collect and render available tags (defaults + existing)
function renderAvailableTags() {
    const availableTagsDiv = document.getElementById('available-tags');
    // Clear previous list more explicitly
    while (availableTagsDiv.firstChild) {
        availableTagsDiv.removeChild(availableTagsDiv.firstChild);
    }

    // Combine default tags and unique tags from loaded entries
    const allUniqueTags = [...new Set([...defaultTags, ...getAllExistingTags()])];

    console.log('Rendering available tags:', allUniqueTags); // Log tags being rendered

    if (allUniqueTags.length === 0) {
        availableTagsDiv.innerHTML = '<p>No available tags yet.</p>';
        return;
    }

    allUniqueTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag', 'available-tag'); // Add available-tag class for specific styling/handling
        tagSpan.textContent = tag;
        tagSpan.onclick = () => addTag(tag); // Add tag on click
        availableTagsDiv.appendChild(tagSpan);
    });
}

// Function to render filter tags
function renderFilterTags() {
    const filterTagsListDiv = document.getElementById('filter-tags-list'); // Use the correct ID
    // Clear previous list
    while (filterTagsListDiv.firstChild) {
        filterTagsListDiv.removeChild(filterTagsListDiv.firstChild);
    }

    // Get all unique tags from loaded entries
    const allUniqueTags = getAllExistingTags(); // Reuse the existing function

    if (allUniqueTags.length === 0) {
        filterTagsListDiv.innerHTML = '<p>No tags available for filtering.</p>';
        return;
    }

    allUniqueTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag', 'filter-tag');
        tagSpan.textContent = tag;

        // Add click listener to toggle filter
        tagSpan.addEventListener('click', () => {
            toggleFilterTag(tag);
        });

        // Add 'selected' class if the tag is in activeFilterTags
        if (activeFilterTags.includes(tag)) {
            tagSpan.classList.add('selected');
        }

        filterTagsListDiv.appendChild(tagSpan);
    });
}

// Function to toggle a tag in the active filter list
function toggleFilterTag(tag) {
    const index = activeFilterTags.indexOf(tag);
    if (index > -1) {
        // Tag is already in filter, remove it
        activeFilterTags.splice(index, 1);
    } else {
        // Tag is not in filter, add it
        activeFilterTags.push(tag);
    }

    console.log('Active filter tags:', activeFilterTags);

    // Re-render filter tags to update selection style
    renderFilterTags();

    // Re-display entries with the new filter
    displayEntries(loadedEntries); // Use the stored loadedEntries
} 