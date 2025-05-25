import React, { useState, useEffect, useMemo } from 'react';
import { useJournalEntries } from '../../contexts/JournalContext';
// import ImageUpload from '../Common/ImageUpload'; // Commented out: unused import
// import MarkdownEditor from '@uiw/react-markdown-editor'; // Removed: replacing with MDXEditor
// import '@uiw/react-markdown-editor/markdown-editor.css'; // Removed: replacing with MDXEditor
// import '@uiw/react-markdown-preview/markdown.css'; // Removed: replacing with Milkdown

// import dynamic from 'next/dynamic'; // Removed Next.js dynamic import
import '@mdxeditor/editor/style.css'; // Import the basic styles

// Standard static import for MDXEditor
import { MDXEditor } from '@mdxeditor/editor';

// Import plugins
import { headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin, markdownShortcutPlugin } from '@mdxeditor/editor';

// Define the expected type for addEntry data (based on JournalContextType)
interface AddEntryData {
  userTitle?: string;
  content?: string;
  listItems?: { text: string }[];
  tags: string[];
  entryType: 'text' | 'list';
  imageUrl?: string | null;
}

// --- AddEntryForm Component ---
const AddEntryForm: React.FC = () => {
  const { addEntry } = useJournalEntries();
  // Removed unused currentUser from useAuth()

  const [title, setTitle] = useState('');
  const [markdownText, setMarkdownText] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Placeholder phrases for the Markdown editor
  const placeholderPhrases = useMemo(() => [
    "What's on your mind today?",
    "Describe a recent experience.",
    "Reflect on your mood.",
    "Write about something that inspired you.",
    "Detail a challenge you faced.",
    "List three things you're grateful for."
  ], []); // Wrapped in useMemo

  // Effect to set a random placeholder when the component mounts
  useEffect(() => {
    // The logic inside this effect is currently not directly setting a placeholder on the MDXEditor
    // MDXEditor handles placeholder via prop. This effect and randomIndex can be removed if no other logic uses them.
    // For now, kept the effect but removed the dependency from the linter warning by using useMemo above.
  }, [placeholderPhrases]); // placeholderPhrases is now memoized

  // Handle adding a new tag (e.g., from input or selection)
  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !newTags.includes(normalizedTag)) {
      setNewTags([...newTags, normalizedTag]);
      setTagInput(''); // Clear tag input after adding
    }
  };

  // Handle removing a tag from the list
  const handleRemoveTag = (tagToRemove: string) => {
    setNewTags(newTags.filter(tag => tag !== tagToRemove));
  };

  // Handle changes to the tag input field
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter a title for your journal entry.');
      return;
    }

    // Construct the new entry object
    const newEntry: AddEntryData = {
      userTitle: title.trim() || undefined,
      content: markdownText || undefined,
      tags: newTags,
      listItems: undefined, // Set listItems to undefined or an empty array if needed later
      entryType: 'text',
      imageUrl: undefined,
    };

    try {
      await addEntry(newEntry as AddEntryData);
      // Clear form after successful submission
      setTitle('');
      setMarkdownText('');
      setNewTags([]);
      setTagInput('');
      alert('Journal entry added successfully!');
    } catch (error) {
      console.error('Error adding journal entry:', error);
      alert('Failed to add journal entry.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4 text-textPrimary">Add New Journal Entry</h2>

      {/* Title Input */}
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-textSecondary mb-1">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-border rounded-md focus:ring-primary focus:border-primary text-textPrimary bg-inputBackground"
          placeholder="Entry Title"
        />
      </div>

      {/* Markdown Editor */}
      <div className="mb-4">
        <label htmlFor="content" className="block text-sm font-medium text-textSecondary mb-1">Content</label>
        <MDXEditor
          markdown={markdownText}
          onChange={setMarkdownText}
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            markdownShortcutPlugin()
          ]}
        />
      </div>

      {/* Tag Input and List */}
      <div className="mb-4">
        <label htmlFor="tags" className="block text-sm font-medium text-textSecondary mb-1">Tags</label>
        <input
          type="text"
          id="tags"
          value={tagInput}
          onChange={handleTagInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault(); // Prevent form submission
              handleAddTag(tagInput);
            }
          }}
          className="w-full p-2 border border-border rounded-md focus:ring-primary focus:border-primary text-textPrimary bg-inputBackground"
          placeholder="Add tags (press Enter)"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {newTags.map(tag => (
            <span
              key={tag}
              className="flex items-center bg-tagBackground text-tagText px-3 py-1 rounded-full text-sm cursor-pointer"
              onClick={() => handleRemoveTag(tag)}
            >
              {tag}
              <svg className="ml-1 h-3 w-3 text-tagText" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </span>
          ))}
        </div>
      </div>

      {/* Add List Item Button - Feature to be implemented */}
      {/* <button type="button" className="px-4 py-2 bg-blue-500 text-white rounded-md mr-2">Add List Item</button> */}

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full px-4 py-2 bg-primary text-textOnColored font-semibold rounded-md hover:bg-primaryDark transition-colors duration-200"
      >
        Add Entry
      </button>
    </form>
  );
};

export default AddEntryForm;