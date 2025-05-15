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
const logoutButton = document.getElementById('logout-button');
const journalForm = document.getElementById('journal-form');
const journalEntryInput = document.getElementById('journal-entry');
const entrySuccessMessage = document.getElementById('entry-success');
const entriesList = document.getElementById('entries-list');
const saveEntryButton = document.getElementById('save-entry-button'); // Get the save/update button
const cancelEditButton = document.getElementById('cancel-edit-button'); // Get the cancel edit button

let currentUser = null;
let entriesListener = null; // To hold the Firestore listener
let editingEntryId = null; // To store the ID of the entry being edited

// --- Utility Functions ---
function formatDisplayTimestamp(firebaseTimestamp) {
    if (!firebaseTimestamp || !firebaseTimestamp.toDate) {
        return 'Date not available';
    }
    const date = firebaseTimestamp.toDate();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

    const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (date >= today) {
        return `Today, ${timeString}`;
    } else if (date >= yesterday) {
        return `Yesterday, ${timeString}`;
    } else if (date >= oneWeekAgo) {
        // Display day of the week for recent past days
        const dayName = date.toLocaleDateString([], { weekday: 'short' });
        return `${dayName}, ${timeString}`;
    } else {
        // Older dates: Month Day, Year, Time
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + timeString;
    }
}

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
        userEmailDisplay.textContent = user.email;
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
    userEmailDisplay.textContent = currentUser.email;
    authContainer.style.display = 'none';
    journalContainer.style.display = 'block';
    loadJournalEntries();
}

// --- Journal Logic --- 

// Function to set the form to edit mode
function setEditMode(entry) {
    journalEntryInput.value = entry.content;
    saveEntryButton.textContent = 'Update Entry';
    cancelEditButton.style.display = 'inline-block';
    journalForm.classList.add('edit-mode'); // Optional: for CSS styling
    editingEntryId = entry.id;
    journalEntryInput.focus();
}

// Function to reset the form from edit mode
function resetFormMode() {
    journalEntryInput.value = '';
    saveEntryButton.textContent = 'Save Entry';
    cancelEditButton.style.display = 'none';
    journalForm.classList.remove('edit-mode');
    editingEntryId = null;
    entrySuccessMessage.textContent = ''; // Clear any messages
}

// Event listener for the Cancel Edit button
cancelEditButton.addEventListener('click', () => {
    resetFormMode();
});

