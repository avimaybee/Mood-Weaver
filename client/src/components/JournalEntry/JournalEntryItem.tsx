import React, { useState, useRef } from 'react';
// import type { KeyboardEvent } from 'react'; // Removed unused KeyboardEvent import
import { useJournalEntries, formatUserFriendlyTimestamp, JournalEntry } from '../../contexts/JournalContext'; // Removed JournalItemType alias
import { serverTimestamp } from 'firebase/firestore';
// import { FiEdit, FiTrash2, FiSave, FiX } from 'react-icons/fi'; // Removed react-icons imports
import { marked } from 'marked';
// import { useAuth } from '../../contexts/AuthContext'; // Removed useAuth import and currentUser as it was unused
// import { MDXEditor } from '@mdxeditor/editor'; // Removed unused MDXEditor import
// import { headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin } from '@mdxeditor/editor'; // Removed unused plugin imports
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FiSave, FiX } from 'react-icons/fi'; // Kept FiSave and FiX for edit mode buttons

// --- JournalEntry Interface --- // Removed local JournalEntry interface definition
/*
interface JournalEntry {
  id: string;
  userId: string;
  timestamp: any;
  userTitle?: string;
  content?: string;
  tags?: string[];
  entryType?: 'text' | 'list';
  listItems?: { text: string; completed: boolean }[];
  imageUrl?: string;
  aiTitle?: string;
  aiGreeting?: string;
  aiObservations?: string;
  aiSentimentAnalysis?: string;
  aiReflectivePrompt?: string;
  aiTimestamp?: any;
  aiError?: string;
  lastEdited?: any;
}
*/

// Define interface for editable list items
interface EditableListItem {
  id: number;
  text: string;
  completed: boolean;
}

interface JournalEntryItemProps {
  entry: JournalEntry;
}

// --- Helper: Auto-resize Textarea ---
function autoResizeTextarea(textarea: HTMLTextAreaElement) {
  if (!textarea) return;
  requestAnimationFrame(() => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  });
}

