import { handleDeleteEntry } from './firebaseUtils.js';
import { displayEntries } from './journalEntryDisplay.js';
import { doc, getDoc, collection, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// Get DOM elements needed for this module
const selectedTagsDiv = document.getElementById('selected-tags');
const tagInput = document.getElementById('tag-input');
const availableTagsDiv = document.getElementById('available-tags');
const filterTagsListDiv = document.getElementById('filter-tags-list');
const searchInput = document.getElementById('search-input');
const editAvailableTagsButton = document.getElementById('edit-available-tags-button');
const addTagButton = document.getElementById('add-tag-button');

// --- Variables --- 
let selectedTags = [];
let activeFilterTags = [];
const defaultTags = ['art', 'project', 'ideas', 'grocery', 'thoughts', 'poetry', 'remember'];
let userAvailableTags = [];
let isEditingAvailableTags = false;

// Module-level variables for callbacks and data
let _displayEntriesCallback = null;
let _getLoadedEntriesCallback = null;
let _handleDeleteEntryCallback = null;
let _handleEditClickCallback = null;
let _handleSaveClickCallback = null;
let _handleCancelClickCallback = null;
let _dbInstance = null;
let _currentUserObject = null;
let _searchInput = null;
let _getActiveFilterTagsCallback = null;
let _handleTagClickCallback = null;

// Function to get the current userAvailableTags array
export function getUserAvailableTags() {
    return userAvailableTags;
}

// Function to set the userAvailableTags array (used during loading)
export function setUserAvailableTags(tags) {
    if (Array.isArray(tags)) {
        userAvailableTags = tags;
        console.log('User available tags set:', userAvailableTags);
    } else {
        console.error('Attempted to set userAvailableTags with invalid data:', tags);
        userAvailableTags = [];
    }
}

// Function to render selected tags in the UI (for the entry form)
export function renderSelectedTags() {
    selectedTagsDiv.innerHTML = '';
    selectedTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag');
        tagSpan.textContent = tag;
        const removeTagSpan = document.createElement('span');
        removeTagSpan.classList.add('remove-tag');
        removeTagSpan.textContent = 'x';
        removeTagSpan.onclick = () => removeTag(tag);
        tagSpan.appendChild(removeTagSpan);
        selectedTagsDiv.appendChild(tagSpan);
    });
}

// Function to add a tag to the selected tags list
export function addTag(tag) {
    const lowerCaseTag = tag.toLowerCase().trim();
    if (lowerCaseTag && !selectedTags.includes(lowerCaseTag)) {
        selectedTags.push(lowerCaseTag);
        renderSelectedTags();
        if (_getLoadedEntriesCallback && _handleTagClickCallback) {
            renderAvailableTags(
                _getLoadedEntriesCallback(),
                _handleTagClickCallback,
                _displayEntriesCallback,
                _getLoadedEntriesCallback,
                _handleDeleteEntryCallback,
                _handleEditClickCallback,
                _handleSaveClickCallback,
                _handleCancelClickCallback,
                _dbInstance,
                _currentUserObject
            );
        }
    }
    tagInput.value = '';
}

// Function to remove a tag from the selected tags list
export function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderSelectedTags();
    if (_getLoadedEntriesCallback && _handleTagClickCallback) {
        renderAvailableTags(
            _getLoadedEntriesCallback(),
            _handleTagClickCallback,
            _displayEntriesCallback,
            _getLoadedEntriesCallback,
            _handleDeleteEntryCallback,
            _handleEditClickCallback,
            _handleSaveClickCallback,
            _handleCancelClickCallback,
            _dbInstance,
            _currentUserObject
        );
    }
}

// Function to get all existing tags from entries
function getAllExistingTags(entries) {
    const allTags = new Set();
    entries.forEach(entry => {
        if (entry.tags && Array.isArray(entry.tags)) {
            entry.tags.forEach(tag => allTags.add(tag.toLowerCase()));
        }
    });
    return Array.from(allTags);
}

