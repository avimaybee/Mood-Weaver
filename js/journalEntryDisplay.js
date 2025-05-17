import { handleDeleteEntry } from './script.js';
import { updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js"; // Import Firestore update functions
import { collection, query, orderBy, onSnapshot, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
// We will need getCurrentUser from auth.js, but let's pass it as a parameter instead of importing here

// Get DOM elements needed for this module
const entriesList = document.getElementById('entries-list');
const searchInput = document.getElementById('search-input');

// Function to display entries
// Updated to accept currentUser object instead of getCurrentUser function
export function displayEntries(entriesToDisplay, activeFilterTags, searchInput, handleDeleteEntryCallback, handleEditClick, handleSaveClick, handleCancelClick, postDisplayCallback, db, currentUser, getLoadedEntriesCallback, displayEntriesCallback) {
    entriesList.innerHTML = ''; // Clear current list

    console.log('displayEntries received currentUser:', currentUser);

    // Filter entries based on activeFilterTags
    const filteredEntries = entriesToDisplay.filter(entry => {
        if (activeFilterTags.length === 0) {
            return true; // Show all entries if no filter is active
        }
        // Check if entry has ALL activeFilterTags
        return activeFilterTags.every(filterTag => 
            entry.tags && entry.tags.includes(filterTag) && entry.tags.length > 0
        );
    });

    // Further filter by search input if it's not empty
    const searchTerm = searchInput.value.toLowerCase(); // Access searchInput here
    const searchedEntries = filteredEntries.filter(entry => {
        if (searchTerm === '') {
            return true; // No search term, include all filtered entries
        }
        // Check if content or any tag includes the search term
        const contentMatch = entry.content && entry.content.toLowerCase().includes(searchTerm);
        const tagsMatch = entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        return contentMatch || tagsMatch;
    });

    if (searchedEntries.length === 0) {
        entriesList.innerHTML = '<p>No entries found matching your criteria.</p>';
        return;
    }

    searchedEntries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.classList.add('entry');
        entryElement.dataset.id = entry.id;

        // View mode elements (initially visible)
        const viewModeDiv = document.createElement('div');
        viewModeDiv.classList.add('entry-view-mode');

        if (entry.aiTitle) {
            const titleH3 = document.createElement('h3');
            titleH3.classList.add('entry-ai-title');
            titleH3.textContent = entry.aiTitle;
            viewModeDiv.appendChild(titleH3);
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('entry-content');
        contentDiv.innerHTML = entry.content.replace(/\n/g, '<br>');
        viewModeDiv.appendChild(contentDiv);

        // Timestamp for the entry itself
        const entryTimestampSpan = document.createElement('span');
        entryTimestampSpan.classList.add('timestamp');
        entryTimestampSpan.textContent = `Saved: ${entry.timestamp ? formatUserFriendlyTimestamp(entry.timestamp) : 'Saving...'}`;
        viewModeDiv.appendChild(entryTimestampSpan);

        // Display tags in view mode
        const tagsDiv = document.createElement('div');
        tagsDiv.classList.add('entry-tags');
        if (entry.tags && entry.tags.length > 0) {
            tagsDiv.innerHTML = entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        }
        viewModeDiv.appendChild(tagsDiv);

        // AI Insights Section (remains the same, part of view mode initially)
        const aiInsightsContainer = document.createElement('div');
        aiInsightsContainer.classList.add('ai-insights-container');

        const aiInsightsDiv = document.createElement('div');
        aiInsightsDiv.classList.add('ai-insights');

        if (entry.aiError) {
            aiInsightsDiv.innerHTML = `<p class="ai-error"><strong>AI Analysis:</strong> Error - ${entry.aiError}</p>`;
        } else if (entry.aiTitle || entry.aiGreeting) {
            let insightsHtml = '';
            if (entry.aiGreeting) {
                insightsHtml += `<p class="ai-greeting"><em>${entry.aiGreeting}</em></p>`;
                }
            if (entry.aiObservations) {
                insightsHtml += `<p class="ai-observation"><strong>Observations:</strong> ${entry.aiObservations}</p>`;
                }
            if (entry.aiSentimentAnalysis) {
                insightsHtml += `<p class="ai-sentiment-analysis"><strong>Sentiment:</strong> ${entry.aiSentimentAnalysis}</p>`;
                }
            if (entry.aiReflectivePrompt) {
                insightsHtml += `<p class="ai-reflective-prompt"><strong>Reflect:</strong> ${entry.aiReflectivePrompt}</p>`;
                }
            insightsHtml += '<p class="ai-timestamp">' + (entry.aiTimestamp ? `Analyzed: ${formatUserFriendlyTimestamp(entry.aiTimestamp)}` : 'Analyzing...') + '</p>';
            aiInsightsDiv.innerHTML = insightsHtml;
        } else if (entry.timestamp) { // Check if there's at least a timestamp to indicate processing
             aiInsightsDiv.innerHTML = '<p class="ai-processing">Processing AI analysis...</p>';
        } else {
            aiInsightsDiv.innerHTML = '<p class="ai-unavailable">AI analysis not yet available.</p>';
        }

        aiInsightsContainer.appendChild(aiInsightsDiv);
        viewModeDiv.appendChild(aiInsightsContainer); // Append AI insights to view mode

        // Edit mode elements (initially hidden)
        const editModeDiv = document.createElement('div');
        editModeDiv.classList.add('entry-edit-mode');
        editModeDiv.style.display = 'none'; // Initially hidden

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.classList.add('edit-title-input');
        titleInput.value = entry.aiTitle || '';
        editModeDiv.appendChild(titleInput);

        const contentTextarea = document.createElement('textarea');
        contentTextarea.classList.add('edit-content-textarea');
        contentTextarea.value = entry.content || '';
        editModeDiv.appendChild(contentTextarea);

        // Tag editing area
        const editTagsArea = document.createElement('div');
        editTagsArea.classList.add('edit-tags-area');
        editTagsArea.innerHTML = '<p>Edit Tags:</p>';
        // Add input for new tags in edit mode
        const editTagInputContainer = document.createElement('div');
        editTagInputContainer.classList.add('tag-input-container'); // Reuse existing class for styling
        const editTagInput = document.createElement('input');
        editTagInput.type = 'text';
        editTagInput.classList.add('edit-tag-input');
        editTagInput.placeholder = 'Add tags...';
        const addEditTagButton = document.createElement('button');
        addEditTagButton.type = 'button';
        addEditTagButton.classList.add('button', 'is-small');
        addEditTagButton.innerHTML = '<i class="fas fa-check"></i>';
        editTagInputContainer.appendChild(editTagInput);
        editTagInputContainer.appendChild(addEditTagButton);
        editTagsArea.appendChild(editTagInputContainer);

        // Area to display tags currently selected for this entry in edit mode
        const currentEditTagsDiv = document.createElement('div');
        currentEditTagsDiv.classList.add('current-edit-tags');
        editTagsArea.appendChild(currentEditTagsDiv);

        editModeDiv.appendChild(editTagsArea);

        // Controls for both modes
        const controlsDiv = document.createElement('div');
        controlsDiv.classList.add('entry-controls');

        // View mode buttons
        const editButton = document.createElement('button');
        editButton.classList.add('edit-entry-button');
        editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editButton.dataset.id = entry.id;
        // Add listener to enter edit mode - pass necessary context
        editButton.addEventListener('click', () => {
            console.log('Edit button clicked for entry:', entry.id);
            enterEditMode(entryElement, entry);
        });

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-entry-button');
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
        deleteButton.dataset.id = entry.id;
        // Attach listener using the passed handleDeleteEntryCallback
        deleteButton.addEventListener('click', () => handleDeleteEntryCallback(entry.id));

        // Add view mode controls to controlsDiv
        controlsDiv.appendChild(editButton);
        controlsDiv.appendChild(deleteButton);

        console.log('Appended Edit and Delete buttons to controlsDiv for entry:', entry.id);

        // Edit mode buttons (initially hidden)
        const saveButton = document.createElement('button');
        saveButton.classList.add('save-edit-button');
        saveButton.innerHTML = '<i class="fas fa-save"></i> Save';
        saveButton.style.display = 'none'; // Initially hidden
        saveButton.dataset.id = entry.id; // Store entry ID
        // Add event listener for the Save button
        saveButton.addEventListener('click', async () => {
            console.log('Save button clicked for entry:', entry.id);
            console.log('currentUser in save button listener:', currentUser);
            // Pass the necessary arguments to saveEntryChanges, including currentUser and the updated tags
            const updatedContent = contentTextarea.value.trim();
            const updatedTitle = titleInput.value.trim();
            // Get tags from the edit tags area
            const updatedTags = [];
            currentEditTagsDiv.querySelectorAll('.tag').forEach(tagSpan => {
                updatedTags.push(tagSpan.textContent.replace('x', '').trim()); // Extract tag text and remove 'x'
            });

            await saveEntryChanges(entry.id, entryElement, db, currentUser, getLoadedEntriesCallback, displayEntriesCallback, searchInput, updatedContent, updatedTitle, updatedTags);
        });

        const cancelButton = document.createElement('button');
        cancelButton.classList.add('cancel-edit-button');
        cancelButton.innerHTML = '<i class="fas fa-times"></i> Cancel';
        cancelButton.style.display = 'none'; // Initially hidden
        // Add event listener for the Cancel button
        cancelButton.addEventListener('click', () => {
            console.log('Cancel button clicked for entry:', entry.id);
            cancelEditMode(entryElement);
        });

        // Append edit mode controls to controlsDiv (initially hidden)
        controlsDiv.appendChild(saveButton);
        controlsDiv.appendChild(cancelButton);

        console.log('Appended Save and Cancel buttons to controlsDiv for entry:', entry.id);

        // AI Toggle button/icon and label (remains outside mode divs)
        const aiToggleButton = document.createElement('div');
        aiToggleButton.classList.add('ai-toggle-button');
        const aiToggleContent = document.createElement('span');
        aiToggleContent.classList.add('ai-toggle-content');
        aiToggleContent.innerHTML = '<i class="fas fa-chevron-down"></i> <i class="fas fa-star ai-icon-star"></i>';
        aiToggleButton.appendChild(aiToggleContent);
        aiToggleButton.title = 'Toggle AI Analysis Details';
        aiToggleButton.addEventListener('click', () => {
            entryElement.classList.toggle('expanded');
            const icon = aiToggleButton.querySelector('i.fa-chevron-down, i.fa-chevron-up');
            const starIcon = aiToggleButton.querySelector('.ai-icon-star');

             if (entryElement.classList.contains('expanded')) {
                 icon.classList.remove('fa-chevron-down');
                 icon.classList.add('fa-chevron-up');
             } else {
                 icon.classList.remove('fa-chevron-up');
                 icon.classList.add('fa-chevron-down');
              }
          });

        // Create a container for bottom row elements (controls, view-mode tags, ai toggle)
        const bottomRowDiv = document.createElement('div');
        bottomRowDiv.classList.add('entry-bottom-row');

        // Append elements to bottomRowDiv in correct order for view mode
        bottomRowDiv.appendChild(controlsDiv); // Contains Edit/Delete initially
        // The view mode tags are part of viewModeDiv now
        bottomRowDiv.appendChild(aiToggleButton);

        // Append view/edit modes and bottom row to the main entry element
        entryElement.appendChild(viewModeDiv);
        entryElement.appendChild(editModeDiv);
        entryElement.appendChild(bottomRowDiv); // Contains controls and AI toggle

        entriesList.appendChild(entryElement);
    });

    // Note: Calling renderAvailableTags and renderFilterTags will need to be done from the main script or tagging module
}

// Function to format user-friendly timestamp
export function formatUserFriendlyTimestamp(firestoreTimestamp) {
    if (!firestoreTimestamp || !firestoreTimestamp.toDate) {
        return 'Date not available';
    }

    const date = firestoreTimestamp.toDate();
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
    const timeString = date.toLocaleTimeString('en-US', timeOptions);

    const entryDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (entryDateOnly.getTime() === today.getTime()) {
        return `Today, ${timeString}`;
    } else if (entryDateOnly.getTime() === yesterday.getTime()) {
        return `Yesterday, ${timeString}`;
    } else if (entryDateOnly.getTime() > sevenDaysAgo.getTime()) { // Check if the entry date is AFTER sevenDaysAgo (i.e., within the last 7 days)
        const diffTime = Math.abs(today.getTime() - entryDateOnly.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} days ago, ${timeString}`;
    } else {
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = date.toLocaleDateString('en-US', dateOptions);
        return `${dateString}, ${timeString}`;
    }
}

// Function to render tags in the current edit tags area
function renderCurrentEditTags(tags, currentEditTagsDiv) {
    currentEditTagsDiv.innerHTML = '';
    tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag');
        tagSpan.textContent = tag;
        const removeTagSpan = document.createElement('span');
        removeTagSpan.classList.add('remove-tag');
        removeTagSpan.textContent = 'x';
        removeTagSpan.onclick = () => removeTagFromEdit(tag, currentEditTagsDiv); // Add remove functionality
        tagSpan.appendChild(removeTagSpan);
        currentEditTagsDiv.appendChild(tagSpan);
    });
}

// Function to add a tag to the current edit tags list
function addTagToEdit(tag, currentEditTagsDiv, editTagInput) {
    const lowerCaseTag = tag.toLowerCase().trim();
    // Get current tags from the display area
    const currentTags = [];
     currentEditTagsDiv.querySelectorAll('.tag').forEach(tagSpan => {
        currentTags.push(tagSpan.textContent.replace('x', '').trim());
    });

    if (lowerCaseTag && !currentTags.includes(lowerCaseTag)) {
        currentTags.push(lowerCaseTag);
        renderCurrentEditTags(currentTags, currentEditTagsDiv); // Re-render the display area
    }
     editTagInput.value = ''; // Clear input
}

// Function to remove a tag from the current edit tags list
function removeTagFromEdit(tag, currentEditTagsDiv) {
     const currentTags = [];
     currentEditTagsDiv.querySelectorAll('.tag').forEach(tagSpan => {
        currentTags.push(tagSpan.textContent.replace('x', '').trim());
    });

    const updatedTags = currentTags.filter(t => t !== tag);
    renderCurrentEditTags(updatedTags, currentEditTagsDiv); // Re-render the display area
}

// Function to enter edit mode for an entry
export function enterEditMode(entryElement, entry) {
    console.log('Entering edit mode for entry:', entry.id);
    const viewModeDiv = entryElement.querySelector('.entry-view-mode');
    const editModeDiv = entryElement.querySelector('.entry-edit-mode');
    const titleInput = editModeDiv.querySelector('.edit-title-input');
    const contentTextarea = editModeDiv.querySelector('.edit-content-textarea');
    const currentEditTagsDiv = editModeDiv.querySelector('.current-edit-tags');
    const editTagInput = editModeDiv.querySelector('.edit-tag-input');
    const addEditTagButton = editModeDiv.querySelector('.button');
    const saveButton = entryElement.querySelector('.save-edit-button');
    const cancelButton = entryElement.querySelector('.cancel-edit-button');
    const editButton = entryElement.querySelector('.edit-entry-button');
    const deleteButton = entryElement.querySelector('.delete-entry-button');

    // Hide view mode, show edit mode
    viewModeDiv.style.display = 'none';
    editModeDiv.style.display = 'block';

    // Populate edit fields
    titleInput.value = entry.aiTitle || '';
    contentTextarea.value = entry.content || '';

    // *** Add logs to check input elements ***
    console.log('Title Input element:', titleInput);
    console.log('Content Textarea element:', contentTextarea);
    console.log('Title Input display style:', titleInput.style.display);
    console.log('Content Textarea display style:', contentTextarea.style.display);
    // *** End logs ***

    // Render existing tags in the edit area
    renderCurrentEditTags(entry.tags || [], currentEditTagsDiv);

    // Show/hide buttons
    saveButton.style.display = 'inline-block';
    cancelButton.style.display = 'inline-block';
    editButton.style.display = 'none';
    deleteButton.style.display = 'none';

    // Remove any existing listeners to prevent duplicates
    const oldAddListener = addEditTagButton.onclick;
    if (oldAddListener) {
        addEditTagButton.removeEventListener('click', oldAddListener);
    }
     const oldInputListener = editTagInput.onkeypress;
    if (oldInputListener) {
         editTagInput.removeEventListener('keypress', oldInputListener);
    }

    addEditTagButton.onclick = () => {
        addTagToEdit(editTagInput.value, currentEditTagsDiv, editTagInput);
    };

    editTagInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTagToEdit(editTagInput.value, currentEditTagsDiv, editTagInput);
        }
    };

}

// Function to exit edit mode and return to view mode
export function cancelEditMode(entryElement) {
    console.log('Canceling edit mode.');
    const viewModeDiv = entryElement.querySelector('.entry-view-mode');
    const editModeDiv = entryElement.querySelector('.entry-edit-mode');
    const saveButton = entryElement.querySelector('.save-edit-button');
    const cancelButton = entryElement.querySelector('.cancel-edit-button');
    const editButton = entryElement.querySelector('.edit-entry-button');
    const deleteButton = entryElement.querySelector('.delete-entry-button');

    // Hide edit mode, show view mode
    editModeDiv.style.display = 'none';
    viewModeDiv.style.display = 'block';

    // Show/hide buttons
    saveButton.style.display = 'none';
    cancelButton.style.display = 'none';
    editButton.style.display = 'inline-block';
    deleteButton.style.display = 'inline-block';

     // Clear the edit tag input and selected tags display
    const editTagInput = editModeDiv.querySelector('.edit-tag-input');
    const currentEditTagsDiv = editModeDiv.querySelector('.current-edit-tags');
     editTagInput.value = '';
    currentEditTagsDiv.innerHTML = '';
}

// Function to save edited entry changes (including tags)
export async function saveEntryChanges(entryId, entryElement, db, currentUser, getLoadedEntriesCallback, displayEntriesCallback, searchInput, updatedContent, updatedTitle, updatedTags) {
    console.log('Saving changes for entry ID:', entryId);
     if (!currentUser || !currentUser.uid) {
        alert('No user logged in. Cannot save changes.');
        console.error('Attempted to save changes without logged-in user.');
        return;
    }

    const entryRef = doc(db, 'users', currentUser.uid, 'entries', entryId);
    const updatedData = {
        content: updatedContent,
        // Include updatedTitle only if it's not empty or null/undefined
        ...(updatedTitle && { aiTitle: updatedTitle }),
        tags: updatedTags // Include the updated tags
        // Note: We don't update the timestamp here to preserve the original entry time
    };

    try {
        await updateDoc(entryRef, updatedData);
        console.log('Entry updated successfully:', entryId);

        // Find the entry in the loadedEntries array and update its data
        const entryIndex = getLoadedEntriesCallback().findIndex(entry => entry.id === entryId);
        if (entryIndex > -1) {
            getLoadedEntriesCallback()[entryIndex] = { ...getLoadedEntriesCallback()[entryIndex], ...updatedData };
        }

        // Re-render the entries list to reflect the changes and update tags/filters
        // Need to pass all necessary arguments to displayEntriesCallback
        displayEntriesCallback(
            getLoadedEntriesCallback(), // entriesToDisplay (updated list)
            activeFilterTags, // activeFilterTags (from tagging module)
            searchInput, // searchInput element
            (id) => handleDeleteEntry(id, currentUser, document.getElementById('entry-success'), db), // handleDeleteEntryCallback
            handleEditClick, // handleEditClickCallback
            handleSaveClick, // handleSaveClickCallback
            handleCancelClick, // handleCancelClickCallback
            displayEntriesCallback, // postDisplayCallback
            db, // dbInstance
            currentUser, // currentUserObject
            getLoadedEntriesCallback // getLoadedEntriesCallback
        );

        // Exit edit mode
        cancelEditMode(entryElement);

        // Provide user feedback (optional)
        const entrySuccessMessage = document.getElementById('entry-success');
        if (entrySuccessMessage) {
             entrySuccessMessage.textContent = 'Entry updated successfully!';
             setTimeout(() => { entrySuccessMessage.textContent = ''; }, 5000);
        }

    } catch (error) {
        console.error('Error saving entry changes:', error);
        console.error('Firestore error details:', error);
        alert('Error saving changes. Please try again.');
         const entrySuccessMessage = document.getElementById('entry-success');
         if (entrySuccessMessage) {
             entrySuccessMessage.textContent = 'Failed to save changes.';
             setTimeout(() => { entrySuccessMessage.textContent = ''; }, 5000);
         }
    }
} 