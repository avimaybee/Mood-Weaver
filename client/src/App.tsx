import React, { useState, useEffect } from 'react';
import './App.css';
import AuthView from './components/Auth/AuthView';
import { JournalProvider, useJournalEntries } from './contexts/JournalContext';
import AddEntryForm from './components/JournalEntry/AddEntryForm';
import JournalEntryList from './components/JournalEntry/JournalEntryList';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  const { currentUser } = useAuth();

  // Dark mode state and logic (migrated from original script.js)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage, default to false (light mode)
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
  }, [isDarkMode]); // Re-run effect when isDarkMode state changes

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  return (
    <AuthProvider>
      <JournalProvider>
        <BrowserRouter>
          <div className="App bg-background text-textPrimary font-sans min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className="fixed top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-md"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                // Sun icon for light mode (currently in dark mode)
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                // Moon icon for dark mode (currently in light mode)
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <AuthView />

            {/* Define Routes */}
            <Routes>
              {/* Main Journal View Route */}
              <Route path="/" element={currentUser ? <JournalView /> : <Navigate to="/login" />} />

              {/* Placeholder/Login Route (AuthView handles conditional rendering internally for now, but good to have a route) */}
              {/* We might refine this routing later to handle login/redirects more explicitly with React Router */}
              <Route path="/login" element={<AuthView />} />

              {/* Add other routes as needed later, e.g., for individual entry views, settings, etc. */}
               {/* Example Placeholder: */}
               {/* <Route path="/entry/:id" element={currentUser ? <JournalEntryDetail /> : <Navigate to="/login" />} /> */}
               {/* <Route path="/settings" element={currentUser ? <SettingsPage /> : <Navigate to="/login" />} /> */}

            </Routes>

          </div>
        </BrowserRouter>
      </JournalProvider>
    </AuthProvider>
  );
}

// New component to hold the main journal view content
const JournalView: React.FC = () => {
    const { currentUser } = useAuth();
    const { availableTags, activeFilterTags, toggleFilterTag, clearFilterTags, searchQuery, setSearchQuery, clearSearchQuery, loading, entries, displayStatusMessage } = useJournalEntries(); // Fetch search state and functions

    const [statusMessage, setStatusMessage] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Effect to clear status message after a few seconds
    useEffect(() => {
      if (statusMessage) {
        const timer = setTimeout(() => {
          setStatusMessage(null);
        }, 3000); // Clear after 3 seconds
        return () => clearTimeout(timer);
      }
    }, [statusMessage]);

    // Function to display status message (will be passed to context)
    // Removed redundant displayStatusMessage function definition here

     // Ensure currentUser is available if this route is accessed (should be protected by router)
    if (!currentUser) {
        return <p>Please log in to view your journal.</p>; // Should be rare if router protection works
    }

    return (
        <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Journal Entries</h2>

            {/* Status Message Display */}
            {statusMessage && (
              <div className={`mt-4 p-3 rounded-md ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} transition-opacity duration-500 ease-out opacity-100`}>
                {statusMessage.message}
              </div>
            )}

            <AddEntryForm />

            {/* Filtering and Search Controls */}
            <div className="mt-6 p-4 border border-border rounded-lg shadow-sm bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <h3 className="text-lg font-medium mb-2 md:mb-0 col-span-full">Filter & Search</h3>

                {/* Tag Filtering */}
                <div className="col-span-1">
                    <p className="text-sm font-medium text-gray-700 mb-1">Filter by Tags:</p>
                    <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => (
                            <span
                                key={tag}
                                className={`tag cursor-pointer px-3 py-1 rounded-full text-sm ${activeFilterTags.includes(tag) ? 'bg-primary text-textOnColored shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors duration-200`}
                                onClick={() => toggleFilterTag(tag)}
                            >
                                {tag}
                            </span>
                        ))}
                        {activeFilterTags.length > 0 && (
                            <button onClick={clearFilterTags} className="px-3 py-1 rounded-full text-sm bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 shadow-sm">Clear Filters</button>
                        )}
                    </div>
                </div>

                {/* Search Input */}
                <div className="col-span-1">
                    <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">Search Entries:</label>
                    <input
                        id="search-input"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by title, content, tags..."
                        className="w-full p-2 border border-border rounded-md focus:ring-primary focus:border-primary text-textPrimary"
                    />
                    {searchQuery && (
                        <p className="mt-1 text-sm text-textSecondary">Searching for: "{searchQuery}" <button onClick={clearSearchQuery} className="ml-2 text-red-600 hover:text-red-700">Clear Search</button></p>
                    )}
                </div>
            </div>

            {/* Journal Entries List */}
            <div className="mt-6">
                {loading ? (
                    <p>Loading entries...</p>
                ) : entries.length > 0 ? (
                    <JournalEntryList />
                ) : (
                    <p>{activeFilterTags.length > 0 || searchQuery ? 'No entries match your criteria.' : 'No journal entries yet.'}</p>
                )}
            </div>
        </div>
    );
};

export default App;
