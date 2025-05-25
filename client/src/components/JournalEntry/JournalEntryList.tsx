import React from 'react';
import { useJournalEntries } from '../../contexts/JournalContext';
import JournalEntryItem from './JournalEntryItem';

const JournalEntryList: React.FC = () => {
  const { entries, loading } = useJournalEntries(); // Fetch entries and loading state from context

  if (loading) {
    return <p>Loading entries...</p>;
  }

  if (entries.length === 0) {
    return <p>No journal entries yet.</p>;
  }

  return (
    <div className="journal-entry-list">
      <h2>Journal Entries</h2>
      {entries.map(entry => (
        <JournalEntryItem key={entry.id} entry={entry} />
      ))}
    </div>
  );
};

export default JournalEntryList; 