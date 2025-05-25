import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useJournalEntries, JournalEntry } from '../../contexts/JournalContext';
import { useAuth } from '../../contexts/AuthContext';
import ImageUpload from '../Common/ImageUpload';
import MarkdownEditor from '@uiw/react-markdown-editor';
import '@uiw/react-markdown-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

interface NewListItem {
  text: string;
}

interface EditEntryFormProps {
  entry: JournalEntry;
  onCancel: () => void;
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

const EditEntryForm: React.FC<EditEntryFormProps> = ({ entry, onCancel }) => {
  const { updateEntry, availableTags, addAvailableTag } = useJournalEntries();
  const { currentUser } = useAuth();

  const [userTitle, setUserTitle] = useState(entry.userTitle || '');
  const [content, setContent] = useState(entry.content || '');
  const [listItems, setListItems] = useState<NewListItem[]>(entry.listItems || []);
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [newTag, setNewTag] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [entryType, setEntryType] = useState<'text' | 'list'>(entry.entryType || 'text');
  const [newListItemText, setNewListItemText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(entry.imageUrl || null);

  const placeholderPhrases = [
    "Start typing your thoughts here...",
    "What's on your mind today?",
    "How are you feeling right now?",
    "Write about your day...",
    "Pour your heart out here...",
    "Capture your mood..."
  ];

  useEffect(() => {
    // Placeholder effect (optional, not needed for edit mode)
  }, []);

  const { availableTags: contextAvailableTags } = useJournalEntries();

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(e.currentTarget.value);
      e.currentTarget.value = '';
    }
  };

  const handleNewListItemTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewListItemText(e.target.value);
  };

  const handleAddListItem = () => {
    if (newListItemText.trim()) {
      setListItems(prevItems => [...prevItems, { text: newListItemText.trim() }]);
      setNewListItemText('');
    }
  };

  const handleNewListItemKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddListItem();
    }
  };

  const handleRemoveListItem = (indexToRemove: number) => {
    setListItems(prevItems => prevItems.filter((_, index) => index !== indexToRemove));
  };

  const handleEntryTypeToggle = () => {
    setEntryType(prevType => {
      const newType = prevType === 'text' ? 'list' : 'text';
      if (newType === 'text') {
        setListItems([]);
        setContent('');
      } else {
        setContent('');
        setListItems([]);
      }
      return newType;
    });
  };

  const handleImageSelect = async (file: File | null) => {
    setImageFile(file);
    if (file) {
      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await fetch(`${BACKEND_URL}/upload-image`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Upload failed: ${response.statusText}. Details: ${errorBody}`);
        }

        const result = await response.json();
        setImageUrl(result.imageUrl);
      } catch (error: any) {
        console.error("Error uploading image:", error);
        setImageUrl(null);
        alert(`Error uploading image: ${error.message}`);
      }
    } else {
      setImageUrl(null);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageUrl(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const updatedEntryData: any = {
      ...entry,
      userTitle: userTitle.trim() === '' ? undefined : userTitle.trim(),
      tags: tags,
      entryType: entryType,
      imageUrl: imageUrl,
    };

    if (entryType === 'text') {
      updatedEntryData.content = content;
      delete updatedEntryData.listItems;
    } else {
      updatedEntryData.listItems = listItems.filter(item => item.text.trim() !== '').map(item => ({ text: item.text.trim() }));
      delete updatedEntryData.content;
    }

    if ((entryType === 'text' && !content.trim() && !imageUrl && (!tags || tags.length === 0)) ||
        (entryType === 'list' && (!updatedEntryData.listItems || updatedEntryData.listItems.length === 0) && !imageUrl && (!tags || tags.length === 0))) {
      alert("Please add some content, list items, tags, or an image before saving.");
      return;
    }

    try {
      await updateEntry(entry.id, updatedEntryData, imageFile);
      console.log('Entry updated successfully!');
      onCancel();
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  };

  return (
    <form onSubmit={handleUpdate} className="bg-card p-4 sm:p-6 rounded-lg shadow-xl max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-textPrimary mb-4">Edit Journal Entry</h2>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-textSecondary">Title</label>
        <input
          type="text"
          id="title"
          value={userTitle}
          onChange={(e) => setUserTitle(e.target.value)}
          className="mt-1 block w-full border border-border rounded-md shadow-sm p-2 text-textPrimary focus:ring-primary focus:border-primary bg-inputBg"
          placeholder="Entry Title"
        />
      </div>

      <div className="flex items-center space-x-4">
        <label className="block text-textPrimary text-sm font-medium">Entry Type:</label>
        <button
          type="button"
          onClick={handleEntryTypeToggle}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${entryType === 'text' ? 'bg-primary text-textOnColored shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Text
        </button>
        <button
          type="button"
          onClick={handleEntryTypeToggle}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${entryType === 'list' ? 'bg-primary text-textOnColored shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          List
        </button>
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-textSecondary">Content</label>
        {entryType === 'text' ? (
          (MarkdownEditor as any)({
            value: content,
            onChange: (value: string) => setContent(value),
            height: "200px",
            className: "mt-1 block w-full border border-border rounded-md shadow-sm bg-inputBg text-textPrimary"
          })
        ) : (
          <div>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newListItemText}
                onChange={handleNewListItemTextChange}
                onKeyPress={handleNewListItemKeyDown}
                className="block flex-1 border border-border rounded-md shadow-sm p-2 text-textPrimary focus:ring-primary focus:border-primary bg-inputBg"
                placeholder="Add list item"
              />
              <button type="button" onClick={handleAddListItem} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200">Add Item</button>
            </div>
            <ul>
              {listItems.map((item, index) => (
                <li key={index} className="flex items-center justify-between mb-1 bg-inputBg p-2 rounded-md border border-border">
                  <span className="text-textPrimary">{item.text}</span>
                  <button type="button" onClick={() => handleRemoveListItem(index)} className="ml-2 text-red-600 hover:text-red-700 focus:outline-none">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="image" className="block text-sm font-medium text-textSecondary">Image</label>
        {imageUrl ? (
          <div className="mt-1 relative">
            <img src={imageUrl} alt="Entry image preview" className="max-h-60 object-contain mx-auto w-full h-auto rounded-md"/>
            <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors duration-200 text-xs">X</button>
          </div>
        ) : (
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
            className="mt-1 block w-full text-sm text-textSecondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-buttonPrimary file:text-buttonText hover:file:bg-buttonPrimary-dark"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-textSecondary">Tags</label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {tags.map(tag => (
            <span key={tag} className="flex items-center bg-primary text-white text-sm font-semibold px-2.5 py-0.5 rounded-full mr-2">
              {tag}
              <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 text-white hover:text-gray-200 focus:outline-none">
                ×
              </button>
            </span>
          ))}
          {contextAvailableTags.filter(tag => !tags.includes(tag)).map(tag => (
            <button key={tag} type="button" onClick={() => handleAddTag(tag)} className="text-textPrimary text-sm border border-border rounded-full px-2.5 py-0.5 hover:bg-inputBg transition-colors duration-200">
              {tag}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag(newTag);
              }
            }}
            className="block flex-1 border border-border rounded-md shadow-sm p-2 text-textPrimary focus:ring-primary focus:border-primary bg-inputBg"
            placeholder="Add a new tag"
          />
          <button type="button" onClick={() => handleAddTag(newTag)} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200">Add Tag</button>
        </div>
      </div>

      <div className="flex justify-end space-x-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!currentUser}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default EditEntryForm;