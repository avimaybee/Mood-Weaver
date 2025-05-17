import { handleDeleteEntry } from './script.js'; // Import if needed here, or ensure it's passed as callback
// We need to import displayEntries here to use it in toggleFilterTag and the search input listener
import { displayEntries } from './journalEntryDisplay.js';

// Get DOM elements needed for this module
const selectedTagsDiv = document.getElementById('selected-tags');
const tagInput = document.getElementById('tag-input');
const availableTagsDiv = document.getElementById('available-tags');
const filterTagsListDiv = document.getElementById('filter-tags-list');
const searchInput = document.getElementById('search-input');

// --- Variables --- 
// selectedTags and activeFilterTags state should live here
let selectedTags = []; // To hold tags for the current entry being created/edited
let activeFilterTags = []; // To store tags currently selected for filtering
const defaultTags = ['art', 'project', 'ideas', 'grocery', 'thoughts', 'poetry', 'remember']; // Default tags
// loadedEntries is now managed in script.js and passed to functions in this module
// let loadedEntries = []; 

// Keep track of the callbacks and data needed for filtering/searching updates
let _displayEntriesCallback = null;
let _getLoadedEntriesCallback = null;
let _handleDeleteEntryCallback = null;
let _handleEditClickCallback = null;
let _handleSaveClickCallback = null;
let _handleCancelClickCallback = null;
let _dbInstance = null;
let _currentUserObject = null;
let _searchInput = null; // Store search input element

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
// This function is called from renderAvailableTags and event listeners
export function addTag(
    tag
    // Callbacks and data are now stored in module-level variables
) { // Simplified parameters here
    const lowerCaseTag = tag.toLowerCase().trim();
    if (lowerCaseTag && !selectedTags.includes(lowerCaseTag)) {
        selectedTags.push(lowerCaseTag);
        renderSelectedTags();
        // Re-render available tags to reflect the selection (optional but good UX)
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
    tagInput.value = ''; // Clear input after adding
}

// Function to remove a tag from the selected tags list
// This function is called from renderSelectedTags
export function removeTag(tag) { // Removed parameters
    selectedTags = selectedTags.filter(t => t !== tag);
    renderSelectedTags();
    // Re-render available tags after removing a selected tag
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
    // Optionally re-display entries after removing a tag if in filter mode (optional)
     // if (_displayEntriesCallback && activeFilterTags.length > 0) { _displayEntriesCallback(_getLoadedEntriesCallback(), activeFilterTags, searchInput); }
}

// Helper function to get all unique tags from a given list of entries
function getAllExistingTags(entries) {
    console.log('getAllExistingTags called with entries:', entries); // Added log
    const existingTags = [];
    if (!entries) {
        console.log('getAllExistingTags received no entries.'); // Added log
        return existingTags;
    }
    console.log('getAllExistingTags processing entries...'); // Added log
    entries.forEach(entry => {
        console.log('Processing entry in getAllExistingTags:', entry); // Added log
        if (entry.tags && Array.isArray(entry.tags)) {
            console.log('Entry has tags array:', entry.tags);
            entry.tags.forEach(tag => {
                console.log('Processing tag in getAllExistingTags:', tag); // Added log
                if (typeof tag === 'string' && tag.trim() !== '' && !existingTags.includes(tag.toLowerCase().trim())) { // Added checks for string, not empty, and lowercase uniqueness
                    existingTags.push(tag.toLowerCase().trim()); // Store tags in lowercase
                    console.log('Added tag to existingTags:', tag.toLowerCase().trim(), '; current existingTags:', existingTags); // Added log
                }
            });
        } else {
             console.log('Entry does not have a tags array or tags is not an array.', entry);
        }
    });
     console.log('getAllExistingTags finished, returning:', existingTags);
    return existingTags;
}

// Function to collect and render available tags (defaults + existing from loadedEntries)
// This function is called from script.js and needs necessary callbacks/data
// Updated to accept all necessary displayEntries parameters and store them
export function renderAvailableTags(
    entries, // Entries to get tags from
    handleTagClickCallback, // Callback for individual tag clicks (passed from script.js)
    displayEntriesCallback, // Callback to refresh entry display
    getLoadedEntriesCallback, // Callback to get current loaded entries
    handleDeleteEntryCallback, // Callback for delete button
    handleEditClickCallback, // Callback for edit button
    handleSaveClickCallback, // Callback for save button
    handleCancelClickCallback, // Callback for cancel button
    dbInstance, // Firestore db instance
    currentUserObject // Current user object
) { // Added parameters
    console.log('renderAvailableTags called with entries:', entries); // Added log
    console.log('renderAvailableTags received arguments:', arguments); // Added log to see all args

    // Store callbacks and data in module-level variables
    _displayEntriesCallback = displayEntriesCallback;
    _getLoadedEntriesCallback = getLoadedEntriesCallback;
    _handleDeleteEntryCallback = handleDeleteEntryCallback;
    _handleEditClickCallback = handleEditClickCallback;
    _handleSaveClickCallback = handleSaveClickCallback;
    _handleCancelClickCallback = handleCancelClickCallback;
    _dbInstance = dbInstance;
    _currentUserObject = currentUserObject;
    // _searchInput is stored in initializeTaggingFilteringSearching

    availableTagsDiv.innerHTML = '';

    // Combine default tags and unique tags from loaded entries
    const allUniqueTags = [...new Set([...defaultTags, ...getAllExistingTags(entries)])];

    console.log('Available tags after combining defaults and existing:', allUniqueTags); // Added log

    if (allUniqueTags.length === 0) {
        availableTagsDiv.innerHTML = '<p>No available tags yet.</p>';
        console.log('No available tags to render.'); // Added log
        return;
    }

    console.log('Rendering available tags:', allUniqueTags); // Added log
    allUniqueTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag', 'available-tag');
        tagSpan.textContent = tag;

        // Highlight if the tag is already selected for the new entry
        if (selectedTags.includes(tag)) {
            tagSpan.classList.add('selected');
        }

        // Add click listener - call the passed callback
        // The callback (handleTagClick in script.js) will then call addTag with necessary context
        tagSpan.onclick = () => handleTagClickCallback(tag, entries, _dbInstance, _currentUserObject, _getLoadedEntriesCallback, _displayEntriesCallback);

        availableTagsDiv.appendChild(tagSpan);
        console.log('Appended available tag:', tag); // Added log
    });
    console.log('Finished rendering available tags.'); // Added log
}

