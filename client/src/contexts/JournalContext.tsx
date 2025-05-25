import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react'; // Keep type-only import
import type { DocumentData } from 'firebase/firestore'; // Import DocumentData from firestore
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, setDoc, getDoc as getFirestoreDoc, getFirestore } from 'firebase/firestore'; // Import getFirestore
import { app } from '../firebase'; // Import initialized Firebase services from correct path
import { useAuth } from './AuthContext'; // To get the current user
import type { JournalEntry as JournalEntryType } from './JournalContext'; // Import the interface type from THIS file
// import { EditableListItem } from '../components/JournalEntry/JournalEntryItem'; // Remove unused import
// import { handleDeleteEntry } from '../utils/firebaseUtils'; // Assuming we might reuse parts of this or need the signature

const db = getFirestore(app); // Get Firestore instance using the imported app

// Define the structure of a journal entry (adjust based on your Firestore data structure)
export interface JournalEntry extends DocumentData {
  id: string;
  userId: string;
  timestamp: any; // Use appropriate type if you have a Timestamp type
  userTitle?: string;
  content?: string;
  entryType: 'text' | 'list';
  listItems?: { text: string; completed: boolean }[];
  tags?: string[];
  imageUrl?: string;
  aiTitle?: string;
  aiGreeting?: string;
  aiObservations?: string;
  aiSentimentAnalysis?: string;
  aiReflectivePrompt?: string;
  aiTimestamp?: any; // Use appropriate type if you have a Timestamp type
  aiError?: string;
  lastEdited?: any; // Use appropriate type if you have a Timestamp type
  removeImage?: boolean; // Add removeImage property
}

// Define interface for editable list items (moved from JournalEntryItem)
export interface EditableListItem {
  id: number; // Use a simple ID for key prop
  text: string;
  completed: boolean; // Assuming completed status exists or will be added
}

