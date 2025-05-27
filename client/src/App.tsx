import React, { useState, useEffect } from 'react';
// import './App.css'; // Assuming your global CSS is imported in main.tsx/jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { JournalProvider } from './contexts/JournalContext';
import AuthView from './components/Auth/AuthView';
import JournalView from './components/JournalEntry/JournalView'; // Correctly import JournalView

// Material UI Icons for dark mode toggle
import Brightness4Icon from '@mui/icons-material/Brightness4'; // Represents moon/dark mode
import Brightness7Icon from '@mui/icons-material/Brightness7'; // Represents sun/light mode


// This component will handle the top-level app structure, routing, and dark mode toggle.
function App() {
  const { currentUser } = useAuth(); // Call useAuth() inside App because it's wrapped by AuthProvider

  // Dark mode state and logic
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  // Effect to apply theme class to body and update localStorage
  useEffect(() => {
    const body = document.body;
    if (isDarkMode) {
      body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  return (
    <AuthProvider>
      <JournalProvider>
        <BrowserRouter>
          {/* Main App Container with global styling */}
          {/* Using bg-background, text-textPrimary, font-sans as defined in your theme */}
          <div className="App bg-background text-textPrimary font-sans min-h-screen p-6 md:p-8 max-w-4xl mx-auto">
            {/* Dark Mode Toggle Button - Positioned fixed within the viewport */}
            <button
              onClick={toggleDarkMode}
              // Corrected className syntax: using a single template literal for multiline classes
              className={`fixed top-4 right-4 p-2 rounded-full shadow-md transition-colors duration-200
                         bg-surface text-textSecondary hover:bg-background hover:text-primary`}
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                // Material UI Sun icon (used when currently in dark mode)
                <Brightness7Icon sx={{ fontSize: 24 }} />
              ) : (
                // Material UI Moon icon (used when currently in light mode)
                <Brightness4Icon sx={{ fontSize: 24 }} />
              )}
            </button>

            {/*
              Define Routes:
              - '/' route is protected: shows JournalView if logged in, otherwise redirects to /login.
              - '/login' route explicitly shows AuthView.
            */}
            <Routes>
              {/* Login/Signup Route (Public) */}
              <Route path="/login" element={<AuthView />} />

              {/* Main Journal Route (Protected) */}
              <Route
                path="/"
                element={currentUser ? <JournalView /> : <Navigate to="/login" />}
              />

              {/* Add other routes as needed later, e.g., for individual entry views, settings, etc. */}
              {/* <Route path="/edit/:id" element={currentUser ? <JournalEntryEdit /> : <Navigate to="/login" />} /> */}
              {/* <Route path="/settings" element={currentUser ? <SettingsPage /> : <Navigate to="/login" />} /> */}

              {/* Catch-all route for 404 - optional */}
              {/* <Route path="*" element={<div>404 Not Found</div>} /> */}
            </Routes>

          </div>
        </BrowserRouter>
      </JournalProvider>
    </AuthProvider>
  );
}

export default App;