// --- Helper: Apply Formatting ---
function applyFormatting(textarea: HTMLTextAreaElement, prefix: string, suffix: string, multiline: boolean = false) {
  if (!textarea) return;
  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  const value = textarea.value;
  const selectedText = value.substring(selectionStart, selectionEnd);

  let newText: string = '';
  let newCursorPosition: number;

  if (multiline) {
    const lines = selectedText.split('\n');
    const formattedLines = lines.map((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine === '') {
        return line;
      }
      if (trimmedLine.startsWith(prefix.trim())) {
        return trimmedLine.substring(prefix.trim().length).trimStart();
      }
      return `${prefix}${trimmedLine}`;
    });

    newText = value.substring(0, selectionStart) + formattedLines.join('\n') + value.substring(selectionEnd);
    newCursorPosition = selectionStart + formattedLines.join('\n').length;
  } else {
    const currentPrefix = value.substring(selectionStart - prefix.length, selectionStart);
    const currentSuffix = value.substring(selectionEnd, selectionEnd + suffix.length);

    if (selectedText.length > 0 && currentPrefix === prefix && currentSuffix === suffix) {
      newText = value.substring(0, selectionStart - prefix.length) + selectedText + value.substring(selectionEnd + suffix.length);
      newCursorPosition = selectionStart - prefix.length + selectedText.length;
    } else {
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
  autoResizeTextarea(textarea);
}

// --- JournalEntryItem Component ---
const JournalEntryItem: React.FC<JournalEntryItemProps> = ({ entry }) => {
  const { updateEntry, deleteEntry, availableTags, addAvailableTag } = useJournalEntries();
  const [isEditing, setIsEditing] = useState(false);
  const [isInsightsExpanded, setIsInsightsExpanded] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [animateDeleteConfirmation, setAnimateDeleteConfirmation] = useState(false);

  const toggleInsights = () => {
    setIsInsightsExpanded(!isInsightsExpanded);
  };

  const [editedTitle, setEditedTitle] = useState(entry.userTitle || '');
  const [editedContent, setEditedContent] = useState(entry.content || '');
  const [editedListItems, setEditedListItems] = useState<EditableListItem[]>(
    entry.entryType === 'list' && entry.listItems
      ? entry.listItems.map((item, index) => ({ id: index, text: item.text, completed: item.completed || false }))
      : []
  );
  const [newListItemText, setNewListItemText] = useState('');
  const [editedTags, setEditedTags] = useState<string[]>(entry.tags || []);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const editContentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Tag Editing Functions ---
  const handleAddEditedTag = async (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag) {
      if (!editedTags.includes(trimmedTag)) {
        setEditedTags([...editedTags, trimmedTag]);
      }
      if (!availableTags.includes(trimmedTag)) {
        await addAvailableTag(trimmedTag);
      }
    }
  };

  const handleRemoveEditedTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleEditedTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputElement = e.target as HTMLInputElement;
      handleAddEditedTag(inputElement.value);
      inputElement.value = '';
    }
  };

  const handleAvailableTagClick = (tag: string) => {
    handleAddEditedTag(tag);
  };

  // --- List Item Editing Functions ---
  const handleListItemTextChange = (id: number, newText: string) => {
    setEditedListItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, text: newText } : item))
    );
  };

  const handleListItemCompletedChange = (id: number, isCompleted: boolean) => {
    setEditedListItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, completed: isCompleted } : item))
    );
  };

  const handleRemoveListItem = (id: number) => {
    setEditedListItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const handleAddListItem = () => {
    if (newListItemText.trim()) {
      setEditedListItems((prevItems) => [
        ...prevItems,
        { id: Date.now(), text: newListItemText.trim(), completed: false },
      ]);
      setNewListItemText('');
    }
  };

  const handleNewListItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddListItem();
    }
  };

  // --- Core Edit/Save/Cancel/Delete Logic ---
  const handleEditClick = () => {
    setIsEditing(true);
    setEditedTitle(entry.userTitle || '');
    setEditedContent(entry.content || '');
    setEditedListItems(
      entry.entryType === 'list' && entry.listItems
        ? entry.listItems.map((item, index) => ({ id: index, text: item.text, completed: item.completed || false }))
        : []
    );
    setEditedTags(entry.tags || []);
    setNewListItemText('');
    setImageFile(null);
    setRemoveImage(false);

    if (editContentTextareaRef.current) {
      autoResizeTextarea(editContentTextareaRef.current);
    }
  };

  const handleSave = async () => {
    const updatedData: Partial<JournalEntry> = {
      tags: editedTags,
      userTitle: editedTitle,
      ...(entry.entryType === 'text' ? { content: editedContent } : { listItems: editedListItems }),
      lastEdited: serverTimestamp(),
    };

    try {
      await updateEntry(entry.id, updatedData, imageFile, removeImage);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry. Please try again.');
    }
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setImageFile(null);
    setRemoveImage(false);
  };

  const handleDeleteClick = async () => {
    if (window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      try {
        await deleteEntry(entry.id);
        console.log('Entry deleted successfully:', entry.id);
      } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Failed to delete entry.');
      }
    }
  };

  // --- Render Logic (Conditional based on isEditing state) ---
  if (isEditing) {
    return (
      <div className="journal-entry-item edit-mode bg-card p-4 sm:p-6 rounded-lg shadow-sm border border-border mb-6">
        {/* Title Input */}
        <div className="mb-4">
          <label htmlFor={`edit-title-${entry.id}`} className="block text-textPrimary text-sm font-medium mb-1">
            Title (Optional):
          </label>
          <input
            id={`edit-title-${entry.id}`}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="block w-full border border-border rounded-md shadow-sm p-2 text-textPrimary focus:ring-primary focus:border-primary bg-input"
            placeholder="Enter a title for your entry"
          />
        </div>

        {/* Content Area (Textarea or List Items) */}
        <div className="mb-4">
          <label htmlFor={`edit-content-${entry.id}`} className="block text-textPrimary text-sm font-medium mb-1">
            Content:
          </label>
          {entry.entryType === 'text' ? (
            <div className="textarea-container">
              <textarea
                id={`edit-content-${entry.id}`}
                ref={editContentTextareaRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="block w-full border-none rounded-md shadow-sm p-2 text-textPrimary focus:ring-primary focus:border-primary bg-transparent outline-none resize-none overflow-hidden min-h-[80px]"
                placeholder="Write your thoughts here..."
              />
              <div className="markdown-toolbar">
                <button type="button" onClick={() => applyFormatting(editContentTextareaRef.current!, '**', '**')} title="Bold">
                  <i className="fas fa-bold"></i>
                </button>
                <button type="button" onClick={() => applyFormatting(editContentTextareaRef.current!, '*', '*')} title="Italic">
                  <i className="fas fa-italic"></i>
                </button>
                <button type="button" onClick={() => applyFormatting(editContentTextareaRef.current!, '- ', '', true)} title="Bullet List">
                  <i className="fas fa-list"></i>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <ul className="border border-border rounded-md p-2 space-y-2 bg-input">
                {editedListItems.map((item: EditableListItem) => (
                  <li key={item.id} className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-2">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => handleListItemCompletedChange(item.id, e.target.checked)}
                      className="mr-2"
                    />
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleListItemTextChange(item.id, e.target.value)}
                      className="block w-full border border-border rounded-md shadow-sm p-2 text-textPrimary focus:ring-primary focus:border-primary flex-1 bg-transparent"
                      placeholder="List item text"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveListItem(item.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 text-sm"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="text"
                  placeholder="Add new list item..."
                  value={newListItemText}
                  onChange={(e) => setNewListItemText(e.target.value)}
                  onKeyDown={handleNewListItemKeyDown}
                  className="block w-full border border-border rounded-md shadow-sm p-2 text-textPrimary focus:ring-primary focus:border-primary bg-input"
                />
                <button
                  type="button"
                  onClick={handleAddListItem}
                  className="px-3 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors duration-200 text-sm shadow-sm"
                >
                  Add Item
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Image Editing */}
        <div className="mb-4">
          <label htmlFor={`edit-image-${entry.id}`} className="block text-textPrimary text-sm font-medium mb-1">
            Replace Image (Optional):
          </label>
          <input
            id={`edit-image-${entry.id}`}
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
            className="mt-1 block w-full text-sm text-textSecondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-opacity-90"
          />
          {imageFile ? (
            <p className="mt-1 text-sm text-textSecondary">Selected file: {imageFile.name}</p>
          ) : entry.imageUrl ? (
            <p className="mt-1 text-sm text-textSecondary">
              Current Image:{' '}
              <a href={entry.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                View Image
              </a>
            </p>
          ) : null}

          {entry.imageUrl && !imageFile && (
            <div className="mt-2 flex items-center">
              <label className="text-textPrimary text-sm font-medium">
                <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} className="mr-1" />
                Remove existing image
              </label>
            </div>
          )}
          {imageFile && removeImage && (
            <p className="mt-1 text-sm text-red-500">
              Note: A new image is selected AND you chose to remove the existing one. The new image will be uploaded, and the old one will be removed.
            </p>
          )}
        </div>

        {/* Tagging Interface for Editing */}
        <div className="mb-4">
          <label htmlFor={`edit-tag-input-${entry.id}`} className="block text-textPrimary text-sm font-medium mb-1">
            Tags:
          </label>
          <input
            id={`edit-tag-input-${entry.id}`}
            type="text"
            placeholder="Add tags (e.g., work, mood)"
            onKeyDown={handleEditedTagInputKeyDown}
            className="block w-full border border-border rounded-md shadow-sm p-2 text-textPrimary focus:ring-primary focus:border-primary bg-input"
          />
          <div className="selected-tags mt-2 flex flex-wrap gap-2">
            {editedTags.map((tag) => (
              <span key={tag} className="tag bg-primary text-white px-2.5 py-0.5 rounded-full text-sm font-medium flex items-center">
                {tag}
                <button type="button" onClick={() => handleRemoveEditedTag(tag)} className="ml-1.5 text-white hover:text-opacity-80 focus:outline-none">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Available Tags for Selection during editing */}
        <div className="mb-4">
          <p className="block text-textPrimary text-sm font-medium mb-1">Available Tags:</p>
          <div className="available-tags flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <span
                key={tag}
                className="tag cursor-pointer bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 px-2.5 py-0.5 rounded-full text-sm font-medium transition-colors duration-200"
                onClick={() => handleAvailableTagClick(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action buttons (Save/Cancel) in edit mode */}
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 mt-6">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors duration-200 shadow-md flex-1"
          >
            {(FiSave as any)({ size: 18, className: "mr-2" })} Save Changes
          </button>
          <button
            onClick={handleCancelClick}
            className="px-6 py-3 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors duration-200 shadow-md flex-1"
          >
            {(FiX as any)({ size: 18, className: "mr-2" })} Cancel
          </button>
        </div>
      </div>
    );
  }

  // --- Render Logic (Display Mode) ---
  return (
    <div className="bg-card p-4 sm:p-6 rounded-lg shadow-sm border border-border mb-6">
      {/* Title Section */}
      {(entry.userTitle || entry.aiTitle) && (
        <h3 className="text-xl font-semibold text-textPrimary mb-2">{entry.userTitle || entry.aiTitle}</h3>
      )}

      {/* Image Display */}
      {entry.imageUrl && (
        <div className="my-4">
          <img src={entry.imageUrl} alt={entry.userTitle || entry.aiTitle || 'Journal Entry Image'} className="entry-image" />
        </div>
      )}

      {/* Content or List Items */}
      {entry.entryType === 'list' && Array.isArray(entry.listItems) ? (
        <ul className="entry-list-items text-textSecondary mb-4">
          {entry.listItems.map((item, index) => (
            <li key={index} className="flex items-center mb-1">
              <input type="checkbox" checked={item.completed} readOnly className="mr-2" />
              <span className={`list-item-text ${item.completed ? 'completed-task' : ''}`}>{item.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div
          className="entry-content text-textSecondary mb-4"
          dangerouslySetInnerHTML={{ __html: marked.parse(entry.content || '', { async: false }) as string }}
        >
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
            <span
              key={index}
              className="tag px-3 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons (Edit/Delete) & AI Toggle */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
        <div></div>
        <div className="flex items-center space-x-4">
          {/* Edit Button */}
          <button
            className="flex items-center justify-center px-3 py-2 rounded-md text-textSecondary hover:text-textPrimary transition-colors duration-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={handleEditClick}
            title="Edit Entry"
          >
            <EditOutlinedIcon />
          </button>

          {/* Delete Button */}
          <button
            className="delete-entry-button w-9 h-9 p-0 flex items-center justify-center text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200"
            onClick={handleDeleteClick}
            title="Delete Entry"
          >
            <DeleteOutlineIcon />
          </button>

          {/* AI Toggle Button */}
          {(entry.aiError || entry.aiTitle || entry.aiGreeting || entry.aiObservations || entry.aiSentimentAnalysis || entry.aiReflectivePrompt || entry.aiTimestamp) && (
            <button
              className={`ai-toggle-button flex items-center justify-center text-textSecondary hover:text-textPrimary transition-colors duration-200 ${
                isInsightsExpanded ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
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
            <p className="text-red-500">
              <strong>AI Error:</strong> {entry.aiError}
            </p>
          ) : (
            <>
              {entry.aiGreeting && (
                <p className="text-textSecondary mb-1">
                  <em>{entry.aiGreeting}</em>
                </p>
              )}
              {entry.aiObservations && (
                <p className="text-textPrimary mb-1">
                  <strong>Observations:</strong> {entry.aiObservations}
                </p>
              )}
              {entry.aiSentimentAnalysis && (
                <p className="text-textPrimary mb-1">
                  <strong>Sentiment:</strong> {entry.aiSentimentAnalysis}
                </p>
              )}
              {entry.aiReflectivePrompt && (
                <p className="text-textPrimary font-semibold mt-2">
                  <strong>Reflect:</strong> {entry.aiReflectivePrompt}
                </p>
              )}
              {entry.aiTimestamp && (
                <p className="text-xs text-textSecondary mt-2">Analyzed: {formatUserFriendlyTimestamp(entry.aiTimestamp)}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div
          className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300 ease-out ${
            animateDeleteConfirmation ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            className={`bg-card p-6 rounded-lg shadow-xl max-w-sm w-full m-4 transition-transform duration-300 ease-out ${
              animateDeleteConfirmation ? 'transform scale-100 opacity-100' : 'transform scale-95 opacity-0'
            }`}
          >
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

export default JournalEntryItem;