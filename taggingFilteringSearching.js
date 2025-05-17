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
let loadedEntries = []; // This module might need loadedEntries to get existing tags and filter/search

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
    }
    tagInput.value = ''; // Clear input after adding
}

// Function to remove a tag from the selected tags list
export function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderSelectedTags();
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
export function renderAvailableTags(entries) {
    loadedEntries = entries; // Update loadedEntries state in this module
    availableTagsDiv.innerHTML = '';

    // Combine default tags and unique tags from loaded entries
    const allUniqueTags = [...new Set([...defaultTags, ...getAllExistingTags(loadedEntries)])];

    console.log('Available tags before rendering:', allUniqueTags);

    if (allUniqueTags.length === 0) {
        availableTagsDiv.innerHTML = '<p>No available tags yet.</p>';
        return;
    }

    allUniqueTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag', 'available-tag');
        tagSpan.textContent = tag;
        tagSpan.onclick = () => addTag(tag); // Add tag on click
        availableTagsDiv.appendChild(tagSpan);
    });
}

// Function to render filter tags
export function renderFilterTags(entries) {
     loadedEntries = entries; // Update loadedEntries state in this module
    filterTagsListDiv.innerHTML = '';

    // Get all unique tags from loaded entries
    const allUniqueTags = getAllExistingTags(loadedEntries);

    console.log('Filter tags before rendering:', allUniqueTags);

    if (allUniqueTags.length === 0) {
        filterTagsListDiv.innerHTML = '<p>No tags available for filtering.</p>';
        return;
    }

    allUniqueTags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag', 'filter-tag');
        tagSpan.textContent = tag;

        // Add click listener to toggle filter
        tagSpan.addEventListener('click', () => {
            toggleFilterTag(tag);
        });

        // Add 'selected' class if the tag is in activeFilterTags
        if (activeFilterTags.includes(tag)) {
            tagSpan.classList.add('selected');
        }

        filterTagsListDiv.appendChild(tagSpan);
    });
}

// Function to toggle a tag in the active filter list
export function toggleFilterTag(tag, displayEntriesCallback) {
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
    renderFilterTags(loadedEntries); // Pass loadedEntries

    // Re-display entries with the new filter - requires a callback to the display module
    if (displayEntriesCallback) {
        displayEntriesCallback(loadedEntries, activeFilterTags, searchInput);
    }
}

// Event listener for the tag input
tagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission
        addTag(tagInput.value);
    }
});

// Event listener for the add tag button
document.getElementById('add-tag-button').addEventListener('click', () => {
    addTag(tagInput.value);
});

// Event listener for the search input
searchInput.addEventListener('input', () => {
    // Re-filter and display based on current search and tag filters
    // Need access to loadedEntries and displayEntries function - this listener needs to be initialized with a callback
});

// Export the state variables and initialization function
export { selectedTags, activeFilterTags, defaultTags };

// Export a function to initialize tag, filter, and search listeners that need callbacks
export function initializeTaggingFilteringSearching(displayEntriesCallback) {
    // Pass the displayEntriesCallback to the search input listener
    searchInput.addEventListener('input', () => {
        // Ensure loadedEntries is accessible here, or passed in initializeTaggingFilteringSearching
        // For now, assuming loadedEntries is updated in script.js and this module has access (less ideal)
        // A better approach would be to pass loadedEntries to the filtering/searching function

        // Let's pass the loadedEntries to initializeTaggingFilteringSearching
        // This listener closure will have access to the loadedEntries passed during init
         displayEntriesCallback(window.loadedEntriesForFiltering, activeFilterTags, searchInput); // Use a globally accessible loadedEntries for filtering
    });

    // Pass the displayEntriesCallback to the toggleFilterTag function indirectly via its listener
    filterTagsListDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-tag')) {
            const tag = e.target.textContent;
            toggleFilterTag(tag, displayEntriesCallback); // Pass the callback
        }
    });

    // Note: The event listeners for tagInput and add-tag-button are attached when the module is imported and the DOM is ready.
    // If they needed to be attached conditionally, they would be moved inside initializeTaggingFilteringSearching.
} 