interface JournalContextType {
  entries: JournalEntryType[];
  loading: boolean;
  availableTags: string[];
  activeFilterTags: string[];
  searchQuery: string;
  addEntry: (entryData: { userTitle?: string, content?: string, listItems?: { text: string }[], tags: string[], entryType: 'text' | 'list', imageUrl?: string | null }, imageFile?: File | null) => Promise<void>;
  updateEntry: (entryId: string, entryData: { userTitle?: string, content?: string, listItems?: { text: string, completed: boolean }[], tags?: string[], lastEdited?: any, imageUrl?: string | null, entryType?: 'text' | 'list' }, imageFile?: File | null, removeImage?: boolean) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  addAvailableTag: (tag: string) => Promise<void>;
  toggleFilterTag: (tag: string) => void;
  clearFilterTags: () => void;
  setSearchQuery: (query: string) => void;
  clearSearchQuery: () => void;
  displayStatusMessage?: (message: string, type: 'success' | 'error') => void;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

// Define BACKEND_URL using Create React App's environment variable handling
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

export const useJournalEntries = () => {
  const context = useContext(JournalContext);
  if (context === undefined) {
    throw new Error('useJournalEntries must be used within a JournalProvider');
  }
  return context;
};

interface JournalProviderProps {
  children: ReactNode;
}

// Define default tags (can be moved to a config file later)
const defaultTags: string[] = ['work', 'personal', 'mood', 'idea'];

export const JournalProvider: React.FC<JournalProviderProps> = ({ children }) => {
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [activeFilterTags, setActiveFilterTags] = useState<string[]>([]);
  const [searchQuery, setSearchQueryState] = useState<string>('');
  const { currentUser } = useAuth();
  const { displayStatusMessage } = useContext(JournalContext) || {};

  // Effect to fetch entries and update available tags
  useEffect(() => {
    if (!currentUser) {
      setAllEntries([]);
      setEntries([]);
      setAvailableTags(defaultTags); // Reset to default tags if no user
      setActiveFilterTags([]); // Clear filter tags if no user
      setSearchQueryState(''); // Clear search query if no user
      setLoading(false);
      return; // Stop listener if no user
    }

    setLoading(true);
    // Set up Firestore listener for entries
    const entriesCollectionRef = collection(db, 'users', currentUser.uid, 'entries');
    const q = query(entriesCollectionRef, orderBy('timestamp', 'desc'));

    const unsubscribeEntries = onSnapshot(q, async (snapshot) => {
      console.log(`Received ${snapshot.docs.length} entries from Firestore.`);
      const fetchedEntries: JournalEntry[] = snapshot.docs.map(doc => ({
        ...doc.data() as JournalEntry,
        id: doc.id,
      }));
      setAllEntries(fetchedEntries); // Store all fetched entries

      // Tags from entries
      const tagsFromEntries = Array.from(new Set(fetchedEntries.flatMap(entry => entry.tags || [])));

      // Fetch user's saved available tags
      const userTagsCollectionRef = collection(db, 'users', currentUser.uid, 'userAvailableTags');
      const userTagsSnapshot = await getDocs(userTagsCollectionRef); // Using getDocs for a one-time fetch here for simplicity
      const userSavedTags = userTagsSnapshot.docs.map(doc => doc.id);
      console.log('Fetched user saved tags:', userSavedTags);

      // Combine default, entry, and user saved tags
      const combinedTags = Array.from(new Set([...defaultTags, ...tagsFromEntries, ...userSavedTags])).sort();
      setAvailableTags(combinedTags);

      // Filtering and searching will be applied in the separate effect

      setLoading(false);
    }, (error) => {
      console.error('Error fetching journal entries or user tags:', error);
      setLoading(false);
      // Handle error appropriately (e.g., show error message to user)
    });

    // Clean up entries listener on unmount or when currentUser changes
    return () => unsubscribeEntries();
  }, [currentUser]);

  // Effect to apply filtering and searching whenever allEntries or filter/search state changes
  useEffect(() => {
    let filteredEntries = allEntries; // Start with all entries

    // Apply tag filters
    if (activeFilterTags.length > 0) {
      filteredEntries = filteredEntries.filter(entry => 
        activeFilterTags.every(filterTag => entry.tags?.includes(filterTag))
      );
    }

    // Apply search query filtering
    if (searchQuery.trim()) {
        const lowerCaseQuery = searchQuery.toLowerCase();
        filteredEntries = filteredEntries.filter(entry => 
            (entry.userTitle?.toLowerCase().includes(lowerCaseQuery)) ||
            (entry.content?.toLowerCase().includes(lowerCaseQuery)) ||
            (entry.listItems?.some((item: { text: string; completed: boolean }) => item.text.toLowerCase().includes(lowerCaseQuery))) ||
            (entry.tags?.some((tag: string) => tag.toLowerCase().includes(lowerCaseQuery)))
            // Add other fields if needed
        );
    }

    setEntries(filteredEntries); // Update the displayed entries

  }, [allEntries, activeFilterTags, searchQuery]); // Re-run when allEntries, activeFilterTags, or searchQuery change

  // Function to add a tag to the user's available tags in Firestore
  const addAvailableTag = async (tag: string) => {
    if (!currentUser) throw new Error("No user logged in to add available tag.");
    const trimmedTag = tag.trim();
    if (!trimmedTag) return; // Don't add empty tags

    const userTagsCollectionRef = collection(db, 'users', currentUser.uid, 'userAvailableTags');
    const tagDocRef = doc(userTagsCollectionRef, trimmedTag); // Use tag name as document ID

    try {
      // Check if the tag already exists to avoid unnecessary writes
      const docSnap = await getFirestoreDoc(tagDocRef); // Use getFirestoreDoc alias
      if (!docSnap.exists()) {
        await setDoc(tagDocRef, { addedAt: serverTimestamp() }); // Save the tag with a timestamp
        console.log('Added new available tag to Firestore:', trimmedTag);
        // Optimistically update availableTags state (listener will also update it)
        setAvailableTags(prevTags => Array.from(new Set([...prevTags, trimmedTag])).sort());
      } else {
        console.log('Available tag already exists:', trimmedTag);
      }
    } catch (error) {
      console.error('Error adding available tag to Firestore:', error);
      // Handle error
    }
  };

  // Function to toggle a tag in the active filter list
  const toggleFilterTag = (tag: string) => {
    setActiveFilterTags(prevFilters => {
      if (prevFilters.includes(tag)) {
        return prevFilters.filter(filterTag => filterTag !== tag); // Remove tag if already active
      } else {
        return [...prevFilters, tag]; // Add tag if not active
      }
    });
  };

  // Function to clear all active filter tags
  const clearFilterTags = () => {
    setActiveFilterTags([]);
  };

  // Function to set the search query
  const setSearchQuery = (query: string) => {
      setSearchQueryState(query);
  };

  // Function to clear the search query
  const clearSearchQuery = () => {
      setSearchQueryState('');
  };

  // Full implementation for adding a journal entry
  const addEntry = async (entryData: { userTitle?: string, content?: string, listItems?: { text: string }[], tags: string[], entryType: 'text' | 'list', imageUrl?: string | null }, imageFile?: File | null) => {
    if (!currentUser) throw new Error("No user logged in to add entry.");
    console.log('Attempting to add entry with data:', entryData);
    console.log('Image file for addEntry:', imageFile); // Use imageFile to avoid unused error

    let entryToAdd: any = { // Use any for now, refine interface later if needed
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
        ...entryData // Include title, content, tags, entryType, listItems, and now imageUrl
    };

    let entryRef;

    try {
        // 1. Add entry data to Firestore
        const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'entries'), entryToAdd);
        entryRef = docRef; // Store docRef for potential AI update
        console.log('Journal entry initially saved with ID:', docRef.id);
        displayStatusMessage?.('Entry saved successfully.', 'success');

        // 2. Prepare content for AI analysis
        const contentForAI = entryData.entryType === 'list' 
            ? (entryData.listItems ? entryData.listItems.map(item => item.text).join('\n') : '') 
            : (entryData.content || '');

        if (contentForAI.trim()) { // Only analyze if there's text/list content
            console.log('Sending entry to AI for analysis...');
            try {
                const aiResponse = await fetch(`${BACKEND_URL}/analyze-entry`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        entryContent: contentForAI,
                        entryType: entryData.entryType // Pass entry type to backend
                    })
                });

