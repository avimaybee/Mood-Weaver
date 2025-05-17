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

        // --- Edit mode elements (Refactored) ---
        // Create a dedicated container for edit mode
        const editModeDiv = document.createElement('div');
        editModeDiv.classList.add('entry-edit-mode');
        editModeDiv.style.display = 'none'; // Initially hidden
        editModeDiv.dataset.id = entry.id; // Store entry ID on edit mode container

        // Edit Title Input
        const editTitleInput = document.createElement('input');
        editTitleInput.type = 'text';
        editTitleInput.classList.add('edit-title-input');
        editTitleInput.placeholder = 'Edit Title (Optional)';
        editModeDiv.appendChild(editTitleInput);

        // Edit Content Textarea
        const editContentTextarea = document.createElement('textarea');
        editContentTextarea.classList.add('edit-content-textarea');
        editContentTextarea.placeholder = 'Edit your entry...';
        editModeDiv.appendChild(editContentTextarea);

        // Edit Tags Area Container
        const editTagsArea = document.createElement('div');
        editTagsArea.classList.add('edit-tags-area');
        editTagsArea.innerHTML = '<p>Edit Tags:</p>';
        editModeDiv.appendChild(editTagsArea);

        // Input and Add Button for Tags
        const editTagInputContainer = document.createElement('div');
        editTagInputContainer.classList.add('tag-input-container'); // Reuse tag input container style
        const editTagInput = document.createElement('input');
        editTagInput.type = 'text';
        editTagInput.classList.add('edit-tag-input');
        editTagInput.placeholder = 'Add tags...';
        const addEditTagButton = document.createElement('button');
        addEditTagButton.type = 'button';
        addEditTagButton.classList.add('button', 'is-small', 'add-edit-tag-button'); // Keep add-edit-tag-button class for specific styling if needed
        addEditTagButton.innerHTML = '<i class="fas fa-check"></i>';
        editTagInputContainer.appendChild(editTagInput);
        editTagInputContainer.appendChild(addEditTagButton);
        editTagsArea.appendChild(editTagInputContainer);

        // Area to display tags currently selected for this entry in edit mode
        const currentEditTagsDiv = document.createElement('div');
        currentEditTagsDiv.classList.add('current-edit-tags');
        editTagsArea.appendChild(currentEditTagsDiv);

        // --- Controls for both modes ---
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
            const updatedContent = editContentTextarea.value.trim();
            const updatedTitle = editTitleInput.value.trim();
            // Get tags from the edit tags area
            const updatedTags = [];
            currentEditTagsDiv.querySelectorAll('.tag').forEach(tagSpan => {
                updatedTags.push(tagSpan.textContent.replace('x', '').trim()); // Extract tag text and remove 'x'
            });

            await saveEntryChanges(entry.id, entryElement, db, currentUser, getLoadedEntriesCallback, displayEntriesCallback, searchInput, updatedContent, updatedTitle, updatedTags, activeFilterTags);
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
        // Append the new edit mode container
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
    console.log('Rendering current edit tags:', tags);
    if (!currentEditTagsDiv) return;
    currentEditTagsDiv.innerHTML = '';
    const tagsArray = Array.isArray(tags) ? tags : []; // Ensure tags is an array
    tagsArray.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag');
        tagSpan.textContent = tag;
        const removeTagSpan = document.createElement('span');
        removeTagSpan.classList.add('remove-tag');
        removeTagSpan.textContent = 'x';
        // Use a data attribute to store the tag value for removal
        removeTagSpan.dataset.tag = tag;
        removeTagSpan.onclick = (event) => { // Pass event object
             const tagToRemove = event.target.dataset.tag;
             console.log('Attempting to remove tag:', tagToRemove);
             removeTagFromEdit(tagToRemove, currentEditTagsDiv); // Pass the tag value and the container
        };
        tagSpan.appendChild(removeTagSpan);
        currentEditTagsDiv.appendChild(tagSpan);
    });
    console.log('Finished rendering current edit tags.');
}

// Function to add a tag to the current edit tags list
function addTagToEdit(tag, currentEditTagsDiv, editTagInput) {
    console.log('Attempting to add tag in edit mode:', tag);
    if (!currentEditTagsDiv || !editTagInput) return;
    const lowerCaseTag = tag.toLowerCase().trim();

    if (lowerCaseTag === '') {
        editTagInput.value = '';
        return; // Don't add empty tags
    }

    // Get current tags from the display area to check for duplicates
    const currentTags = [];
     currentEditTagsDiv.querySelectorAll('.tag').forEach(tagSpan => {
        // Extract tag text and remove the 'x' for removal
        const tagText = tagSpan.textContent.replace(/x$/, '').trim();
        if (tagText) {
             currentTags.push(tagText);
        }
    });

    if (!currentTags.includes(lowerCaseTag)) {
        console.log('Adding new tag:', lowerCaseTag);
        // Add the new tag to the currentTags array and re-render
        currentTags.push(lowerCaseTag);
        renderCurrentEditTags(currentTags, currentEditTagsDiv); // Re-render the display area with the updated list
    } else {
        console.log('Tag already exists:', lowerCaseTag);
    }
     editTagInput.value = ''; // Clear input
     console.log('Current tags in edit mode:', currentTags);
}

