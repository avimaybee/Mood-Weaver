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

        // Tag editing area (will implement details later)
        const editTagsArea = document.createElement('div');
        editTagsArea.classList.add('edit-tags-area');
        editTagsArea.innerHTML = '<p>Edit Tags:</p><!-- Tag input and selected tags will go here -->';
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
            // Pass the necessary arguments to saveEntryChanges, including currentUser
            await saveEntryChanges(entry.id, entryElement, db, currentUser, getLoadedEntriesCallback, displayEntriesCallback, searchInput);
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

// Function to enter edit mode
function enterEditMode(entryElement, entry) {
    const displayMode = entryElement.querySelector('.entry-view-mode');
    const editMode = entryElement.querySelector('.entry-edit-mode');
    const editButton = entryElement.querySelector('.edit-entry-button');
    const deleteButton = entryElement.querySelector('.delete-entry-button');
    const saveButton = entryElement.querySelector('.save-edit-button');
    const cancelButton = entryElement.querySelector('.cancel-edit-button');

    console.log('Entering edit mode for entry:', entry.id);
    console.log('Found saveButton:', saveButton);
    console.log('Found cancelButton:', cancelButton);

    // Hide display mode, show edit mode
    if (displayMode) displayMode.style.display = 'none';
    if (editMode) editMode.style.display = 'block';

    // Hide view mode buttons, show edit mode buttons
    if (editButton) editButton.style.display = 'none';
    if (deleteButton) deleteButton.style.display = 'none';
    if (saveButton) saveButton.style.display = 'inline-block'; // Use inline-block as they are buttons
    if (cancelButton) cancelButton.style.display = 'inline-block'; // Use inline-block

    // Populate edit fields
    const editTitleInput = editMode.querySelector('.edit-title-input');
    const editContentTextarea = editMode.querySelector('.edit-content-textarea');
    const editTagsContainer = editMode.querySelector('.edit-tags-area');

    if (editTitleInput) editTitleInput.value = entry.aiTitle || '';
    if (editContentTextarea) editContentTextarea.value = entry.content || '';

    // Handle tags: create input field and populate with current tags
    if (editTagsContainer) {
        editTagsContainer.innerHTML = '<p>Edit Tags:</p>'; // Clear existing content and add label
        const tagsInput = document.createElement('input');
        tagsInput.type = 'text';
        tagsInput.className = 'edit-tags';
        tagsInput.value = entry.tags ? entry.tags.join(', ') : ''; // Join tags with comma
        tagsInput.placeholder = 'Enter tags, separated by commas';
        editTagsContainer.appendChild(tagsInput);
    }
}

// Function to cancel edit mode
function cancelEditMode(entryElement) {
    const displayMode = entryElement.querySelector('.entry-view-mode');
    const editMode = entryElement.querySelector('.entry-edit-mode');
    const editButton = entryElement.querySelector('.edit-entry-button');
    const deleteButton = entryElement.querySelector('.delete-entry-button');
    const saveButton = entryElement.querySelector('.save-edit-button');
    const cancelButton = entryElement.querySelector('.cancel-edit-button');

    // Hide edit mode, show display mode
    if (editMode) editMode.style.display = 'none';
    if (displayMode) displayMode.style.display = 'block';

    // Hide edit mode buttons, show view mode buttons
    if (saveButton) saveButton.style.display = 'none';
    if (cancelButton) cancelButton.style.display = 'none';
    if (editButton) editButton.style.display = 'inline-block'; // Use inline-block
    if (deleteButton) deleteButton.style.display = 'inline-block'; // Use inline-block
}

// Function to save entry changes
// Updated to use the currentUser parameter
async function saveEntryChanges(entryId, entryElement, db, currentUser, getLoadedEntriesCallback, displayEntriesCallback, searchInput) {
    console.log('Saving changes for entry:', entryId);
    const editModeDiv = entryElement.querySelector('.entry-edit-mode');
    const titleInput = editModeDiv.querySelector('.edit-title-input');
    const contentTextarea = editModeDiv.querySelector('.edit-content-textarea');
    // Need to get tags from the edit tags area
    const updatedTags = [];
    editModeDiv.querySelectorAll('.current-edit-tags .tag').forEach(tagSpan => {
        // Extract tag text, excluding the remove button 'x'
        const tagText = tagSpan.textContent.slice(0, -1).trim(); // Assumes 'x' is always the last character
        if (tagText) {
            updatedTags.push(tagText);
        }
    });

    const updatedData = {
        aiTitle: titleInput.value.trim(),
        content: contentTextarea.value.trim(),
        tags: updatedTags,
        // Note: timestamp and aiTimestamp are not updated on edit based on current schema
    };

    // Use the currentUser parameter directly
    if (!currentUser || !currentUser.uid) {
        console.error('Cannot save changes: No user logged in or user UID is undefined.');
        alert('Please log in to save changes.');
        return;
    }

    try {
        const entryRef = doc(db, 'users', currentUser.uid, 'entries', entryId); // Use currentUser.uid
        console.log('Attempting to update document with ID:', entryId);
        console.log('Data being sent for update:', updatedData);
        await updateDoc(entryRef, updatedData);
        console.log('Entry updated successfully:', entryId);

        // After saving, we need to re-render the specific entry or the entire list to reflect changes.
        // Re-fetching the entire list is simpler for now and ensures consistency.
        // A more optimized approach would be to update the single entry in the DOM.

        // Trigger a re-render of the entries list. This will fetch the latest data including the update.
        if (getLoadedEntriesCallback && displayEntriesCallback) {
             // Call getLoadedEntriesCallback to get the latest data before re-displaying
             const currentLoadedEntries = getLoadedEntriesCallback();
             // Pass all necessary arguments to displayEntriesCallback
             displayEntriesCallback(currentLoadedEntries, activeFilterTags, searchInput, (entryId) => handleDeleteEntry(entryId, currentUser, null, db), handleEditClick, handleSaveClick, handleCancelClick, postDisplayCallback, db, currentUser, getLoadedEntriesCallback);
        } else {
             // Fallback: Just cancel edit mode if re-render callbacks aren't available
             cancelEditMode(entryElement);
        }

    } catch (error) {
        console.error('Error updating entry:', error); // Log the specific error object
        alert('Error saving changes. Please try again.');
    }
} 