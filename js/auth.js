import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";

let currentUser = null; // Manage currentUser state internally or pass it

// Get DOM elements for authentication
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
const userPfpIcon = document.getElementById('user-pfp');

// Function to display user info and switch containers
function handleLoginSuccess(user, onUserLoggedIn) {
    currentUser = user;
    console.log('Auth state changed: Logged in as', user.email);
    userEmailParagraph.innerHTML = '<span id="user-email-display">' + user.email + '</span>';
    authContainer.style.display = 'none';
    journalContainer.style.display = 'block';

    // Handle user profile picture display
    if (user.photoURL) {
        userPfpIcon.src = user.photoURL;
    } else {
        userPfpIcon.src = `https://ui-avatars.com/api/?name=${user.email.charAt(0).toUpperCase()}&background=random&color=fff`;
    }
    userPfpIcon.style.display = 'inline-block';

    // Call the callback provided by the main script
    if (onUserLoggedIn) {
        onUserLoggedIn(user);
    }
}

// Function to clear user info and switch containers
function handleLogout(onUserLoggedOut) {
    currentUser = null;
    console.log('Auth state changed: Logged out');
    authContainer.style.display = 'block';
    journalContainer.style.display = 'none';
    authError.textContent = ''; // Clear any lingering errors
    // entrySuccessMessage.textContent = ''; // This should be handled by the main script or journal module

     // Call the callback provided by the main script
    if (onUserLoggedOut) {
        onUserLoggedOut();
    }
}

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
signupButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = signupEmailInput.value;
    const password = signupPasswordInput.value;
    authError.textContent = ''; // Clear previous errors

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log('Signed up successfully:');
        signupForm.reset();
    } catch (error) {
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
                 userMessage = error.message.startsWith('{') ? 'Sign up failed. Please check your details.' : error.message;
                break;
        }
        authError.textContent = userMessage;
    }
});

// Login
loginButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    authError.textContent = ''; // Clear previous errors

    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Logged in successfully:');
        loginForm.reset();
    } catch (error) {
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
                 userMessage = error.message.startsWith('{') ? 'Login failed. Please check your details.' : error.message;
                break;
        }
        authError.textContent = userMessage;
    }
});

// Logout
logoutButton.addEventListener('click', () => {
    signOut(auth)
        .then(() => {
            console.log('Logged out successfully');
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
});

// Export a function to initialize auth state observer
export function initializeAuth(onUserLoggedIn, onUserLoggedOut) {
     // --- Auth State Change Handler --- 
    onAuthStateChanged(auth, user => {
        if (user) {
            handleLoginSuccess(user, onUserLoggedIn);
        } else {
            handleLogout(onUserLoggedOut);
        }
    });

    // Initial check for authenticated user on page load
    // if (auth.currentUser) {
    //     console.log('Initial check: User already logged in as', auth.currentUser.email);
    //     // No need to call handleLoginSuccess directly here, onAuthStateChanged will fire immediately for the current user.
    // }
}

export function getCurrentUser() {
    return auth.currentUser; // Use auth.currentUser directly for the most up-to-date user state
} 