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
// This function might be called from renderAvailableTags, which has displayEntriesCallback and loadedEntries
export function addTag(
    tag,
    displayEntriesCallback, // Callback to refresh entry display
    loadedEntries, // Current loaded entries array
    getLoadedEntriesCallback, // Callback to get current loaded entries
    handleDeleteEntryCallback, // Callback for delete button
    handleEditClickCallback, // Callback for edit button
    handleSaveClickCallback, // Callback for save button
    handleCancelClickCallback, // Callback for cancel button
    dbInstance, // Firestore db instance
    currentUserObject // Current user object
) { // Added parameters
    const lowerCaseTag = tag.toLowerCase().trim();
    if (lowerCaseTag && !selectedTags.includes(lowerCaseTag)) {
        selectedTags.push(lowerCaseTag);
        renderSelectedTags();
        // Optionally re-display entries after adding a tag if in filter/search context
        if (displayEntriesCallback && getLoadedEntriesCallback) {
             const currentLoadedEntries = getLoadedEntriesCallback();
             // Pass all necessary arguments to displayEntriesCallback
             displayEntriesCallback(
                currentLoadedEntries, // entriesToDisplay
                activeFilterTags, // activeFilterTags
                searchInput, // searchInput element
                handleDeleteEntryCallback, // handleDeleteEntryCallback
                handleEditClickCallback, // handleEditClickCallback
                handleSaveClickCallback, // handleSaveClickCallback
                handleCancelClickCallback, // handleCancelClickCallback
                displayEntriesCallback, // postDisplayCallback (pass itself)
                dbInstance, // db
                currentUserObject, // currentUser
                getLoadedEntriesCallback // getLoadedEntriesCallback
             );
        }
    }
    tagInput.value = ''; // Clear input after adding
}

// Function to remove a tag from the selected tags list
// This function might be called from renderSelectedTags, which doesn't have callbacks
export function removeTag(tag) { // Removed parameters
    selectedTags = selectedTags.filter(t => t !== tag);
    renderSelectedTags();
    // Re-display entries after removing a tag if in filter mode (optional)
     // if (displayEntriesCallback) { displayEntriesCallback(loadedEntries, activeFilterTags, searchInput); }
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
                if (!existingTags.includes(tag)) {
                    existingTags.push(tag);
                    console.log('Added tag to existingTags:', tag, '; current existingTags:', existingTags);
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
// This function is called from script.js and needs displayEntriesCallback and getLoadedEntries
// Updated to accept all necessary displayEntries parameters
export function renderAvailableTags(
    entries, // Entries to get tags from
    handleTagClickCallback, // Callback for individual tag clicks
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
    // loadedEntries state is now managed outside this module
    availableTagsDiv.innerHTML = '';

    // Combine default tags and unique tags from loaded entries
    const allUniqueTags = [...new Set([...defaultTags, ...getAllExistingTags(entries)])];

    console.log('Available tags after combining defaults and existing:', allUniqueTags); // Added log

    if (allUniqueTags.length === 0) {
        availableTagsDiv.innerHTML = '<p>No available tags yet.</p>';
        return;
    }

    allUniqueTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag', 'available-tag');
        tagSpan.textContent = tag;
        // Pass necessary callbacks/data to addTag, including the new parameters
        tagSpan.onclick = () => addTag(
            tag,
            displayEntriesCallback,
            entries,
            getLoadedEntriesCallback,
            handleDeleteEntryCallback,
            handleEditClickCallback,
            handleSaveClickCallback,
            handleCancelClickCallback,
            dbInstance,
            currentUserObject
        ); // Pass callbacks and data
        availableTagsDiv.appendChild(tagSpan);
    });
}

// Function to render filter tags
// This function is called from script.js and toggleFilterTag, and needs displayEntriesCallback and getLoadedEntries
// Updated to accept all necessary displayEntries parameters
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
    // Add a check for the getLoadedEntries callback
    if (typeof getLoadedEntriesCallback !== 'function') { // Corrected variable name
        console.warn('renderFilterTags called without getLoadedEntries callback.', { entries, displayEntriesCallback });
        // Potentially handle this case gracefully if needed
    }

    // loadedEntries state is now managed outside this module
    filterTagsListDiv.innerHTML = '';

    // Get all unique tags from loaded entries
    const allUniqueTags = getAllExistingTags(entries);

    console.log('Filter tags after getting existing:', allUniqueTags); // Added log

    if (allUniqueTags.length === 0) {
        filterTagsListDiv.innerHTML = '<p>No tags available for filtering.</p>';
        return;
    }

    allUniqueTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag', 'filter-tag');
        tagSpan.textContent = tag;

        // Add click listener to toggle filter, passing callbacks and entries, including new parameters
        // When clicking a filter tag, we want to pass the callbacks
        tagSpan.addEventListener('click', () => {
            toggleFilterTag(
                tag,
                displayEntriesCallback,
                entries,
                getLoadedEntriesCallback,
                handleDeleteEntryCallback,
                handleEditClickCallback,
                handleSaveClickCallback,
                handleCancelClickCallback,
                dbInstance,
                currentUserObject
            ); // Pass callbacks and data
        });

        // Add 'selected' class if the tag is in activeFilterTags
        if (activeFilterTags.includes(tag)) {
            tagSpan.classList.add('selected');
        }

        filterTagsListDiv.appendChild(tagSpan);
    });
}

