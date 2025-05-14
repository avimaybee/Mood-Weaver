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

    // Calculate mood score client-side
    const moodScore = calculateMoodScore(entryText);

    const entryObject = {
        userId: currentUser.uid,
        content: entryText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        moodScore: moodScore // Use the calculated score
    };

    // Save to user's specific entries subcollection
    db.collection('users').doc(currentUser.uid).collection('entries').add(entryObject)
        .then((docRef) => {
            console.log('Entry saved with ID:', docRef.id);
            journalEntryInput.value = ''; // Clear the textarea
            entrySuccessMessage.textContent = 'Entry saved!';
            setTimeout(() => { entrySuccessMessage.textContent = ''; }, 3000); // Clear message after 3s
        })
        .catch((error) => {
            console.error('Error saving entry:', error);
            alert('Failed to save entry. Please try again.');
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
            // Handle potential null timestamp briefly during creation
            timestampSpan.textContent = entry.timestamp ? entry.timestamp.toDate().toLocaleString() : 'Saving...';

            const moodScoreSpan = document.createElement('span');
            moodScoreSpan.classList.add('mood-score');
            moodScoreSpan.textContent = `Score: ${entry.moodScore === null || entry.moodScore === undefined ? 'Calculating...' : entry.moodScore}`;

            entryDiv.appendChild(contentP);
            entryDiv.appendChild(timestampSpan);
            entryDiv.appendChild(document.createElement('br')); // Line break for clarity
            entryDiv.appendChild(moodScoreSpan);

            // Add a div to display AI insights
            const aiInsightsDiv = document.createElement('div');
            aiInsightsDiv.classList.add('ai-insights');
            aiInsightsDiv.innerHTML = '<p>Loading AI analysis...</p>'; // Initial loading state
            entryDiv.appendChild(aiInsightsDiv);

            entriesList.appendChild(entryDiv);

            // Fetch AI insights from the DEPLOYED local backend
            fetch('https://mood-weaver-ai-backend.onrender.com/analyze-entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ entryContent: entry.content })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(aiData => {
                // Display the AI insights
                aiInsightsDiv.innerHTML = ''; // Clear loading message
                if (aiData.error) {
                    aiInsightsDiv.innerHTML = `<p>Error: ${aiData.error}</p>`;
                    if (aiData.details) {
                         aiInsightsDiv.innerHTML += `<p>Details: ${aiData.details}</p>`;
                    }
                } else {
                    // Format and display the insights
                    let insightsHtml = '<p><strong>AI Insights:</strong></p>';
                    if (aiData.overallMood) {
                        insightsHtml += `<p>Overall Mood: ${aiData.overallMood}</p>`;
                    }
                    if (aiData.activities) {
                        insightsHtml += `<p>Activities: ${aiData.activities}</p>`;
                    }
                    if (aiData.achievements) {
                        insightsHtml += `<p>Achievements: ${aiData.achievements}</p>`;
                    }
                    if (aiData.happyMoments) {
                        insightsHtml += `<p>Happy Moments: ${aiData.happyMoments}</p>`;
                    }
                     if (aiData.sadMoments) {
                        insightsHtml += `<p>Sad Moments: ${aiData.sadMoments}</p>`;
                    }
                     if (aiData.improvementSuggestions) {
                        insightsHtml += `<p>Suggestions: ${aiData.improvementSuggestions}</p>`;
                    }
                     if (aiData.personalInsights) {
                        insightsHtml += `<p>Personal Insights: ${aiData.personalInsights}</p>`;
                    }
                    aiInsightsDiv.innerHTML = insightsHtml;
                }
            })
            .catch(error => {
                console.error('Error fetching AI analysis:', error);
                aiInsightsDiv.innerHTML = '<p>Error fetching AI analysis. Ensure the local backend is running.</p>';
            });
        });
    }, error => {
        console.error('Error fetching entries:', error);
        entriesList.innerHTML = '<p class="error-message">Could not load entries. Please refresh.</p>';
    });
    console.log('Attached Firestore listener for entries.');
} 