// Function to render filter tags
// This function is called from script.js and toggleFilterTag, and needs necessary callbacks/data
// Updated to accept all necessary displayEntries parameters and store them
export function renderFilterTags(
    entries, // Entries to get tags from
    displayEntriesCallback, // Callback to refresh entry display
    getLoadedEntriesCallback, // Callback to get current loaded entries
    handleDeleteEntryCallback, // Callback for delete button
    handleEditClickCallback, // Callback for edit button
    handleSaveClickCallback, // Callback for save button
    handleCancelClickCallback, // Callback for cancel button
    dbInstance, // Firestore db instance
    currentUserObject // Current user object
) { // Added parameters
    console.log('renderFilterTags called with entries:', entries); // Added log
     console.log('renderFilterTags received arguments:', arguments); // Added log to see all args

    // Store callbacks and data in module-level variables (if not already stored by renderAvailableTags)
    if (!_displayEntriesCallback) {
        _displayEntriesCallback = displayEntriesCallback;
        _getLoadedEntriesCallback = getLoadedEntriesCallback;
        _handleDeleteEntryCallback = handleDeleteEntryCallback;
        _handleEditClickCallback = handleEditClickCallback;
        _handleSaveClickCallback = handleSaveClickCallback;
        _handleCancelClickCallback = handleCancelClickCallback;
        _dbInstance = dbInstance;
        _currentUserObject = currentUserObject;
    }

    filterTagsListDiv.innerHTML = '';

    // Get all unique tags from loaded entries
    const allUniqueTags = getAllExistingTags(entries);

    console.log('Filter tags after getting existing:', allUniqueTags); // Added log

    if (allUniqueTags.length === 0) {
        filterTagsListDiv.innerHTML = '<p>No tags available for filtering.</p>';
        console.log('No filter tags to render.'); // Added log
        return;
    }

    console.log('Rendering filter tags:', allUniqueTags); // Added log
    allUniqueTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag', 'filter-tag');
        tagSpan.textContent = tag;

        // Add click listener to toggle filter, passing callbacks and entries via the stored variables
        tagSpan.addEventListener('click', () => {
            toggleFilterTag(tag); // Use stored callbacks/data inside toggleFilterTag
        });

        // Add 'selected' class if the tag is in activeFilterTags
        if (activeFilterTags.includes(tag)) {
            tagSpan.classList.add('selected');
        }

        filterTagsListDiv.appendChild(tagSpan);
        console.log('Appended filter tag:', tag); // Added log
    });
    console.log('Finished rendering filter tags.'); // Added log
}