// Function to toggle a tag in the active filter list
// This function is called from renderFilterTags, and needs displayEntriesCallback and getLoadedEntries
export function toggleFilterTag(
    tag,
    displayEntriesCallback, // Callback to refresh entry display
    loadedEntries, // Current loaded entries array
    getLoadedEntriesCallback, // Callback to get current loaded entries
    handleDeleteEntryCallback, // Callback for delete button
    handleEditClickCallback, // Callback for edit button
    handleSaveClickCallback, // Callback for save button
    handleCancelClickCallback, // Callback for cancel button
    dbInstance, // Firestore db instance
    currentUserObject // Current user object
) { // Added parameters
    const index = activeFilterTags.indexOf(tag);
    if (index > -1) {
        // Tag is already in filter, remove it
        activeFilterTags.splice(index, 1);
    } else {
        // Tag is not in filter, add it
        activeFilterTags.push(tag);
    }

    console.log('Active filter tags:', activeFilterTags);

    // Re-render filter tags to update selection style, passing callbacks and new parameters
    renderFilterTags(
        loadedEntries,
        displayEntriesCallback,
        getLoadedEntriesCallback,
        handleDeleteEntryCallback,
        handleEditClickCallback,
        handleSaveClickCallback,
        handleCancelClickCallback,
        dbInstance,
        currentUserObject
    ); // Pass callbacks and data

    // Clear the search input when a filter tag is clicked
    searchInput.value = '';

    // Re-display entries with the new filter - requires a callback to the display module
    if (displayEntriesCallback) {
        const currentLoadedEntries = getLoadedEntriesCallback(); // Use the passed callback
        // Pass all necessary arguments to displayEntriesCallback
        displayEntriesCallback(
            currentLoadedEntries, // entriesToDisplay
            activeFilterTags, // activeFilterTags
            searchInput, // searchInput element
            handleDeleteEntryCallback, // handleDeleteEntryCallback
            handleEditClickCallback, // handleEditClickCallback
            handleSaveClickCallback, // handleSaveClickCallback
            handleCancelClickCallback, // handleCancelClickCallback
            displayEntriesCallback, // postDisplayCallback (pass itself)
            dbInstance, // db
            currentUserObject, // currentUser
            getLoadedEntriesCallback // getLoadedEntriesCallback
        );
    }
}

// Export the state variables and initialization function
export { selectedTags, activeFilterTags, defaultTags, initializeTaggingFilteringSearching };

// Export a function to initialize tag, filter, and search listeners that need callbacks and loadedEntries
// Updated to accept all necessary displayEntries parameters
function initializeTaggingFilteringSearching(
    handleTagClickCallback, // Callback for individual tag clicks
    displayEntriesCallback, // Callback to refresh entry display
    searchInput, // Search input element
    getLoadedEntriesCallback, // Callback to get current loaded entries
    handleDeleteEntryCallback, // Callback for delete button
    handleEditClickCallback, // Callback for edit button
    handleSaveClickCallback, // Callback for save button
    handleCancelClickCallback, // Callback for cancel button
    dbInstance, // Firestore db instance
    currentUserObject // Current user object
) { // Added parameters
    // Pass the displayEntriesCallback and loadedEntries to the search input listener
    searchInput.addEventListener('input', () => {
        const currentLoadedEntries = getLoadedEntriesCallback(); // Use the passed callback
        // Pass all necessary arguments to displayEntriesCallback
        displayEntriesCallback(
            currentLoadedEntries, // entriesToDisplay
            activeFilterTags, // activeFilterTags
            searchInput, // searchInput element
            handleDeleteEntryCallback, // handleDeleteEntryCallback
            handleEditClickCallback, // handleEditClickCallback
            handleSaveClickCallback, // handleSaveClickCallback
            handleCancelClickCallback, // handleCancelClickCallback
            displayEntriesCallback, // postDisplayCallback (pass itself as the callback)
            dbInstance, // db
            currentUserObject, // currentUser
            getLoadedEntriesCallback // getLoadedEntriesCallback
        );
    });

    // The event listeners for tagInput and add-tag-button are attached when the module is imported and the DOM is ready.
    // They need to use the addTag function which now takes callbacks/data.
    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const currentLoadedEntries = getLoadedEntriesCallback();
            // Pass all necessary arguments to addTag
            addTag(
                tagInput.value,
                displayEntriesCallback,
                currentLoadedEntries,
                getLoadedEntriesCallback,
                handleDeleteEntryCallback,
                handleEditClickCallback,
                handleSaveClickCallback,
                handleCancelClickCallback,
                dbInstance,
                currentUserObject
            ); // Pass callbacks and data
        }
    });

    document.getElementById('add-tag-button').addEventListener('click', () => {
        const currentLoadedEntries = getLoadedEntriesCallback();
         // Pass all necessary arguments to addTag
         addTag(
            tagInput.value,
            displayEntriesCallback,
            currentLoadedEntries,
            getLoadedEntriesCallback,
            handleDeleteEntryCallback,
            handleEditClickCallback,
            handleSaveClickCallback,
            handleCancelClickCallback,
            dbInstance,
            currentUserObject
        ); // Pass callbacks and data
    });

    // The filterTagsListDiv listener is attached in initializeTaggingFilteringSearching
    // This listener is primarily for handling clicks on the list container itself, not individual tags.
    filterTagsListDiv.addEventListener('click', (e) => {
        // This listener might be redundant now that event listeners are attached directly to tag spans.
        // However, keeping it to potentially handle clicks outside of a specific tag.
        if (e.target.classList.contains('filter-tag')) {
            // The event is handled by the listener on the span itself. Do nothing here.
            console.log('Delegated listener caught click on filter-tag, but direct listener is handling it.');
        } else {
            // Optional: Handle clicks outside of tags if needed in the future.
            // console.log('Delegated listener caught click outside filter-tag.');
        }
    });
} 