// Handle journal entry submission (Create or Update)
journalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const entryContent = journalEntryInput.value.trim();
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

    if (editingEntryId) {
        // --- UPDATE EXISTING ENTRY ---
        entrySuccessMessage.textContent = 'Updating entry and re-analyzing...';

        db.collection('users').doc(currentUser.uid).collection('entries').doc(editingEntryId).update({
            content: entryContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            // Reset AI fields for re-analysis by the backend
            aiTitle: "Re-analyzing title...",
            aiGreeting: "Re-analyzing greeting...",
            aiObservation1: "Re-analyzing observation 1...",
            aiObservation2: "Re-analyzing observation 2...",
            aiReflectivePrompt: "Re-analyzing reflective prompt...",
            aiScore: null, // Reset score
            aiSentimentNarrative: "Re-analyzing sentiment narrative...", // New field
            aiTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            analysisError: null // Clear any previous error
        })
        .then(() => {
            console.log('Entry updated in Firestore, AI fields reset for re-analysis.');
            entrySuccessMessage.textContent = 'Entry updated! AI analysis is refreshing.';
            // Frontend will automatically re-fetch and display updated AI insights via onSnapshot
            // No need to call fetch here directly anymore as the backend handles all AI.
        })
        .catch((error) => {
            console.error('Error updating journal entry or during AI re-analysis:', error);
            entrySuccessMessage.textContent = 'Failed to update entry or AI re-analysis error.';
            // Optionally update Firestore with a general update error if needed
        })
        .finally(() => {
            saveEntryButton.disabled = false;
            setTimeout(() => { entrySuccessMessage.textContent = ''; }, 7000);
        });

    } else {
        // --- CREATE NEW ENTRY --- (existing logic, slightly adapted)
        entrySuccessMessage.textContent = 'Saving entry and analyzing...';
        console.log('Attempting to add new entry for user:', currentUser.uid);

        db.collection('users').doc(currentUser.uid).collection('entries').add({
            userId: currentUser.uid,
            content: entryContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            // Initialize AI fields - backend will populate them
            aiTitle: "Analyzing title...",
            aiGreeting: "Analyzing greeting...",
            aiObservation1: "Analyzing observation 1...",
            aiObservation2: "Analyzing observation 2...",
            aiReflectivePrompt: "Analyzing reflective prompt...",
            aiScore: null,
            aiSentimentNarrative: "Analyzing sentiment narrative...", // New field
            aiTimestamp: null, // Will be set by backend after analysis
            analysisError: null
        })
        .then((docRef) => {
            console.log('New entry skeleton saved to Firestore with ID:', docRef.id);
            entrySuccessMessage.textContent = 'Entry saved! AI analysis in progress.';
            // The onSnapshot listener will pick up the initial save and then the AI-populated update.
            // No explicit fetch call needed here as backend triggers analysis and updates the doc.
        })
        .catch((error) => {
            console.error('Error during new entry processing or AI analysis:', error);
            if (!entrySuccessMessage.textContent.includes('failed') && !entrySuccessMessage.textContent.includes('issue')) {
                 entrySuccessMessage.textContent = 'Failed to process new entry fully.';
            }
            if (docRef && !error.toString().includes('AI analysis')) {
                docRef.update({ 
                    aiError: `Frontend error on new entry: ${error.message}`,
                    aiTimestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(updateError => console.error("Failed to update new entry with error state:", updateError));
            }
        })
        .finally(() => {
            saveEntryButton.disabled = false;
            if (!editingEntryId) journalEntryInput.value = ''; // Clear only if not in edit mode (though resetFormMode handles it for edits)
            setTimeout(() => { entrySuccessMessage.textContent = ''; }, 7000);
        });
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
        entriesList.innerHTML = ''; 
        if (snapshot.empty) {
            entriesList.innerHTML = '<p>No entries yet. Write one above!</p>';
            if (editingEntryId) resetFormMode(); // If editing and all entries are deleted, reset form
            return;
        }

        snapshot.forEach(doc => {
            const entry = doc.data();
            const entryId = doc.id;
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('entry');
            entryDiv.dataset.id = entryId;

            // AI Title: Only display if it's a real title and not a placeholder
            if (entry.aiTitle && !entry.aiTitle.toLowerCase().includes("analyzing")) {
                const titleH3 = document.createElement('h3');
                titleH3.classList.add('entry-ai-title');
                titleH3.textContent = entry.aiTitle;
                entryDiv.appendChild(titleH3);
            }

            const contentP = document.createElement('p');
            contentP.classList.add('entry-content');
            contentP.textContent = entry.content;
            entryDiv.appendChild(contentP);

            const timestampSpan = document.createElement('span');
            timestampSpan.classList.add('timestamp');
            timestampSpan.textContent = entry.timestamp ? formatDisplayTimestamp(entry.timestamp) : 'Saving...';
            entryDiv.appendChild(timestampSpan);
            entryDiv.appendChild(document.createElement('br'));

            const aiInsightsDiv = document.createElement('div');
            aiInsightsDiv.classList.add('ai-insights');

            if (entry.aiError) {
                aiInsightsDiv.innerHTML = `<p class="ai-error"><strong>AI Analysis Error:</strong> ${entry.aiError}</p>`;
            } else if (entry.aiTimestamp || entry.aiGreeting) { // Check if any AI data might be present or coming
                // Clear previous insights before adding new ones for this entry
                aiInsightsDiv.innerHTML = ''; // Clear out "Processing..." or old data

                let hasContent = false;

                if (entry.aiGreeting && !entry.aiGreeting.toLowerCase().includes("analyzing")) {
                    const greetingP = document.createElement('p');
                    greetingP.classList.add('ai-greeting');
                    greetingP.textContent = entry.aiGreeting;
                    aiInsightsDiv.appendChild(greetingP);
                    hasContent = true;
                }
                if (entry.aiObservation1 && !entry.aiObservation1.toLowerCase().includes("analyzing")) {
                    const observation1P = document.createElement('p');
                    observation1P.classList.add('ai-observation');
                    observation1P.textContent = entry.aiObservation1; // Removed "Observation 1:" prefix for cleaner look
                    aiInsightsDiv.appendChild(observation1P);
                    hasContent = true;
                }
                if (entry.aiObservation2 && !entry.aiObservation2.toLowerCase().includes("analyzing")) {
                    const observation2P = document.createElement('p');
                    observation2P.classList.add('ai-observation');
                    observation2P.textContent = entry.aiObservation2; // Removed "Observation 2:" prefix
                    aiInsightsDiv.appendChild(observation2P);
                    hasContent = true;
                }
                if (entry.aiSentimentNarrative && !entry.aiSentimentNarrative.toLowerCase().includes("analyzing")) {
                    const narrativeP = document.createElement('p');
                    narrativeP.classList.add('ai-sentiment-narrative');
                    narrativeP.textContent = entry.aiSentimentNarrative;
                    aiInsightsDiv.appendChild(narrativeP);
                    hasContent = true;
                }
                if (entry.aiReflectivePrompt && !entry.aiReflectivePrompt.toLowerCase().includes("analyzing")) {
                    const promptP = document.createElement('p');
                    promptP.classList.add('ai-reflective-prompt');
                    promptP.textContent = entry.aiReflectivePrompt; // Removed "Reflect:" prefix
                    aiInsightsDiv.appendChild(promptP);
                    hasContent = true;
                }

                if (entry.aiScore !== null && entry.aiScore !== undefined) {
                    const scoreP = document.createElement('p');
                    scoreP.classList.add('ai-score');
                    scoreP.innerHTML = `<strong>Overall Feeling Score:</strong> ${entry.aiScore} <span class="ai-score-explanation"> (from -5 very challenging to +5 very positive)</span>`;
                    aiInsightsDiv.appendChild(scoreP);
                    hasContent = true;
                }

                if (entry.aiTimestamp) {
                    const aiTimestampP = document.createElement('p');
                    aiTimestampP.classList.add('ai-timestamp');
                    aiTimestampP.textContent = `Analyzed on: ${formatDisplayTimestamp(entry.aiTimestamp)}`;
                    aiInsightsDiv.appendChild(aiTimestampP);
                    hasContent = true; 
                }
                
                // If no actual AI content was added (e.g., all fields were "analyzing..."), show processing.
                if (!hasContent && entry.timestamp) { // entry.timestamp check to ensure it's not a brand new unsaved entry
                     aiInsightsDiv.innerHTML = '<p class="ai-processing">AI analysis in progress...</p>';
                } else if (!hasContent) {
                    aiInsightsDiv.innerHTML = '<p class="ai-unavailable">AI analysis not yet available.</p>';
                }

            } else if (entry.timestamp) { // If no AI data at all yet, but entry is saved
                aiInsightsDiv.innerHTML = '<p class="ai-processing">AI analysis in progress...</p>';
            } else { // Fallback for entries that are somehow missing everything
                aiInsightsDiv.innerHTML = '<p class="ai-unavailable">AI analysis not yet available.</p>';
            }
            entryDiv.appendChild(aiInsightsDiv);

            const controlsDiv = document.createElement('div');
            controlsDiv.classList.add('entry-controls');

            const editButton = document.createElement('button');
            editButton.classList.add('edit-entry-button');
            editButton.textContent = 'Edit';
            editButton.dataset.id = entryId;
            editButton.addEventListener('click', () => handleEditEntry(entryId)); // Attach listener

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-entry-button');
            deleteButton.textContent = 'Delete';
            deleteButton.dataset.id = entryId;
            deleteButton.addEventListener('click', () => handleDeleteEntry(entryId)); // Attach listener

            controlsDiv.appendChild(editButton);
            controlsDiv.appendChild(deleteButton);
            entryDiv.appendChild(controlsDiv);

            entriesList.appendChild(entryDiv);
        });
         // If the currently edited entry is no longer in the snapshot (e.g., deleted by another client), reset form.
        if (editingEntryId && !snapshot.docs.find(doc => doc.id === editingEntryId)) {
            console.log(`Edited entry ${editingEntryId} no longer found. Resetting form.`);
            resetFormMode();
        }
    }, error => {
        console.error('Error fetching entries:', error);
        entriesList.innerHTML = '<p class="error-message">Could not load entries. Please refresh.</p>';
        if (editingEntryId) resetFormMode(); // Also reset form on general fetch error if editing
    });
    console.log('Attached Firestore listener for entries.');
} 