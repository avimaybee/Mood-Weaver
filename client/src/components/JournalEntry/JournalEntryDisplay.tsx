import React, { useState, useEffect } from 'react';
import { useJournalEntries } from '../../contexts/JournalContext'; // Import useJournalEntries context
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
import { marked } from 'marked'; // Import marked for Markdown rendering
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

// --- JournalEntry Interface ---
// IMPORTANT: Adjust this interface to accurately reflect your Firestore document structure.
// This is crucial for TypeScript to correctly type your 'entry' prop.
interface JournalEntry {
  id: string; // Document ID
  userId: string;
  timestamp: any; // Can be Firebase Timestamp object or a JavaScript Date object after conversion
  userTitle?: string; // User-provided title
  content?: string; // Main entry content (Markdown for text entries)
  tags?: string[]; // Array of tags
  entryType?: 'text' | 'list'; // 'text' or 'list'
  listItems?: { text: string; completed: boolean }[]; // For list entries
  imageUrl?: string; // URL of the uploaded image
  aiTitle?: string; // AI generated title
  aiGreeting?: string; // AI greeting
  aiObservations?: string; // AI observations
  aiSentimentAnalysis?: string; // AI sentiment analysis
  aiReflectivePrompt?: string; // AI reflective prompt
  aiTimestamp?: any; // AI analysis timestamp
  aiError?: string; // AI analysis error message
  lastEdited?: any; // Timestamp for last edit
}

interface JournalEntryDisplayProps {
  entry: JournalEntry;
  // If you need to pass specific handlers from a parent that aren't from context
  // handleEditClick?: (entryId: string) => void;
  // handleDeleteEntryCallback?: (entryId: string) => void;
}

