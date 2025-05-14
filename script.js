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

let currentUser = null;
let entriesListener = null; // To hold the Firestore listener

// --- Keyword-Based Mood Scoring Logic (Client-Side) --- 
const positiveKeywords = ['happy', 'good', 'great', 'love', 'joy', 'awesome', 'excited', 'wonderful', 'pleased', 'blessed', 
    'fantastic', 'amazing', 'excellent', 'positive', 'optimistic', 'cheerful', 'thrilled', 'delighted', 'satisfied', 'grateful',
    'supportive', 'caring', 'kind', 'friendly', 'peaceful', 'calm', 'relaxed', 'comfortable', 'energetic', 'lively',
    'beautiful', 'pretty', 'lovely', 'bright', 'sunny', 'vibrant', 'successful', 'achieved', 'accomplished', 'improved',
    'strong', 'confident', 'hopeful', 'inspired', 'motivated', 'proud', 'thankful', 'fortunate', 'lucky', 'valued',
    'connected', 'belonging', 'understood', 'appreciated', 'respected', 'safe', 'secure', 'content', 'eager', 'ready',
    'clean', 'fresh', 'pure', 'healthy', 'well', 'fit', 'stronger', 'better', 'improved', 'progress',
    'fun', 'playful', 'amused', 'entertained', 'joyful', 'upbeat', 'spirited', 'optimistic', 'bright', 'shiny'];

const negativeKeywords = ['sad', 'bad', 'angry', 'hate', 'stress', 'terrible', 'awful', 'worried', 'frustrated', 'lonely',
    'unhappy', 'poor', 'terrible', 'dislike', 'sorrow', 'anxious', 'upset', 'miserable', 'dissatisfied', 'ungrateful',
    'unsupportive', 'uncaring', 'unkind', 'unfriendly', 'stressful', 'tense', 'nervous', 'uncomfortable', 'tired', 'lethargic',
    'ugly', 'unpleasant', 'dark', 'gloomy', 'dull', 'failed', 'lost', 'stuck', 'worse', 'declined',
    'weak', 'insecure', 'hopeless', 'uninspired', 'unmotivated', 'ashamed', 'unthankful', 'unfortunate', 'unlucky', 'unvalued',
    'disconnected', 'isolated', 'misunderstood', 'unappreciated', 'disrespected', 'unsafe', 'insecure', 'discontent', 'reluctant', 'hesitant',
    'dirty', 'stale', 'impure', 'unhealthy', 'unwell', 'unfit', 'weaker', 'worse', 'declined', 'regress',
    'boring', 'dull', 'unamused', 'unentertained', 'gloomy', 'downcast', 'listless', 'pessimistic', 'dark', 'cloudy'];
    
const negationWords = ['not', "don't", "isn't", "weren't", "wasn't", "couldn't", "wouldn't", "shouldn't", "haven't", "hasn't", "hadn't", 'won\'t', 'wouldn\'t', 'can\'t', 'cannot', 'no', 'never'];

function calculateMoodScore(content) {
    let score = 0;
    // Convert to lowercase and split into words for easier processing
    const words = content.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);

    words.forEach((word, index) => {
        // Check for positive keywords
        if (positiveKeywords.includes(word)) {
            // Check if the previous word is a negation word
            if (index > 0 && negationWords.includes(words[index - 1])) {
                score--; // Negated positive word contributes negatively
            } else {
                score++; // Non-negated positive word contributes positively
            }
        }

        // Check for negative keywords
        if (negativeKeywords.includes(word)) {
             // Check if the previous word is a negation word
            if (index > 0 && negationWords.includes(words[index - 1])) {
                score++; // Negated negative word contributes positively
            } else {
                score--; // Non-negated negative word contributes negatively
            }
        }
    });

    return score;
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

// Save New Entry
journalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const entryText = journalEntryInput.value.trim();
    entrySuccessMessage.textContent = ''; // Clear previous message

    if (!entryText) {
        alert('Please write something in your entry.');
        return;
    }

    if (!currentUser) {
        alert('You must be logged in to save an entry.');
        return;
    }

    // Calculate mood score client-side (can still be useful for quick display or fallback)
    const moodScore = calculateMoodScore(entryText);

    const entryObject = {
        userId: currentUser.uid,
        content: entryText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        moodScore: moodScore, // Store the client-calculated score
        aiAnalysis: null // Placeholder for AI analysis, to be updated
    };

    let newEntryRef;

    // Save to user's specific entries subcollection
    db.collection('users').doc(currentUser.uid).collection('entries').add(entryObject)
        .then((docRef) => {
            newEntryRef = docRef; // Store the document reference
            console.log('Entry saved with ID:', docRef.id);
            journalEntryInput.value = ''; // Clear the textarea
            entrySuccessMessage.textContent = 'Entry saved! Analyzing with AI...';
            // Now call the AI backend for the new entry
            return fetch('https://mood-weaver-ai-backend.onrender.com/analyze-entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ entryContent: entryText })
            });
        })
        .then(response => {
            if (!response.ok) {
                // If backend returns an error, log it but don't block UI too much
                // The entry is saved, AI analysis just failed for now
                response.json().then(errData => {
                    console.error('AI analysis error from backend:', errData);
                    entrySuccessMessage.textContent = 'Entry saved. AI analysis failed.';
                }).catch(() => {
                    console.error('AI analysis error from backend (non-JSON response):', response.status);
                    entrySuccessMessage.textContent = 'Entry saved. AI analysis failed (server error).';
                });
                return null; // Indicate AI analysis failed for now
            }
            return response.json();
        })
        .then(aiData => {
            if (aiData && newEntryRef) {
                if (aiData.error) {
                    console.warn('AI Analysis returned an error object:', aiData.error);
                    entrySuccessMessage.textContent = `Entry saved. AI analysis issue: ${aiData.error}`;
                    // Optionally, save the error state to Firestore
                    return newEntryRef.update({ 
                        aiAnalysis: { error: aiData.error, details: aiData.details || 'No details' } 
                    });
                } else {
                    console.log('AI Analysis successful:', aiData);
                    entrySuccessMessage.textContent = 'Entry saved and AI analysis complete!';
                    // Update the Firestore document with the AI analysis results
                    return newEntryRef.update({ aiAnalysis: aiData });
                }
            } else if (!aiData && newEntryRef) {
                // This case might occur if the backend response was not ok and returned null earlier.
                // The error was already logged.
            }
        })
        .catch((error) => {
            console.error('Error saving entry or during AI analysis fetch:', error);
            entrySuccessMessage.textContent = 'Failed to save entry or AI analysis error.';
            // alert('Failed to save entry or AI analysis error. Please try again.');
        })
        .finally(() => {
            // Clear the success/error message after some time
            setTimeout(() => { entrySuccessMessage.textContent = ''; }, 5000);
        });
});

// Load and Display Entries (Real-time)
function loadJournalEntries() {
    if (!currentUser) return;
    console.log('Loading journal entries for user:', currentUser.uid);

    // Detach any existing listener before attaching a new one
    if (entriesListener) {
        entriesListener();
        console.log('Detached previous Firestore listener.');
    }

    const entriesQuery = db.collection('users').doc(currentUser.uid).collection('entries')
        .orderBy('timestamp', 'desc');

    // Attach real-time listener
    entriesListener = entriesQuery.onSnapshot(snapshot => {
        console.log(`Received ${snapshot.docs.length} entries from Firestore.`);
        entriesList.innerHTML = ''; // Clear current list
        if (snapshot.empty) {
            entriesList.innerHTML = '<p>No entries yet. Write one above!</p>';
            return;
        }

        snapshot.forEach(doc => {
            const entry = doc.data();
            const entryId = doc.id;
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('entry');
            entryDiv.dataset.id = entryId; // Store ID if needed later

            const contentP = document.createElement('p');
            contentP.textContent = entry.content;

            const timestampSpan = document.createElement('span');
            timestampSpan.classList.add('timestamp');
            timestampSpan.textContent = entry.timestamp ? entry.timestamp.toDate().toLocaleString() : 'Saving...';

            entryDiv.appendChild(contentP);
            entryDiv.appendChild(timestampSpan);
            entryDiv.appendChild(document.createElement('br'));

            // Display Client-Side Mood Score (optional, can be removed if AI score is preferred)
            const moodScoreSpan = document.createElement('span');
            moodScoreSpan.classList.add('mood-score');
            moodScoreSpan.textContent = `Initial Score: ${entry.moodScore === null || entry.moodScore === undefined ? 'N/A' : entry.moodScore}`;
            entryDiv.appendChild(moodScoreSpan);
            entryDiv.appendChild(document.createElement('br'));

            // Display AI Analysis from Firestore
            const aiInsightsDiv = document.createElement('div');
            aiInsightsDiv.classList.add('ai-insights');

            if (entry.aiAnalysis) {
                if (entry.aiAnalysis.error) {
                    aiInsightsDiv.innerHTML = `<p><strong>AI Analysis:</strong> Error - ${entry.aiAnalysis.error}</p>`;
                } else {
                    let insightsHtml = '<p><strong>AI Insights:</strong></p>';
                    if (entry.aiAnalysis.keySentimentSummary) {
                        insightsHtml += `<p>Summary: ${entry.aiAnalysis.keySentimentSummary}</p>`;
                    }
                    if (entry.aiAnalysis.dominantThemes && entry.aiAnalysis.dominantThemes.length > 0) {
                        insightsHtml += `<p>Themes: ${entry.aiAnalysis.dominantThemes.join(', ')}</p>`;
                    }
                    if (entry.aiAnalysis.highlight) {
                        insightsHtml += `<p>Highlight: \"${entry.aiAnalysis.highlight}\"</p>`;
                    }
                    if (entry.aiAnalysis.reflectivePrompt) {
                        insightsHtml += `<p>To Consider: ${entry.aiAnalysis.reflectivePrompt}</p>`;
                    }
                    if (entry.aiAnalysis.simpleScore !== null && entry.aiAnalysis.simpleScore !== undefined) {
                        insightsHtml += `<p>AI Score: ${entry.aiAnalysis.simpleScore}</p>`;
                    }
                    aiInsightsDiv.innerHTML = insightsHtml;
                }
            } else if (entry.timestamp) { // Only show this if it's not a brand new entry still processing
                aiInsightsDiv.innerHTML = '<p>AI analysis not yet available or not applicable for this entry.</p>';
            } else {
                 aiInsightsDiv.innerHTML = '<p>Processing AI analysis...</p>'; // For brand new entries before AI data is back
            }
            entryDiv.appendChild(aiInsightsDiv);

            entriesList.appendChild(entryDiv);
        });
    }, error => {
        console.error('Error fetching entries:', error);
        entriesList.innerHTML = '<p class="error-message">Could not load entries. Please refresh.</p>';
    });
    console.log('Attached Firestore listener for entries.');
} 