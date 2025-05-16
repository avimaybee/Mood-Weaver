---
description: 
globs: 
alwaysApply: true
---
# Project Tech Stack: Mood Weaver (Simple Beginner Prototype)

This document outlines the core technologies used in the Mood Weaver web application prototype. The aim is to use simple, free-tier friendly services and fundamental web development technologies to build a basic personal sentiment journal.

# Frontend Technologies:

*   **HTML5:** Used for the basic structure and layout of the web pages (authentication forms, journal entry form, journal list display).
*   **CSS3:** Used for applying styles to the HTML elements, controlling the visual appearance and layout (basic styling, no frameworks).
*   **JavaScript:** Used for all client-side logic, including handling user input, interacting with Firebase SDKs, dynamically updating the UI based on application state (like login status or displaying journal entries).
*   **Firebase JavaScript SDK:** Integrated into the frontend JavaScript to connect the client-side application to Firebase services (Authentication, Firestore).

## Backend Technologies:

*   **Firebase Firestore:** Served as the primary NoSQL cloud database. Used to store user accounts (managed by Firebase Auth) and journal entries. Each journal entry document stores the content, timestamp, user ID, and the calculated mood score.
*   **Render** to process backend code
*   

## Firebase Services & Deployment:

*   **Firebase Authentication:** Manages user accounts (specifically Email/Password sign-up and login). Secures access to user-specific data.
*   **Firebase Hosting:** Used to deploy and serve the static frontend files (HTML, CSS, JavaScript) over a global Content Delivery Network (CDN).


*   **Firebase Security Rules (Firestore):** Configured to protect user data in Firestore, ensuring users can only read and write their *own* journal entries.