// --- Helper: Format User-Friendly Timestamp (Moved here for self-containment) ---
function formatUserFriendlyTimestamp(firestoreTimestamp: any): string {
  if (!firestoreTimestamp) {
    return 'Date not available';
  }

  const date: Date = (firestoreTimestamp instanceof Date) ? firestoreTimestamp : (firestoreTimestamp.toDate ? firestoreTimestamp.toDate() : null);

  if (!date || isNaN(date.getTime())) {
    console.warn("Invalid timestamp received for formatting:", firestoreTimestamp);
    return 'Invalid Date';
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
  const timeString = date.toLocaleTimeString('en-US', timeOptions);

  const entryDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (entryDateOnly.getTime() === today.getTime()) {
    return `Today, ${timeString}`;
  }
  if (entryDateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday, ${timeString}`;
  }

  const diffTime = today.getTime() - entryDateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0 && diffDays <= 7) {
    return `${diffDays} days ago, ${timeString}`;
  }

  const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (date.getFullYear() !== now.getFullYear()) {
    dateOptions.year = 'numeric';
  }
  return `${date.toLocaleDateString('en-US', dateOptions)} at ${timeString}`;
}


// --- Helper: Apply Formatting (Moved here for self-containment) ---
// This function needs to be outside the component if it's used elsewhere,
// or defined inside if it's strictly a helper for this component.
// For now, it remains here, but ensure it receives the textarea element.
function applyFormatting(textarea: HTMLTextAreaElement, prefix: string, suffix: string, multiline: boolean = false) {
  if (!textarea) return;
  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  const value = textarea.value;
  const selectedText = value.substring(selectionStart, selectionEnd);

  let newText: string = ''; // FIX: Initialize newText to satisfy TypeScript
  let newCursorPosition: number;

  if (multiline) {
    const lines = selectedText.split('\n');
    const formattedLines = lines.map(line => {
      const trimmedLine = line.trim();
      // Only add prefix if line is not empty, and check if prefix already exists to toggle off
      if (trimmedLine === '') { // Preserve empty lines
          return line;
      }
      if (trimmedLine.startsWith(prefix.trim())) {
        return trimmedLine.substring(prefix.trim().length).trimStart();
      }
      return `${prefix}${trimmedLine}`;
    });

    newText = value.substring(0, selectionStart) + formattedLines.join('\n') + value.substring(selectionEnd);
    newCursorPosition = selectionStart + formattedLines.join('\n').length; // Approximate cursor position

  } else {
    // Check if formatting already exists around selected text to toggle off
    const currentPrefix = value.substring(selectionStart - prefix.length, selectionStart);
    const currentSuffix = value.substring(selectionEnd, selectionEnd + suffix.length);

    if (selectedText.length > 0 && currentPrefix === prefix && currentSuffix === suffix) {
      // Toggle off: remove prefix and suffix
      newText = value.substring(0, selectionStart - prefix.length) + selectedText + value.substring(selectionEnd + suffix.length);
      newCursorPosition = selectionStart - prefix.length + selectedText.length;
    } else {
      // Toggle on: add prefix and suffix
      if (selectedText.length === 0) {
        newText = value.substring(0, selectionStart) + prefix + suffix + value.substring(selectionStart);
        newCursorPosition = selectionStart + prefix.length;
      } else {
        newText = value.substring(0, selectionStart) + prefix + selectedText + suffix + value.substring(selectionEnd);
        newCursorPosition = selectionStart + prefix.length + selectedText.length + suffix.length;
      }
    }
  }

  textarea.value = newText;
  textarea.selectionStart = textarea.selectionEnd = newCursorPosition;
  textarea.focus();
  // Call autoResizeTextarea if needed, passing the textarea
  // autoResizeTextarea(textarea); // Assuming this helper is defined globally or passed
}


const JournalEntryDisplay: React.FC<JournalEntryDisplayProps> = ({ entry }): React.ReactElement => {
  // `deleteEntry` is expected to be a function provided by JournalContext
  const { deleteEntry } = useJournalEntries();
  const navigate = useNavigate();

  const [isInsightsExpanded, setIsInsightsExpanded] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [animateDeleteConfirmation, setAnimateDeleteConfirmation] = useState(false);

  const toggleInsights = () => {
    setIsInsightsExpanded(!isInsightsExpanded);
  };

  useEffect(() => {
    if (showDeleteConfirmation) {
      const timer = setTimeout(() => {
        setAnimateDeleteConfirmation(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setAnimateDeleteConfirmation(false);
    }
  }, [showDeleteConfirmation]);

  return (
    <div className="bg-card p-4 sm:p-6 rounded-lg shadow-sm border border-border mb-6">
      {/* Title Section */}
      {(entry.userTitle || entry.aiTitle) && (
        <h3 className="text-xl font-semibold text-textPrimary mb-2">
          {entry.userTitle || entry.aiTitle}
        </h3>
      )}

      {/* Image Display */}
      {entry.imageUrl && (
        <div className="my-4">
          <img
            src={entry.imageUrl}
            alt={entry.userTitle || entry.aiTitle || "Journal Entry Image"}
            className="entry-image"
          />
        </div>
      )}

      {/* Content or List Items */}
      {entry.entryType === 'list' && Array.isArray(entry.listItems) ? (
        <ul className="entry-list-items text-textSecondary mb-4">
          {entry.listItems.map((item, index) => (
            <li key={index} className="flex items-center mb-1">
              <input
                type="checkbox"
                checked={item.completed}
                readOnly
                className="mr-2"
              />
              <span className={`list-item-text ${item.completed ? 'completed-task' : ''}`}>
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="entry-content text-textSecondary mb-4" dangerouslySetInnerHTML={{ __html: marked.parse(entry.content || '', { async: false }) as string }}>
          {!entry.content && !entry.userTitle && !entry.aiTitle && <p>No content.</p>}
        </div>
      )}

      {/* Timestamp */}
      <span className="timestamp text-sm text-textSecondary block mb-4">
        {entry.timestamp ? formatUserFriendlyTimestamp(entry.timestamp) : 'Saving...'}
      </span>

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="entry-tags flex flex-wrap gap-2 mb-4">
          {entry.tags.map((tag, index) => (
            <span key={index} className="tag px-3 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons (Edit/Delete) & AI Toggle */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
        {/* Left Side: Empty for now, or could contain other info */}
        <div></div>

        {/* Right Side: Edit, Delete, AI Toggle */}
        <div className="flex items-center space-x-4">
          {/* Edit Button */}
          <button
            className="flex items-center justify-center px-3 py-2 rounded-md text-textSecondary hover:text-textPrimary transition-colors duration-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={() => navigate(`/edit/${entry.id}`)}
            title="Edit Entry"
          >
            <EditOutlinedIcon className="mr-1" /> Edit
          </button>

          {/* Delete Button */}
          <button
            className="delete-entry-button w-9 h-9 p-0 flex items-center justify-center text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200"
            onClick={() => setShowDeleteConfirmation(true)}
            title="Delete Entry"
          >
            <DeleteOutlineIcon />
          </button>

          {/* AI Toggle Button */}
          {(entry.aiError || entry.aiTitle || entry.aiGreeting || entry.aiObservations || entry.aiSentimentAnalysis || entry.aiReflectivePrompt || entry.aiTimestamp) && (
            <button
              className={`ai-toggle-button flex items-center justify-center text-textSecondary hover:text-textPrimary transition-colors duration-200 ${isInsightsExpanded ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
              onClick={toggleInsights}
              title="Toggle AI Analysis Details"
            >
              <i className="fas fa-star ai-icon-sparkles mr-1"></i>
              <span className="ai-toggle-label">{isInsightsExpanded ? 'Hide AI' : 'Show AI'}</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Insights Display (Expanded Section) */}
      {isInsightsExpanded && (
        <div className="mt-4 p-4 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-bold text-textPrimary mb-2">AI Analysis:</h4>
          {entry.aiError ? (
            <p className="text-red-500"><strong>AI Error:</strong> {entry.aiError}</p>
          ) : (
            <>
              {entry.aiGreeting && <p className="text-textSecondary mb-1"><em>{entry.aiGreeting}</em></p>}
              {entry.aiObservations && <p className="text-textPrimary mb-1"><strong>Observations:</strong> {entry.aiObservations}</p>}
              {entry.aiSentimentAnalysis && <p className="text-textPrimary mb-1"><strong>Sentiment:</strong> {entry.aiSentimentAnalysis}</p>}
              {entry.aiReflectivePrompt && <p className="text-textPrimary font-semibold mt-2"><strong>Reflect:</strong> {entry.aiReflectivePrompt}</p>}
              {entry.aiTimestamp && <p className="text-xs text-textSecondary mt-2">Analyzed: {formatUserFriendlyTimestamp(entry.aiTimestamp)}</p>}
            </>
          )}
        </div>
      )}


      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300 ease-out ${animateDeleteConfirmation ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-card p-6 rounded-lg shadow-xl max-w-sm w-full m-4 transition-transform duration-300 ease-out ${animateDeleteConfirmation ? 'transform scale-100 opacity-100' : 'transform scale-95 opacity-0'}`}>
            <h3 className="text-lg font-bold text-textPrimary mb-4">Confirm Deletion</h3>
            <p className="text-textSecondary mb-6">Are you sure you want to delete this journal entry? This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                onClick={() => {
                  setAnimateDeleteConfirmation(false);
                  setTimeout(() => setShowDeleteConfirmation(false), 300);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
                onClick={() => {
                  deleteEntry(entry.id);
                  setAnimateDeleteConfirmation(false);
                  setTimeout(() => setShowDeleteConfirmation(false), 300);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntryDisplay;