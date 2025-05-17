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
export function addTag(tag, displayEntriesCallback, loadedEntries) {
    const lowerCaseTag = tag.toLowerCase().trim();
    if (lowerCaseTag && !selectedTags.includes(lowerCaseTag)) {
        selectedTags.push(lowerCaseTag);
        renderSelectedTags();
        // Re-display entries after adding a tag if in filter mode (optional, depending on desired UX)
        // If you want adding a tag to immediately filter, uncomment the line below and pass necessary args
        // if (displayEntriesCallback) { displayEntriesCallback(loadedEntries, activeFilterTags, searchInput); }
    }
    tagInput.value = ''; // Clear input after adding
}

// Function to remove a tag from the selected tags list
export function removeTag(tag, displayEntriesCallback, loadedEntries) {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderSelectedTags();
    // Re-display entries after removing a tag if in filter mode (optional)
     // if (displayEntriesCallback) { displayEntriesCallback(loadedEntries, activeFilterTags, searchInput); }
}

// Helper function to get all unique tags from a given list of entries
function getAllExistingTags(entries) {
    const existingTags = [];
    if (!entries) return existingTags;
    entries.forEach(entry => {
        if (entry.tags && Array.isArray(entry.tags)) {
            entry.tags.forEach(tag => {
                if (!existingTags.includes(tag)) {
                    existingTags.push(tag);
                }
            });
        }
    });
    return existingTags;
}

// Function to collect and render available tags (defaults + existing from loadedEntries)
export function renderAvailableTags(entries, displayEntriesCallback) {
    // loadedEntries state is now managed outside this module
    availableTagsDiv.innerHTML = '';

    // Combine default tags and unique tags from loaded entries
    const allUniqueTags = [...new Set([...defaultTags, ...getAllExistingTags(entries)])];

    console.log('Available tags before rendering:', allUniqueTags);

    if (allUniqueTags.length === 0) {
        availableTagsDiv.innerHTML = '<p>No available tags yet.</p>';
        return;
    }

    allUniqueTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag', 'available-tag');
        tagSpan.textContent = tag;
        // Pass necessary callbacks/data to addTag
        tagSpan.onclick = () => addTag(tag, displayEntriesCallback, entries); // Add tag on click
        availableTagsDiv.appendChild(tagSpan);
    });
}

// Function to render filter tags
export function renderFilterTags(entries, displayEntriesCallback) {
    // loadedEntries state is now managed outside this module
    filterTagsListDiv.innerHTML = '';

    // Get all unique tags from loaded entries
    const allUniqueTags = getAllExistingTags(entries);

    console.log('Filter tags before rendering:', allUniqueTags);

    if (allUniqueTags.length === 0) {
        filterTagsListDiv.innerHTML = '<p>No tags available for filtering.</p>';
        return;
    }

    allUniqueTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag', 'filter-tag');
        tagSpan.textContent = tag;

        // Add click listener to toggle filter, passing callback and entries
        tagSpan.addEventListener('click', () => {
            toggleFilterTag(tag, displayEntriesCallback, entries);
        });

        // Add 'selected' class if the tag is in activeFilterTags
        if (activeFilterTags.includes(tag)) {
            tagSpan.classList.add('selected');
        }

        filterTagsListDiv.appendChild(tagSpan);
    });
}

// Function to toggle a tag in the active filter list
export function toggleFilterTag(tag, displayEntriesCallback, loadedEntries) {
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
    renderFilterTags(loadedEntries, displayEntriesCallback); // Pass loadedEntries and callback

    // Re-display entries with the new filter - requires a callback to the display module
    if (displayEntriesCallback) {
        displayEntriesCallback(loadedEntries, activeFilterTags, searchInput);
    }
}

// Export the state variables and initialization function
export { selectedTags, activeFilterTags, defaultTags };

// Export a function to initialize tag, filter, and search listeners that need callbacks and loadedEntries
export function initializeTaggingFilteringSearching(displayEntriesCallback, getLoadedEntries) {
    // Pass the displayEntriesCallback and loadedEntries to the search input listener
    searchInput.addEventListener('input', () => {
        const currentLoadedEntries = getLoadedEntries(); // Get the latest loaded entries from script.js
        displayEntriesCallback(currentLoadedEntries, activeFilterTags, searchInput);
    });

    // The event listeners for tagInput and add-tag-button are attached when the module is imported and the DOM is ready.
    // They need to use the addTag function which now takes callbacks/data.
    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const currentLoadedEntries = getLoadedEntries();
            addTag(tagInput.value, displayEntriesCallback, currentLoadedEntries);
        }
    });

    document.getElementById('add-tag-button').addEventListener('click', () => {
        const currentLoadedEntries = getLoadedEntries();
        addTag(tagInput.value, displayEntriesCallback, currentLoadedEntries);
    });

    // The filterTagsListDiv listener is attached in initializeTaggingFilteringSearching
    filterTagsListDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-tag')) {
            const tag = e.target.textContent;
             const currentLoadedEntries = getLoadedEntries();
            toggleFilterTag(tag, displayEntriesCallback, currentLoadedEntries); // Pass the callback and entries
        }
    });
} 