// Function to remove a tag from the current edit tags list
function removeTagFromEdit(tagToRemove, currentEditTagsDiv) {
     console.log('Attempting to remove tag from edit mode:', tagToRemove);
     if (!currentEditTagsDiv || !tagToRemove) return;

     const currentTags = [];
     currentEditTagsDiv.querySelectorAll('.tag').forEach(tagSpan => {
        // Extract tag text and remove the 'x'
        const tagText = tagSpan.textContent.replace(/x$/, '').trim();
        if (tagText) {
             currentTags.push(tagText);
        }
    });

    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    console.log('Updated tags after removal:', updatedTags);
    renderCurrentEditTags(updatedTags, currentEditTagsDiv); // Re-render the display area
     console.log('Tag removed from edit mode.');
}

// Function to enter edit mode for an entry - Rewriting this function
export function enterEditMode(entryElement, entry) {
    console.log('Entering edit mode for entry ID:', entry.id);
    const viewModeDiv = entryElement.querySelector('.entry-view-mode');
    const editModeDiv = entryElement.querySelector('.entry-edit-mode');

    // Ensure editModeDiv exists
    if (!editModeDiv) {
        console.error('Edit mode div not found for entry:', entry.id);
        return;
    }

    const editTitleInput = editModeDiv.querySelector('.edit-title-input');
    const editContentTextarea = editModeDiv.querySelector('.edit-content-textarea');
    const currentEditTagsDiv = editModeDiv.querySelector('.current-edit-tags');
    const editTagInput = editModeDiv.querySelector('.edit-tag-input');
    const addEditTagButton = editModeDiv.querySelector('.add-edit-tag-button'); // Use the specific class
    const saveButton = entryElement.querySelector('.save-edit-button');
    const cancelButton = entryElement.querySelector('.cancel-edit-button');
    const editButton = entryElement.querySelector('.edit-entry-button');
    const deleteButton = entryElement.querySelector('.delete-entry-button');

    // --- Populate fields ---
    editTitleInput.value = entry.aiTitle || '';
    editContentTextarea.value = entry.content || '';

    // --- Handle Tags in Edit Mode ---
    // Clear previous tags and render existing tags for this entry
    renderCurrentEditTags(entry.tags || [], currentEditTagsDiv); // Assuming renderCurrentEditTags is still useful

    // --- Add event listeners for adding tags in edit mode ---
    // Remove any existing listeners to prevent duplicates if enterEditMode can be called multiple times without full re-render
    // Using a simple approach here, a more robust solution might use event delegation or better listener management
    const newAddTagListener = () => {
        addTagToEdit(editTagInput.value, currentEditTagsDiv, editTagInput); // Assuming addTagToEdit exists and is updated
    };
    // Remove existing listeners before adding new ones
    // This is a basic removal; for more complex scenarios, store references to listeners
    if (addEditTagButton.onclick) addEditTagButton.removeEventListener('click', addEditTagButton.onclick);
    if (editTagInput.onkeypress) editTagInput.removeEventListener('keypress', editTagInput.onkeypress);

    addEditTagButton.onclick = newAddTagListener;

    editTagInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            newAddTagListener(); // Call the same logic as button click
        }
    };

    // --- Show/Hide Elements and Buttons ---
    viewModeDiv.style.display = 'none';
    editModeDiv.style.display = 'block';

    if (saveButton) saveButton.style.display = 'inline-block';
    if (cancelButton) cancelButton.style.display = 'inline-block';
    if (editButton) editButton.style.display = 'none';
    if (deleteButton) deleteButton.style.display = 'none';

    // Focus on the first input field
    editTitleInput.focus();
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
    if (editModeDiv) editModeDiv.style.display = 'none';
    if (viewModeDiv) viewModeDiv.style.display = 'block';

    // Show/hide buttons
    if (saveButton) saveButton.style.display = 'none';
    if (cancelButton) cancelButton.style.display = 'none';
    if (editButton) editButton.style.display = 'inline-block';
    if (deleteButton) deleteButton.style.display = 'inline-block';

     // Clear the edit tag input and selected tags display
    const editTagInput = editModeDiv ? editModeDiv.querySelector('.edit-tag-input') : null;
    const currentEditTagsDiv = editModeDiv ? editModeDiv.querySelector('.current-edit-tags') : null;
     if (editTagInput) editTagInput.value = '';
    if (currentEditTagsDiv) currentEditTagsDiv.innerHTML = '';
}