// Function to remove a tag from userAvailableTags
async function removeAvailableTag(tag, entries, handleTagClickCallback, displayEntriesCallback, getLoadedEntriesCallback, handleDeleteEntryCallback, handleEditClickCallback, handleSaveClickCallback, handleCancelClickCallback, db, currentUser) {
    userAvailableTags = userAvailableTags.filter(t => t !== tag);
    console.log('Removed tag from userAvailableTags:', tag, 'New userAvailableTags:', userAvailableTags);

    // Immediately save the updated userAvailableTags to Firestore
    if (db && currentUser && currentUser.uid) {
        await saveUserAvailableTagsToFirestore(db, currentUser.uid, userAvailableTags);
    }

    // Remove the tag from all entries
    const updatedEntries = entries.map(entry => {
        if (entry.tags && Array.isArray(entry.tags)) {
            return { ...entry, tags: entry.tags.filter(t => t !== tag) };
        }
        return { ...entry, tags: [] }; // Default to empty array if tags is undefined
    });

    // Update Firestore entries
    if (db && currentUser && currentUser.uid) {
        for (const entry of updatedEntries) {
            const entryRef = doc(db, `users/${currentUser.uid}/entries`, entry.id);
            const tagsToUpdate = entry.tags || []; // Ensure tags is never undefined
            await updateDoc(entryRef, { tags: tagsToUpdate })
                .catch(error => console.error(`Failed to update entry ${entry.id}:`, error));
        }
    }

    // Update the global loadedEntries
    if (_getLoadedEntriesCallback) {
        const loadedEntries = _getLoadedEntriesCallback();
        loadedEntries.forEach((entry, index) => {
            const updatedEntry = updatedEntries.find(e => e.id === entry.id);
            if (updatedEntry) {
                loadedEntries[index].tags = updatedEntry.tags;
            }
        });
    }

    // Re-render the UI
    renderAvailableTags(
        updatedEntries,
        handleTagClickCallback,
        displayEntriesCallback,
        getLoadedEntriesCallback,
        handleDeleteEntryCallback,
        handleEditClickCallback,
        handleSaveClickCallback,
        handleCancelClickCallback,
        db,
        currentUser
    );

    // Re-render entries to reflect the updated tags
    displayEntriesCallback(
        updatedEntries,
        _getActiveFilterTagsCallback ? _getActiveFilterTagsCallback() : [],
        _searchInput,
        handleDeleteEntryCallback,
        handleEditClickCallback,
        handleSaveClickCallback,
        handleCancelClickCallback,
        displayEntriesCallback,
        db,
        currentUser,
        getLoadedEntriesCallback,
        displayEntriesCallback
    );
}

// Function to render available tags
export function renderAvailableTags(entries, handleTagClickCallback, displayEntriesCallback, getLoadedEntriesCallback, handleDeleteEntryCallback, handleEditClickCallback, handleSaveClickCallback, handleCancelClickCallback, db, currentUser) {
    availableTagsDiv.innerHTML = '';

    const existingTags = getAllExistingTags(entries);
    const allAvailableTags = [...new Set([...defaultTags, ...userAvailableTags, ...existingTags])].sort();

    allAvailableTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag');
        tagSpan.textContent = tag;
        tagSpan.onclick = () => {
            if (!isEditingAvailableTags) {
                handleTagClickCallback(
                    tag,
                    entries,
                    db,
                    currentUser,
                    getLoadedEntriesCallback,
                    displayEntriesCallback
                );
            }
        };

        if (isEditingAvailableTags) {
            const removeTagSpan = document.createElement('span');
            removeTagSpan.classList.add('remove-tag-available');
            removeTagSpan.textContent = 'x';
            removeTagSpan.onclick = (e) => {
                e.stopPropagation();
                removeAvailableTag(
                    tag,
                    entries,
                    handleTagClickCallback,
                    displayEntriesCallback,
                    getLoadedEntriesCallback,
                    handleDeleteEntryCallback,
                    handleEditClickCallback,
                    handleSaveClickCallback,
                    handleCancelClickCallback,
                    db,
                    currentUser
                );
            };
            tagSpan.appendChild(removeTagSpan);
        }

        availableTagsDiv.appendChild(tagSpan);
    });
}

// Function to render filter tags
export function renderFilterTags(entries, displayEntriesCallback, getLoadedEntriesCallback, handleDeleteEntryCallback, handleEditClickCallback, handleSaveClickCallback, handleCancelClickCallback, db, currentUser) {
    filterTagsListDiv.innerHTML = '';

    const existingTags = getAllExistingTags(entries);
    existingTags.sort().forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag');
        if (activeFilterTags.includes(tag)) {
            tagSpan.classList.add('selected'); // Apply 'selected' class for active filter tags
        }
        tagSpan.textContent = tag;
        tagSpan.onclick = () => {
            toggleFilterTag(
                tag,
                entries,
                displayEntriesCallback,
                getLoadedEntriesCallback,
                handleDeleteEntryCallback,
                handleEditClickCallback,
                handleSaveClickCallback,
                handleCancelClickCallback,
                db,
                currentUser
            );
        };
        filterTagsListDiv.appendChild(tagSpan);
    });
}

// Function to toggle a filter tag and update the UI
export function toggleFilterTag(tag, entries, displayEntriesCallback, getLoadedEntriesCallback, handleDeleteEntryCallback, handleEditClickCallback, handleSaveClickCallback, handleCancelClickCallback, db, currentUser) {
    const index = activeFilterTags.indexOf(tag);
    if (index === -1) {
        activeFilterTags.push(tag);
    } else {
        activeFilterTags.splice(index, 1);
    }
    renderFilterTags(
        entries,
        displayEntriesCallback,
        getLoadedEntriesCallback,
        handleDeleteEntryCallback,
        handleEditClickCallback,
        handleSaveClickCallback,
        handleCancelClickCallback,
        db,
        currentUser
    );

    // Call displayEntriesCallback to filter entries based on the updated activeFilterTags
    displayEntriesCallback(
        entries,
        activeFilterTags,
        searchInput,
        handleDeleteEntryCallback,
        handleEditClickCallback,
        handleSaveClickCallback,
        handleCancelClickCallback,
        displayEntriesCallback,
        db,
        currentUser,
        getLoadedEntriesCallback,
        displayEntriesCallback
    );
}

// Function to load user-specific available tags from Firestore
async function loadUserAvailableTags(db, userId) {
    console.log('Attempting to load user available tags for user:', userId);
    if (!db || !userId) {
        console.warn('Cannot load user available tags: db or userId is missing.');
        userAvailableTags = [];
        return;
    }

    const userTagsDocRef = doc(db, 'users', userId, 'availableTags', 'userTags');

    try {
        const docSnap = await getDoc(userTagsDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && Array.isArray(data.tags)) {
                userAvailableTags = data.tags;
                console.log('Successfully loaded user available tags:', userAvailableTags);
            } else {
                console.log('User available tags document found but missing tags array. Initializing with empty array.');
                userAvailableTags = [];
            }
        } else {
            console.log('No user available tags document found. Initializing with empty array.');
            userAvailableTags = [];
        }
    } catch (error) {
        console.error('Error loading user available tags:', error);
        userAvailableTags = [];
    }
}

// Function to save user-specific available tags to Firestore
async function saveUserAvailableTagsToFirestore(db, userId, tags) {
    console.log('Attempting to save user available tags for user:', userId);
    if (!db || !userId || !tags || !Array.isArray(tags)) {
        console.warn('Cannot save user available tags: db, userId, or tags array is missing/invalid.');
        return;
    }

    const userTagsDocRef = doc(db, 'users', userId, 'availableTags', 'userTags');

    try {
        await setDoc(userTagsDocRef, { tags: tags });
        console.log('Successfully saved user available tags:', tags);
    } catch (error) {
        console.error('Error saving user available tags:', error);
    }
}

// Export the state variables and initialization function
export { selectedTags, activeFilterTags, defaultTags };

// Export a function to initialize tag, filter, and search listeners and store callbacks
export async function initializeTaggingFilteringSearching(
    handleTagClickCallback,
    displayEntriesCallback,
    searchInputElement,
    getLoadedEntriesCallback,
    handleDeleteEntryCallback,
    handleEditClickCallback,
    handleSaveClickCallback,
    handleCancelClickCallback,
    dbInstance,
    currentUserObject,
    getActiveFilterTagsCallback
) {
    console.log('initializeTaggingFilteringSearching called.');
    // Store all necessary callbacks and data in module-level variables
    _displayEntriesCallback = displayEntriesCallback;
    _getLoadedEntriesCallback = getLoadedEntriesCallback;
    _handleDeleteEntryCallback = handleDeleteEntryCallback;
    _handleEditClickCallback = handleEditClickCallback;
    _handleSaveClickCallback = handleSaveClickCallback;
    _handleCancelClickCallback = handleCancelClickCallback;
    _dbInstance = dbInstance;
    _currentUserObject = currentUserObject;
    _searchInput = searchInputElement;
    _getActiveFilterTagsCallback = getActiveFilterTagsCallback;
    _handleTagClickCallback = handleTagClickCallback;

    // Ensure activeFilterTags is initialized
    activeFilterTags = Array.isArray(activeFilterTags) ? activeFilterTags : [];

    // Load user-specific available tags
    if (_dbInstance && _currentUserObject && _currentUserObject.uid) {
        await loadUserAvailableTags(_dbInstance, _currentUserObject.uid);
    } else {
        console.log('User not logged in or db/user object missing. Cannot load user available tags.');
        userAvailableTags = [];
    }

    // Re-render available tags after initialization
    if (_getLoadedEntriesCallback && _handleTagClickCallback && _displayEntriesCallback && _handleDeleteEntryCallback && _handleEditClickCallback && _handleSaveClickCallback && _handleCancelClickCallback && _dbInstance && _currentUserObject) {
        renderAvailableTags(
            _getLoadedEntriesCallback(),
            _handleTagClickCallback,
            _displayEntriesCallback,
            _getLoadedEntriesCallback,
            _handleDeleteEntryCallback,
            _handleEditClickCallback,
            _handleSaveClickCallback,
            _handleCancelClickCallback,
            _dbInstance,
            _currentUserObject
        );
    } else {
        console.error('Missing callbacks to re-render available tags after initialization.');
    }

    // Add event listener for the edit available tags button
    if (editAvailableTagsButton) {
        editAvailableTagsButton.addEventListener('click', async () => {
            isEditingAvailableTags = !isEditingAvailableTags;
            console.log('Edit Available Tags mode toggled:', isEditingAvailableTags);

            // Update button content to show only the icon
            editAvailableTagsButton.innerHTML = isEditingAvailableTags 
                ? '<i class="fas fa-save"></i>' 
                : '<i class="fas fa-edit"></i>';

            editAvailableTagsButton.classList.toggle('editing-active', isEditingAvailableTags);
            availableTagsDiv.classList.toggle('editing-active', isEditingAvailableTags);

            renderAvailableTags(
                _getLoadedEntriesCallback(),
                _handleTagClickCallback,
                _displayEntriesCallback,
                _getLoadedEntriesCallback,
                _handleDeleteEntryCallback,
                _handleEditClickCallback,
                _handleSaveClickCallback,
                _handleCancelClickCallback,
                _dbInstance,
                _currentUserObject
            );
        });
    }

    // Add event listener for adding a tag via the input field
    if (addTagButton) {
        addTagButton.addEventListener('click', () => {
            const tag = tagInput.value.trim();
            if (tag) {
                addTag(tag);
                if (!userAvailableTags.includes(tag.toLowerCase())) {
                    userAvailableTags.push(tag.toLowerCase());
                    if (_dbInstance && _currentUserObject && _currentUserObject.uid) {
                        saveUserAvailableTagsToFirestore(_dbInstance, _currentUserObject.uid, userAvailableTags);
                    }
                }
                tagInput.value = ''; // Clear input after adding
            }
            // Reset button content to avoid rendering issues
            addTagButton.innerHTML = '<i class="fas fa-check"></i>';
        });
    }

    if (tagInput) {
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = tagInput.value.trim();
                if (tag) {
                    addTag(tag);
                    if (!userAvailableTags.includes(tag.toLowerCase())) {
                        userAvailableTags.push(tag.toLowerCase());
                        if (_dbInstance && _currentUserObject && _currentUserObject.uid) {
                            saveUserAvailableTagsToFirestore(_dbInstance, _currentUserObject.uid, userAvailableTags);
                        }
                    }
                    tagInput.value = ''; // Clear input after adding
                }
                // Reset button content to avoid rendering issues
                addTagButton.innerHTML = '<i class="fas fa-check"></i>';
            }
        });
    }

    // Add event listener for search input
    if (searchInputElement) {
        searchInputElement.addEventListener('input', () => {
            displayEntriesCallback(
                _getLoadedEntriesCallback(),
                _getActiveFilterTagsCallback ? _getActiveFilterTagsCallback() : [],
                searchInputElement,
                _handleDeleteEntryCallback,
                _handleEditClickCallback,
                _handleSaveClickCallback,
                _handleCancelClickCallback,
                displayEntriesCallback,
                _dbInstance,
                _currentUserObject,
                _getLoadedEntriesCallback,
                displayEntriesCallback
            );
        });
    }
}