// Function to toggle a tag in the active filter list
// This function is called from renderFilterTags click listener
export function toggleFilterTag(
    tag
    // Callbacks and data are now stored in module-level variables
) { // Simplified parameters here
    const index = activeFilterTags.indexOf(tag);
    if (index > -1) {
        // Tag is already in filter, remove it
        activeFilterTags.splice(index, 1);
    } else {
        // Tag is not in filter, add it
        activeFilterTags.push(tag);
    }

    console.log('Active filter tags:', activeFilterTags);

    // Re-render filter tags to update selection style
    // Use stored callbacks/data
    if (_getLoadedEntriesCallback) {
        renderFilterTags(
            _getLoadedEntriesCallback(),
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

    // Re-display entries with the new filter - requires the stored callback
    if (_displayEntriesCallback && _getLoadedEntriesCallback && _searchInput) {
        _displayEntriesCallback(
            _getLoadedEntriesCallback(), // entriesToDisplay
            activeFilterTags, // activeFilterTags
            _searchInput, // searchInput element
            _handleDeleteEntryCallback,
            _handleEditClickCallback,
            _handleSaveClickCallback,
            _handleCancelClickCallback,
            _displayEntriesCallback, // postDisplayCallback
            _dbInstance,
            _currentUserObject,
            _getLoadedEntriesCallback
        );
    }
}

// Event listener for the tag input
tagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission
        addTag(tagInput.value); // Call addTag without callbacks, as they are stored
    }
});

// Event listener for the add tag button
document.getElementById('add-tag-button').addEventListener('click', () => {
    addTag(tagInput.value); // Call addTag without callbacks
});

// Event listener for the search input
// This listener needs to use the stored callbacks/data for re-displaying entries
searchInput.addEventListener('input', () => {
    console.log('Search input changed:', searchInput.value);
     if (_displayEntriesCallback && _getLoadedEntriesCallback && _searchInput) {
         _displayEntriesCallback(
             _getLoadedEntriesCallback(), // entriesToDisplay
             activeFilterTags, // activeFilterTags
             _searchInput, // searchInput element
             _handleDeleteEntryCallback,
             _handleEditClickCallback,
             _handleSaveClickCallback,
             _handleCancelClickCallback,
             _displayEntriesCallback, // postDisplayCallback
             _dbInstance,
             _currentUserObject,
             _getLoadedEntriesCallback
        );
     }
});

// Export the state variables and initialization function
export { selectedTags, activeFilterTags, defaultTags };

// Export a function to initialize tag, filter, and search listeners and store callbacks
export function initializeTaggingFilteringSearching(
    handleTagClickCallback, // Callback for individual tag clicks (from script.js)
    displayEntriesCallback, // Callback to refresh entry display (from script.js)
    searchInputElement, // Search input element (from script.js)
    getLoadedEntriesCallback, // Callback to get current loaded entries (from script.js)
    handleDeleteEntryCallback, // Callback for delete button (from script.js)
    handleEditClickCallback, // Callback for edit button (from script.js)
    handleSaveClickCallback, // Callback for save button (from script.js)
    handleCancelClickCallback, // Callback for cancel button (from script.js)
    dbInstance, // Firestore db instance (from script.js)
    currentUserObject // Current user object (from script.js)
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
    _searchInput = searchInputElement; // Store the search input element

    // Note: Event listeners for tagInput, add-tag-button, and searchInput are attached when the module is loaded.
    // The logic within those listeners will now use the stored module-level variables.

    // The event listener for filter tags clicks is added dynamically in renderFilterTags
}

// Export the handleTagClick function definition from script.js if it's needed elsewhere
// Based on current imports, handleTagClick is defined and used only within script.js
// But renderAvailableTags needs a handleTagClickCallback passed in. So no export needed here.

let _handleTagClickCallback = null; // Store the handleTagClick callback passed from script.js

export function setHandleTagClickCallback(callback) {
    _handleTagClickCallback = callback;
} 