// Function to save edited entry changes (including tags) - Rewriting this function
export async function saveEntryChanges(entryId, entryElement, db, currentUser, getLoadedEntriesCallback, displayEntriesCallback, searchInput, activeFilterTags) {
    console.log('Attempting to save changes for entry ID:', entryId);
     if (!currentUser || !currentUser.uid) { // Added check for currentUser.uid
        alert('No user logged in. Cannot save changes.');
        console.error('Attempted to save changes without logged-in user.');
        return;
    }

    const editModeDiv = entryElement.querySelector('.entry-edit-mode');
    if (!editModeDiv) {
        console.error('Edit mode div not found for entry:', entryId);
        alert('Error: Could not find edit fields.');
        return;
    }

    // Get updated content, title, and tags from the edit mode fields
    const editTitleInput = editModeDiv.querySelector('.edit-title-input');
    const editContentTextarea = editModeDiv.querySelector('.edit-content-textarea');
    const currentEditTagsDiv = editModeDiv.querySelector('.current-edit-tags');

    const updatedContent = editContentTextarea ? editContentTextarea.value.trim() : '';
    const updatedTitle = editTitleInput ? editTitleInput.value.trim() : '';
    const updatedTags = [];
    if (currentEditTagsDiv) {
        currentEditTagsDiv.querySelectorAll('.tag').forEach(tagSpan => {
            // Extract tag text and remove the 'x' for removal
            const tagText = tagSpan.textContent.replace(/x$/, '').trim(); // Use regex to remove 'x' at the end
            if (tagText) {
                 updatedTags.push(tagText);
            }
        });
    }

    // Prepare the data to update
    const updatedData = {
        content: updatedContent,
        // Include updatedTitle only if it's not empty
        ...(updatedTitle && { aiTitle: updatedTitle }),
        // Include tags field, even if empty, to overwrite existing tags
        tags: updatedTags
        // Note: We don't update the timestamp here to preserve the original entry time
    };

    console.log('Prepared data for update:', updatedData);

    const entryRef = doc(db, 'users', currentUser.uid, 'entries', entryId);

    try {
        console.log('Attempting Firestore update for entry ID:', entryId);
        await updateDoc(entryRef, updatedData);
        console.log('Entry updated successfully in Firestore:', entryId);

        // Update the local loadedEntries array
        const loadedEntries = getLoadedEntriesCallback();
        const entryIndex = loadedEntries.findIndex(entry => entry.id === entryId);
        if (entryIndex > -1) {
            // Create a new object with updated data to ensure reactivity if needed
            loadedEntries[entryIndex] = { ...loadedEntries[entryIndex], ...updatedData };
            console.log('Local loadedEntries array updated for entry ID:', entryId);
        }

        // Re-render the entries list to reflect the changes and update tags/filters
        console.log('Calling displayEntriesCallback after successful save.');
        // *** Start Debug Logs for Post-Save ***
        console.log('Arguments being passed to displayEntriesCallback:', {
            loadedEntries: loadedEntries,
            activeFilterTags: activeFilterTags, // Should be defined now
            searchInput: searchInput,
            handleDeleteEntryCallback: (id) => handleDeleteEntry(id, currentUser, document.getElementById('entry-success'), db),
            handleEditClick: handleEditClick,
            handleSaveClick: handleSaveClick,
            handleCancelClick: handleCancelClick,
            displayEntriesCallback: displayEntriesCallback, // postDisplayCallback
            db: db,
            currentUser: currentUser,
            getLoadedEntriesCallback: getLoadedEntriesCallback
        });
        // *** End Debug Logs ***
        displayEntriesCallback(
            loadedEntries, // 1st arg: entriesToDisplay (updated list)
            activeFilterTags, // 2nd arg: activeFilterTags (now passed as a parameter)
            searchInput, // 3rd arg: searchInput element
            // Pass all required arguments to displayEntriesCallback (postDisplayCallback)
            (id) => handleDeleteEntry(id, currentUser, document.getElementById('entry-success'), db), // 4th arg: handleDeleteEntryCallback
            handleEditClick, // 5th arg: handleEditClickCallback
            handleSaveClick, // 6th arg: handleSaveClickCallback
            handleCancelClick, // 7th arg: handleCancelClickCallback
            displayEntriesCallback, // 8th arg: postDisplayCallback (this function itself)
            db, // 9th arg: dbInstance
            currentUser, // 10th arg: currentUserObject
            getLoadedEntriesCallback // 11th arg: getLoadedEntriesCallback
        );

        // Exit edit mode
        console.log('Calling cancelEditMode after successful save and display update.'); // Debug log
        cancelEditMode(entryElement);
        console.log('cancelEditMode completed.'); // Debug log

        // Provide user feedback
        const entrySuccessMessage = document.getElementById('entry-success');
        if (entrySuccessMessage) {
             entrySuccessMessage.textContent = 'Entry updated successfully!';
             setTimeout(() => { entrySuccessMessage.textContent = ''; }, 5000);
        }

    } catch (error) {
        console.error('Error saving entry changes:', error);
        console.error('Firestore update error details:', error);
        alert('Error saving changes. Please try again.');
         const entrySuccessMessage = document.getElementById('entry-success');
         if (entrySuccessMessage) {
             entrySuccessMessage.textContent = 'Failed to save changes.';
             setTimeout(() => { entrySuccessMessage.textContent = ''; }, 5000);
         }
    }
} 