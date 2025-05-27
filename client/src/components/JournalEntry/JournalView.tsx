// src/components/JournalEntry/JournalView.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Correct import syntax and path
import { useJournalEntries } from '../../contexts/JournalContext'; // FIX: Correct import syntax and path
import AddEntryForm from './AddEntryForm'; // Assuming in same folder: components/JournalEntry/
import JournalEntryList from './JournalEntryList'; // Assuming in same folder: components/JournalEntry/

// Material UI Icons for JournalView's buttons/elements
import ClearIcon from '@mui/icons-material/Clear'; // For clear search/filters
import SearchIcon from '@mui/icons-material/Search'; // For search input label


const JournalView: React.FC = () => {
    const { currentUser } = useAuth();
    const { availableTags, activeFilterTags, toggleFilterTag, clearFilterTags, searchQuery, setSearchQuery, clearSearchQuery, loading, entries, displayStatusMessage: contextDisplayStatusMessage } = useJournalEntries();

    const [statusMessage, setStatusMessage] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Effect to clear local status message after a few seconds
    useEffect(() => {
      if (statusMessage) {
        const timer = setTimeout(() => {
          setStatusMessage(null);
        }, 3000); // Clear after 3 seconds
        return () => clearTimeout(timer);
      }
    }, [statusMessage]);

    // Function to display status message (will be passed to AddEntryForm)
    const displayLocalStatusMessage = (message: string, type: 'success' | 'error') => {
      setStatusMessage({ message, type });
    };

    // Defensive check: Should be rare if routing protection works, but good practice
    if (!currentUser) {
        return <p className="text-textPrimary text-center">Please log in to view your journal.</p>;
    }

    return (
        <div className="mb-6">
            <h2 className="text-2xl font-semibold text-textPrimary mb-4">My Journal</h2>

            {/* Status Message Display */}
            {statusMessage && (
              <div className={`mt-4 p-3 rounded-md ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} transition-opacity duration-500 ease-out opacity-100`}>
                {statusMessage.message}
              </div>
            )}

            {/* Add New Entry Form */}
            {/* FIX: Passing the displayStatusMessage prop */}
            <AddEntryForm displayStatusMessage={displayLocalStatusMessage} />

            {/* Filtering and Search Controls */}
            <div className="mt-6 p-4 rounded-lg shadow-card bg-surface border border-border grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <h3 className="text-lg font-medium text-textPrimary mb-2 md:mb-0 col-span-full">Filter & Search</h3>

                {/* Tag Filtering */}
                <div className="col-span-1">
                    <p className="text-sm font-medium text-textPrimary mb-2">Filter by Tags:</p>
                    <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag: string) => (
                            <span
                                key={tag}
                                className={`tag cursor-pointer px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200
                                            ${activeFilterTags.includes(tag) ? 'bg-primary text-white shadow-sm' : 'bg-background text-textPrimary border border-border hover:bg-border'}`}
                                onClick={() => toggleFilterTag(tag)}
                            >
                                {tag}
                            </span>
                        ))}
                        {activeFilterTags.length > 0 && (
                            <button onClick={clearFilterTags} className="px-3 py-1 rounded-full text-sm bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 shadow-sm">
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Input */}
                <div className="col-span-1">
                    <label htmlFor="search-input" className="block text-sm font-medium text-textPrimary mb-2 flex items-center gap-2">
                        <SearchIcon sx={{ fontSize: 18 }} /> Search Entries:
                    </label>
                    <input
                        id="search-input"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by title, content, tags..."
                        className="w-full p-2 border border-border rounded-md focus:ring-primary focus:border-primary text-textPrimary bg-input"
                    />
                    {searchQuery && (
                        <p className="mt-1 text-sm text-textSecondary">Searching for: "{searchQuery}"
                            <button onClick={clearSearchQuery} className="ml-2 text-red-600 hover:text-red-700 inline-flex items-center gap-1">
                                <ClearIcon sx={{ fontSize: 16 }} /> Clear Search
                            </button>
                        </p>
                    )}
                </div>
            </div>

            {/* Journal Entries List */}
            <div className="mt-6">
                {loading ? (
                    <p className="text-textSecondary text-center">Loading entries...</p>
                ) : entries.length > 0 ? (
                    <JournalEntryList />
                ) : (
                    <p className="text-textSecondary text-center">{activeFilterTags.length > 0 || searchQuery ? 'No entries match your criteria.' : 'No journal entries yet. Start by adding one above!'}</p>
                )}
            </div>
        </div>
    );
};

export default JournalView;