                if (!aiResponse.ok) {
                    const errData = await aiResponse.json().catch(() => null);
                    const errorMessage = errData ? (errData.error || JSON.stringify(errData)) : `Server error: ${aiResponse.status}`;
                    console.error('AI analysis error from backend:', errorMessage);
                    displayStatusMessage?.('Entry saved, but AI analysis failed.', 'error');
                    // Update entry with AI error
                     if (entryRef) {
                         await updateDoc(entryRef, {
                             aiError: `AI analysis failed: ${errorMessage}`,
                             aiTimestamp: serverTimestamp()
                         }).catch(updateError => console.error("Failed to update entry with AI error state:", updateError));
                     }

                } else {
                    const aiData = await aiResponse.json();
                    console.log('AI Analysis successful. Data from backend:', aiData);
                    // Update the entry with AI analysis results
                    if (entryRef) {
                        await updateDoc(entryRef, {
                            aiTitle: aiData.aiTitle || "AI Title Placeholder",
                            aiGreeting: aiData.aiGreeting || "Hello!",
                            aiObservations: aiData.aiObservations || "Observations placeholder.",
                            aiSentimentAnalysis: aiData.aiSentimentAnalysis || "Sentiment analysis placeholder.",
                            aiReflectivePrompt: aiData.aiReflectivePrompt || "What are your thoughts?",
                            aiTimestamp: serverTimestamp(),
                            aiError: null
                        }).then(() => {
                           displayStatusMessage?.('AI insights added.', 'success');
                        }).catch(updateError => {
                           console.error("Failed to update entry with AI insights:", updateError);
                           displayStatusMessage?.('Entry saved, but failed to add AI insights.', 'error');
                        });
                    }
                }
            } catch (aiCallError: any) {
                 console.error('AI backend call failed:', aiCallError);
                 displayStatusMessage?.('Entry saved, but error calling AI backend.', 'error');
                 // Update entry with AI call error
                 if (entryRef) {
                     await updateDoc(entryRef, {
                         aiError: `AI backend call failed: ${(aiCallError as Error).message}`,
                         aiTimestamp: serverTimestamp()
                     }).catch(updateError => console.error("Failed to update entry with AI call error state:", updateError));
                 }
            }
        } else {
            displayStatusMessage?.('Entry saved (no content for AI analysis).', 'success');
        }

        // After successfully adding an entry, if new tags were used, add them to available tags
        if (entryData.tags && entryData.tags.length > 0) {
            entryData.tags.forEach(tag => addAvailableTag(tag).catch(console.error));
        }

    } catch (error) {
        console.error('Error during addEntry process:', error);
        displayStatusMessage?.('Failed to add entry.', 'error');
        throw error; // Re-throw the error to be caught by the component
    }
  };

  // Full implementation for updating a journal entry
  const updateEntry = async (entryId: string, entryData: { userTitle?: string, content?: string, listItems?: { text: string, completed: boolean }[], tags?: string[], lastEdited?: any, imageUrl?: string | null, entryType?: 'text' | 'list' }, imageFile?: File | null, removeImage?: boolean) => {
    if (!currentUser) return;
    console.log('Attempting to update entry with data:', entryData);
    console.log('Image file for updateEntry:', imageFile); // Use imageFile to avoid unused error
    console.log('Remove image flag for updateEntry:', removeImage); // Use removeImage to avoid unused error

    const entryRef = doc(db, "users", currentUser.uid, "entries", entryId);
    const currentEntrySnapshot = await getFirestoreDoc(entryRef);
    const currentEntry = currentEntrySnapshot.data() as JournalEntry | undefined;

    if (!currentEntry) {
      console.error("Entry not found for update:", entryId);
      displayStatusMessage?.('Failed to update entry: Entry not found.', 'error');
      return;
    }

    // Determine if image needs to be removed, uploaded, or kept
    const isImageRemoved = currentEntry.imageUrl && (entryData.imageUrl === null || removeImage); // Check entryData.imageUrl and removeImage flag
    const isNewImageUpload = !!imageFile; // A new file was selected
    const isImageKept = currentEntry.imageUrl && !isImageRemoved && !isNewImageUpload; // Image was present and no new file/removal indicated

    let finalImageUrl = isImageKept ? currentEntry.imageUrl : null; // Start with old URL if kept, otherwise null

    // Handle image deletion via backend if image was removed or replaced
    if (isImageRemoved || (isNewImageUpload && currentEntry.imageUrl)) {
        const imageUrlToDelete = currentEntry.imageUrl as string; // Assert as string
        console.log('Attempting to delete old image:', imageUrlToDelete);

        // Extract the key to delete from the imageUrl (assuming URL structure)
        // Example: https://your-backend-url.com/uploads/user_id/image_key.jpg
        // Need to determine the actual key format your backend expects.
        // Placeholder: split by / and take the last part.
        const urlParts = imageUrlToDelete.split('/');
        const keyToDelete = urlParts[urlParts.length - 1];

        if (keyToDelete) {
            try {
                // Assuming your backend has a delete endpoint like /delete-image/:key
                const deleteResponse = await fetch(`${BACKEND_URL}/delete-image/${encodeURIComponent(keyToDelete)}`, {
                    method: 'DELETE',
                });

                if (!deleteResponse.ok) {
                    const errData = await deleteResponse.json().catch(() => null);
                    const errorMessage = errData ? (errData.error || JSON.stringify(errData)) : `Server error: ${deleteResponse.status}`;
                    console.error('Backend image deletion failed:', errorMessage);
                    displayStatusMessage?.('Entry updated, but old image deletion failed.', 'error');
                } else {
                    console.log('Backend image deleted successfully:', keyToDelete);
                }
            } catch (deleteError: any) {
                console.error('Error calling backend image deletion endpoint:', deleteError);
                displayStatusMessage?.('Entry updated, but error during image deletion.', 'error');
            }
        }
    }

    // Handle image upload if a new file is selected
    if (isNewImageUpload && imageFile) {
        console.log('Attempting to upload new image:', imageFile.name);
        const formData = new FormData();
        formData.append('image', imageFile);
        // Optionally append user ID or other context if your backend needs it
        // formData.append('userId', currentUser.uid);

        try {
            // Assuming your backend has an upload endpoint like /upload-image
            const uploadResponse = await fetch(`${BACKEND_URL}/upload-image`, {
                method: 'POST',
                body: formData,
                // Headers like Content-Type are usually not needed with FormData
            });

            if (!uploadResponse.ok) {
                const errData = await uploadResponse.json().catch(() => null);
                const errorMessage = errData ? (errData.error || JSON.stringify(errData)) : `Server error: ${uploadResponse.status}`;
                console.error('Backend image upload failed:', errorMessage);
                displayStatusMessage?.('Entry updated, but new image upload failed.', 'error');
                // If upload fails, we should probably revert to the old image URL or set to null
                finalImageUrl = isImageKept ? currentEntry.imageUrl : null; // Revert if upload failed

            } else {
                const uploadData = await uploadResponse.json();
                console.log('Backend image uploaded successfully. Data from backend:', uploadData);
                // Assuming backend returns the new image URL in the response body (e.g., uploadData.imageUrl)
                finalImageUrl = uploadData.imageUrl || null; // Use the URL from the backend response
                if (!finalImageUrl) {
                     console.error('Backend image upload successful, but no imageUrl returned.');
                     displayStatusMessage?.('Entry updated, but no image URL received from backend.', 'error');
                     finalImageUrl = isImageKept ? currentEntry.imageUrl : null; // Revert if no URL returned
                }
            }
        } catch (uploadError: any) {
            console.error('Error calling backend image upload endpoint:', uploadError);
            displayStatusMessage?.('Entry updated, but error during image upload.', 'error');
             finalImageUrl = isImageKept ? currentEntry.imageUrl : null; // Revert if error occurred
        }
    }

    // Prepare data for Firestore update
    const firestoreUpdateData: any = { // Use any for flexibility with partial updates and new fields
        // Only include fields present in entryData that you want to update
        ...(entryData.userTitle !== undefined && { userTitle: entryData.userTitle }),
        ...(entryData.content !== undefined && { content: entryData.content }),
        ...(entryData.listItems !== undefined && { listItems: entryData.listItems }),
        ...(entryData.tags !== undefined && { tags: entryData.tags }),
        ...(entryData.lastEdited !== undefined && { lastEdited: entryData.lastEdited }),
        
        // Handle imageUrl explicitly based on the outcome of delete/upload
        // Assign null if image was removed or upload failed and no old image to keep
        imageUrl: finalImageUrl === null ? null : finalImageUrl, // Explicitly allow null

         // Include entryType update if provided in entryData (use type assertion if needed)
        ...(entryData.entryType !== undefined && { entryType: entryData.entryType as 'text' | 'list' }), // Use type assertion
    };

     // Ensure imageUrl is set to null if explicitly requested for removal, even if upload failed
    if (removeImage) {
        firestoreUpdateData.imageUrl = null; // Ensure imageUrl is explicitly null if removal requested
    }

    try {
      await updateDoc(entryRef, firestoreUpdateData);
      console.log('Journal entry updated successfully:', entryId);
      displayStatusMessage?.('Entry updated.', 'success');
    } catch (error) {
      console.error("Error updating entry:", error);
      displayStatusMessage?.('Failed to update entry.', 'error');
      throw error; // Re-throw the error
    }
  };

  // Full implementation for deleting a journal entry
  const deleteEntry = async (entryId: string) => {
    if (!currentUser) throw new Error("No user logged in to delete entry.");
    console.log('Attempting to delete entry ID:', entryId);

    const entryRef = doc(db, 'users', currentUser.uid, 'entries', entryId);

    try {
        // 1. Get entry data to check for image URL
        const docSnap = await getFirestoreDoc(entryRef); // Use getFirestoreDoc alias
        if (!docSnap.exists()) {
            console.warn('Attempted to delete non-existent entry:', entryId);
            displayStatusMessage?.('Failed to delete entry: Entry not found.', 'error');
            return; // Exit if entry doesn't exist
        }

        const entryToDelete = docSnap.data() as JournalEntry;
        const imageUrl = entryToDelete.imageUrl;

        // 2. Delete Firestore document
        await deleteDoc(entryRef);
        console.log('Journal entry document deleted from Firestore:', entryId);
        displayStatusMessage?.('Entry deleted successfully.', 'success');

        // 3. Delete image from Storage via backend if it exists
        if (imageUrl) {
            console.log("Requesting image deletion from backend during entry deletion:", imageUrl);
            try {
                const imageUrlToDelete = imageUrl;
                 // Extract the key from the public URL
                const keyToDelete = imageUrlToDelete.substring(imageUrlToDelete.lastIndexOf('/') + 1);

                console.log(`Calling backend to delete image with key: ${keyToDelete}`);

                const deleteResponse = await fetch(`${BACKEND_URL}/delete-image/${encodeURIComponent(keyToDelete)}`, {
                    method: 'DELETE',
                    // Add auth header if needed
                });

                if (!deleteResponse.ok) {
                     const errorText = await deleteResponse.text();
                     console.error('Image deletion error from backend:', deleteResponse.status, errorText);
                     displayStatusMessage?.('Entry updated, but old image deletion failed.', 'error');
                     // Log error but continue
                } else {
                    console.log('Image deletion successful from backend.');
                     // Optional: display a separate success message for image deletion if needed, but entry deletion is the main event
                }
            } catch (storageError) {
                console.error('Error calling backend for image deletion during entry deletion:', storageError);
                 displayStatusMessage?.('Error calling backend for image deletion.', 'error');
                // Continue with document deletion even if backend call fails
            }
        }

    } catch (error) {
        console.error('Error during deleteEntry process:', error);
        displayStatusMessage?.('Failed to delete entry.', 'error');
        throw error; // Re-throw the error
    }
  };

  return (
    <JournalContext.Provider value={{ entries, loading, availableTags, addEntry, updateEntry, deleteEntry, addAvailableTag, activeFilterTags, toggleFilterTag, clearFilterTags, searchQuery, setSearchQuery, clearSearchQuery, displayStatusMessage }}>
      {children}
    </JournalContext.Provider>
  );
};

// Helper function to format timestamp - Can be moved to utils if used elsewhere
export function formatUserFriendlyTimestamp(firestoreTimestamp: any): string {
  if (!firestoreTimestamp || typeof firestoreTimestamp.toDate !== 'function') {
    if (firestoreTimestamp instanceof Date) {
      // Proceed with formatting if it's already a Date
    } else {
      console.warn("Invalid timestamp received for formatting:", firestoreTimestamp);
      return 'Date not available';
    }
  }

  const date = (firestoreTimestamp instanceof Date) ? firestoreTimestamp : firestoreTimestamp.toDate();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
  const timeString = date.toLocaleTimeString('en-US', timeOptions);
  const entryDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (entryDateOnly.getTime() === today.getTime()) return `Today, ${timeString}`;
  if (entryDateOnly.getTime() === yesterday.getTime()) return `Yesterday, ${timeString}`;

  // For other dates, include day, month, and year
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return `${date.toLocaleDateString('en-US', options)}, ${timeString}`;
}
